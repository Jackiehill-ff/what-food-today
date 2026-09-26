// 食谱库云同步云函数。
// 客户端上传本地食谱元数据/变更/删除，服务端按 recipeId 一条一档做双向合并（规则见 merge.js），
// 返回客户端需要新增/覆盖/删除的食谱与合并后的版本快照。
// 集合 recipes 由本函数自动创建（等价于 login 的 users 兜底），无需手动建。
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const { mergeRecipes } = require("./merge");

const MAX_DOCS = 2000;
const PAGE_LIMIT = 1000; // 云函数端单次 get 上限 1000（默认 100）

const ensureCollection = async () => {
  try {
    await db.createCollection("recipes");
  } catch (error) {
    // 已存在则忽略；其他错误交给上层处理
  }
};

const loadAllDocs = async (openid) => {
  const all = [];
  while (all.length < MAX_DOCS) {
    const res = await db
      .collection("recipes")
      .where({ openid })
      .skip(all.length)
      .limit(PAGE_LIMIT)
      .get();
    all.push(...(res.data || []));
    if (!res.data || res.data.length < PAGE_LIMIT) {
      break;
    }
  }
  return all;
};

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return { ok: false, message: "缺少用户标识" };
  }

  try {
    await ensureCollection();
    const serverDocs = await loadAllDocs(OPENID);

    const result = mergeRecipes({
      serverDocs,
      clientLive: Array.isArray(event.live) ? event.live : [],
      clientChanged: Array.isArray(event.changed) ? event.changed : [],
      clientDeletes: Array.isArray(event.deletes) ? event.deletes : [],
      now: new Date().toISOString(),
    });

    for (const doc of result.writes) {
      await db.collection("recipes").doc(doc.recipeId).set({
        data: {
          openid: OPENID,
          recipeId: doc.recipeId,
          deleted: doc.deleted,
          deletedAt: doc.deletedAt || "",
          updatedAt: doc.updatedAt,
          recipe: doc.recipe,
        },
      });
    }

    if (result.imageDeletes.length) {
      // 清理被替换的成品图云文件；失败不影响同步结果
      try {
        await cloud.deleteFile({ fileList: result.imageDeletes });
      } catch (error) {
        console.error("清理旧成品图失败", error);
      }
    }

    return {
      ok: true,
      upserts: result.upserts,
      removes: result.removes,
      versions: result.versions,
      tombstones: result.tombstones,
      pushed: result.writes.length,
    };
  } catch (error) {
    console.error("recipeSync failed", error);
    return {
      ok: false,
      message: (error && (error.errMsg || error.message)) || "食谱同步失败",
    };
  }
};
