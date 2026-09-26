// recipeSync 云函数的纯合并逻辑（不依赖 wx-server-sdk，可拷贝到 Node 直接单测）。
//
// 同步协议（客户端 ↔ 云端，按 recipeId 一条一档，last-write-wins 按时间戳裁决）：
// - 客户端上传：live（全部在库食谱的 {id, updatedAt} 元数据）、changed（需要推送的完整食谱）、
//   deletes（本地删除的 {id, deletedAt}，deletedAt 由客户端在发起同步时生成）。
// - 云端返回：upserts（客户端需要新增/覆盖的完整食谱）、removes（客户端需要删除的 {id, deletedAt}）、
//   versions（合并后全部在库版本）、tombstones（合并后全部墓碑）、writes（需写回云端的文档）、
//   imageDeletes（被替换成品图的云存储 fileID，由云函数顺手清理）。
//
// 裁决规则：
// - 同一食谱编辑冲突：updatedAt 新者胜；时间戳相同但客户端图片升级为 cloud:// fileID 时接受客户端。
// - 删除 vs 编辑：删除后另一端有更新的编辑并同步过 → 编辑胜出并回传恢复；否则删除胜出落墓碑。
// - 删除后本地又编辑（updatedAt 晚于墓碑）→ 复活为新版本。
// - 客户端图片上传失败的食谱不进 changed（元数据仍在 live 里），云端不会误判为“另一端新建”回传覆盖。

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_RECIPES_PER_USER = 2000;

