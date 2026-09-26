// 食谱云同步的纯客户端逻辑（不引用 wx，可拷贝到 /tmp 用 Node 单测）。
// 快照结构：{ openid, lastSyncAt, recipes: { id: updatedAt }, tombstones: { id: deletedAt } }
// —— recipes 记录上次同步时云端在库版本，用于识别“本地新增/修改/删除”；tombstones 只用于识别“本地已删”，不参与推送。

const parseTime = (value) => {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
};

// 时间戳比较（兼容不同格式/时区的 ISO 字符串）
const cmpTime = (a, b) => {
  const ta = parseTime(a);
  const tb = parseTime(b);
  if (ta === tb) {
    return 0;
  }
  return ta < tb ? -1 : 1;
};

const plainStringMap = (value) => {
  const out = {};
  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      if (typeof value[key] === "string") {
        out[key] = value[key];
      }
    });
  }
  return out;
};

// 换账号登录时快照作废（不同 openid 的云端数据互不相干），重新做首推/首拉
const snapshotForUser = (snapshot, openid) => {
  if (!snapshot || snapshot.openid !== openid) {
    return { openid, lastSyncAt: "", recipes: {}, tombstones: {} };
  }
  return {
    openid,
    lastSyncAt: typeof snapshot.lastSyncAt === "string" ? snapshot.lastSyncAt : "",
    recipes: plainStringMap(snapshot.recipes),
    tombstones: plainStringMap(snapshot.tombstones),
  };
};

const tombstoneMap = (tombstones) => {
  const out = {};
  (tombstones || []).forEach((entry) => {
    if (entry && entry.id) {
      out[entry.id] = entry.deletedAt || "";
    }
  });
  return out;
};

// 墓碑只保留最近一年、最多 500 条，防快照无限膨胀（超旧设备的延迟删除可能因此复活，可接受）
const pruneTombstones = (tombstones, now, maxAgeDays, cap) => {
  const maxAge = typeof maxAgeDays === "number" ? maxAgeDays : 365;
  const limit = typeof cap === "number" ? cap : 500;
  const cutoff = parseTime(now) - maxAge * 86400000;
  const source = tombstones || {};
  const entries = Object.keys(source)
    .map((id) => ({ id, at: parseTime(source[id]) }))
    .filter((entry) => entry.at >= cutoff)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
  const out = {};
  entries.forEach((entry) => {
    out[entry.id] = source[entry.id];
  });
  return out;
};

const buildSnapshot = ({ openid, lastSyncAt, versions, tombstones }) => {
  const recipes = {};
  (versions || []).forEach((entry) => {
    if (entry && entry.id) {
      recipes[entry.id] = entry.updatedAt || "";
    }
  });
  return {
    openid,
    lastSyncAt: lastSyncAt || "",
    recipes,
    tombstones: tombstones || {},
  };
};

// 本地删除 = 上次快照在库、现在不在库（含「数据 → 导入」整表替换造成的消失）
const computeLocalDeletes = (recipes, snapshotRecipes) => {
  if (!snapshotRecipes) {
    return [];
  }
  const live = {};
  (recipes || []).forEach((recipe) => {
    if (recipe && recipe.id) {
      live[recipe.id] = true;
    }
  });
  return Object.keys(snapshotRecipes)
    .filter((id) => !live[id])
    .map((id) => ({ id }));
};

// 把云端同步结果应用到本地食谱（按 id 合并；请求期间本地又编辑过的条目不动，下一轮再裁决）
const applySyncResponse = ({ recipes, mealPlan, upserts, removes, requestStartedAt }) => {
  const byId = {};
  const next = [];
  (recipes || []).forEach((recipe) => {
    if (recipe && recipe.id && byId[recipe.id] === undefined) {
      byId[recipe.id] = recipe;
      next.push(recipe);
    }
  });

  const startedAt = parseTime(requestStartedAt);
  let added = 0;
  let updated = 0;

  (upserts || []).forEach((recipe) => {
    if (!recipe || !recipe.id) {
      return;
    }
    const local = byId[recipe.id];
    if (!local) {
      byId[recipe.id] = recipe;
      next.push(recipe);
      added += 1;
      return;
    }
    if (parseTime(local.updatedAt) > startedAt) {
      return; // 请求期间本地又编辑过 → 保留本地，下一轮按时间戳重新裁决
    }
    if (cmpTime(recipe.updatedAt, local.updatedAt) > 0) {
      const index = next.indexOf(local);
      if (index >= 0) {
        next[index] = recipe;
      }
      byId[recipe.id] = recipe;
      updated += 1;
    }
  });

  const removedIds = [];
  const removedImages = [];
  (removes || []).forEach((entry) => {
    if (!entry || !entry.id) {
      return;
    }
    const local = byId[entry.id];
    if (!local) {
      return;
    }
    if (parseTime(local.updatedAt) > startedAt) {
      return; // 请求期间本地又编辑过 → 不删，下一轮重新裁决
    }
    if (cmpTime(entry.deletedAt, local.updatedAt) < 0) {
      return; // 本地版本晚于删除（删除后又编辑）→ 保留，下一轮推送复活
    }
    const index = next.indexOf(local);
    if (index >= 0) {
      next.splice(index, 1);
    }
    delete byId[entry.id];
    removedIds.push(entry.id);
    if (local.image) {
      removedImages.push(local.image);
    }
  });

  const mealPlanNext = removedIds.length
    ? (mealPlan || []).filter((entry) => removedIds.indexOf(entry.recipeId) === -1)
    : mealPlan || [];

  return {
    recipes: next,
    mealPlan: mealPlanNext,
    added,
    updated,
    removedIds,
    removedImages,
    changed: added + updated + removedIds.length > 0,
  };
};

module.exports = {
  cmpTime,
  snapshotForUser,
  tombstoneMap,
  pruneTombstones,
  buildSnapshot,
  computeLocalDeletes,
  applySyncResponse,
};