const parseTime = (value) => {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

// 时间戳比较（兼容不同格式/时区的 ISO 字符串，Date.parse 后数值比较）
const cmpTime = (a, b) => {
  const ta = parseTime(a);
  const tb = parseTime(b);
  if (ta === tb) {
    return 0;
  }
  return ta < tb ? -1 : 1;
};

const capString = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");

const capTime = (value, fallback) => {
  const capped = capString(value, 40);
  return parseTime(capped) ? capped : fallback;
};

const isCloudImage = (value) => typeof value === "string" && value.indexOf("cloud://") === 0;

const sanitizeIngredient = (item = {}) => ({
  id: capString(item.id, 64),
  name: capString(item.name, 100),
  amount: capString(item.amount, 50),
  unit: capString(item.unit, 20),
  category: item.category === "调味料" ? "调味料" : "食材",
});

const sanitizeRecipe = (recipe, now) => {
  if (!recipe || typeof recipe !== "object") {
    return null;
  }
  const id = capString(recipe.id, 64);
  if (!ID_PATTERN.test(id)) {
    return null;
  }
  return {
    id,
    title: capString(recipe.title, 200),
    type: recipe.type === "simple" ? "simple" : "full",
    category: capString(recipe.category, 32),
    ingredients: (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
      .slice(0, 200)
      .map(sanitizeIngredient),
    method: capString(recipe.method, 20000),
    rawText: capString(recipe.rawText, 20000),
    image: capString(recipe.image, 512),
    createdAt: capTime(recipe.createdAt, now),
    updatedAt: capTime(recipe.updatedAt, now),
  };
};

const mergeRecipes = ({ serverDocs, clientLive, clientChanged, clientDeletes, now }) => {
  const docs = {};
  (serverDocs || []).forEach((doc) => {
    if (!doc || !ID_PATTERN.test(doc.recipeId)) {
      return;
    }
    docs[doc.recipeId] = {
      recipeId: doc.recipeId,
      deleted: Boolean(doc.deleted),
      deletedAt: capString(doc.deletedAt, 40),
      updatedAt: capString(doc.updatedAt, 40),
      recipe: doc.recipe || null,
    };
  });

  const dirty = {};
  const upserts = [];
  const upsertIds = {};
  const removes = [];
  const imageDeletes = [];

  const liveMap = {};
  (clientLive || []).forEach((entry) => {
    if (entry && ID_PATTERN.test(entry.id)) {
      liveMap[entry.id] = capString(entry.updatedAt, 40);
    }
  });

  const deleteMap = {};
  (clientDeletes || []).forEach((entry) => {
    if (!entry || !ID_PATTERN.test(entry.id)) {
      return;
    }
    let deletedAt = capTime(entry.deletedAt, now);
    // 客户端时钟超前时钳制为云端时间，避免墓碑时间戳“永远最新”
    if (cmpTime(deletedAt, now) > 0) {
      deletedAt = now;
    }
    deleteMap[entry.id] = deletedAt;
  });

  const changedMap = {};
  (clientChanged || [])
    .slice(0, MAX_RECIPES_PER_USER)
    .forEach((recipe) => {
      const clean = sanitizeRecipe(recipe, now);
      if (clean) {
        changedMap[clean.id] = clean;
      }
    });

  const pushUpsert = (recipe) => {
    if (!recipe || upsertIds[recipe.id]) {
      return;
    }
    upsertIds[recipe.id] = true;
    upserts.push(recipe);
  };

  // A. 客户端删除 → 落墓碑；若云端有更新的版本（另一端在删除后编辑并同步过）→ 编辑胜出回传恢复
  Object.keys(deleteMap).forEach((id) => {
    const deletedAt = deleteMap[id];
    const doc = docs[id];
    if (!doc) {
      docs[id] = { recipeId: id, deleted: true, deletedAt, updatedAt: deletedAt, recipe: null };
      dirty[id] = true;
      return;
    }
    if (doc.deleted) {
      if (cmpTime(deletedAt, doc.deletedAt) > 0) {
        doc.deletedAt = deletedAt;
        doc.updatedAt = deletedAt;
        dirty[id] = true;
      }
      return;
    }
    if (cmpTime(doc.updatedAt, deletedAt) > 0) {
      pushUpsert(doc.recipe);
      return;
    }
    doc.deleted = true;
    doc.deletedAt = deletedAt;
    doc.updatedAt = deletedAt;
    dirty[id] = true;
  });

  // B. 客户端新增 / 修改
  Object.keys(changedMap).forEach((id) => {
    const recipe = changedMap[id];
    const doc = docs[id];
    if (doc && doc.deleted) {
      if (cmpTime(recipe.updatedAt, doc.deletedAt) > 0) {
        // 删除后本地又编辑 → 复活为新版本
        doc.deleted = false;
        doc.deletedAt = "";
        doc.recipe = recipe;
        doc.updatedAt = recipe.updatedAt;
        dirty[id] = true;
      } else {
        removes.push({ id, deletedAt: doc.deletedAt });
      }
      return;
    }
    if (!doc) {
      docs[id] = { recipeId: id, deleted: false, deletedAt: "", updatedAt: recipe.updatedAt, recipe };
      dirty[id] = true;
      return;
    }
    const newer = cmpTime(recipe.updatedAt, doc.updatedAt);
    // 时间戳相同但客户端图片刚升级为 cloud fileID（首次上传成功）→ 接受客户端版本
    const imageUpgraded =
      newer === 0 && isCloudImage(recipe.image) && doc.recipe && doc.recipe.image !== recipe.image;
    if (newer > 0 || imageUpgraded) {
      if (doc.recipe && isCloudImage(doc.recipe.image) && doc.recipe.image !== recipe.image) {
        imageDeletes.push(doc.recipe.image);
      }
      doc.recipe = recipe;
      doc.updatedAt = recipe.updatedAt;
      dirty[id] = true;
    }
  });

  // C. 云端 → 客户端：回传更新版本与另一端新建的食谱；墓碑通知客户端删除本地副本
  Object.keys(docs).forEach((id) => {
    const doc = docs[id];
    if (doc.deleted) {
      if (liveMap[id] !== undefined) {
        removes.push({ id, deletedAt: doc.deletedAt });
      }
      return;
    }
    if (liveMap[id] === undefined) {
      if (deleteMap[id] !== undefined) {
        return; // 客户端本地已删（A 已处理），不再回传
      }
      pushUpsert(doc.recipe);
      return;
    }
    if (cmpTime(doc.updatedAt, liveMap[id]) > 0) {
      pushUpsert(doc.recipe);
    }
  });

  // removes 去重（A/B/C 可能对同一 id 各推一次），保留更新的 deletedAt
  const removesMap = {};
  removes.forEach((entry) => {
    if (!removesMap[entry.id] || cmpTime(entry.deletedAt, removesMap[entry.id]) > 0) {
      removesMap[entry.id] = entry.deletedAt;
    }
  });

  const writes = [];
  const versions = [];
  const tombstones = [];
  Object.keys(docs).forEach((id) => {
    const doc = docs[id];
    if (doc.deleted) {
      tombstones.push({ id, deletedAt: doc.deletedAt });
    } else {
      versions.push({ id, updatedAt: doc.updatedAt });
    }
    if (dirty[id]) {
      writes.push(doc);
    }
  });

  return {
    writes,
    upserts,
    removes: Object.keys(removesMap).map((id) => ({ id, deletedAt: removesMap[id] })),
    versions,
    tombstones,
    imageDeletes,
  };
};

module.exports = { mergeRecipes, sanitizeRecipe, cmpTime };
