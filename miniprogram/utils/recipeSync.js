// 食谱库云同步（本地优先 + 双向合并，协议见 cloudfunctions/recipeSync/merge.js）。
//
// 触发点：
// - 登录成功后立即同步（pages/me）
// - 启动时已登录则静默拉取（app.onLaunch）
// - 任意数据保存后防抖推送（app.saveState，内部自动跳过未登录/云不可用/食谱无变化）
// - 「我的 → 账号 → 立即同步」手动触发
//
// 成品图：本地文件路径（或 data URL）上传云存储后改存 cloud:// fileID（image 组件可直接渲染），
// 云端路径固定 recipes/<openid>/<食谱id>.<扩展名>，重复上传同名覆盖不累积文件。

const { RECIPE_SYNC_STORAGE_KEY } = require("./domain/constants");
const { createTimestamp } = require("./domain/ids");
const { migrateRecipe } = require("./domain/recipes");
const { isDataUrl, persistImageToFile, deleteImageFile } = require("./images");
const {
  snapshotForUser,
  tombstoneMap,
  pruneTombstones,
  buildSnapshot,
  computeLocalDeletes,
  applySyncResponse,
} = require("./domain/recipeSyncCore");

const SYNC_DEBOUNCE_MS = 2500;
const CHANGED_BATCH_SIZE = 50; // 云函数单次请求有体积上限，大批量导入时分批推送

const isCloudImage = (value) => typeof value === "string" && value.indexOf("cloud://") === 0;

let syncTimer = null;
let running = false;

const canSync = () => {
  const app = getApp();
  return Boolean(
    app && app.globalData && app.globalData.isCloudEnabled && app.globalData.user && typeof wx !== "undefined" && wx.cloud,
  );
};

const loadSnapshot = (openid) => {
  try {
    const stored = wx.getStorageSync(RECIPE_SYNC_STORAGE_KEY);
    const parsed = stored ? (typeof stored === "string" ? JSON.parse(stored) : stored) : null;
    return snapshotForUser(parsed, openid);
  } catch (error) {
    return snapshotForUser(null, openid);
  }
};

const saveSnapshot = (snapshot) => {
  wx.setStorageSync(RECIPE_SYNC_STORAGE_KEY, JSON.stringify(snapshot));
};

const uploadImage = (openid, recipeId, filePath) =>
  new Promise((resolve) => {
    let ext = (String(filePath || "").split(".").pop() || "jpg").toLowerCase();
    if (ext === "jpeg") {
      ext = "jpg";
    }
    wx.cloud.uploadFile({
      cloudPath: `recipes/${openid}/${recipeId}.${ext}`,
      filePath,
      success: (res) => resolve(res.fileID || ""),
      fail: (error) => {
        console.error("成品图上传失败", recipeId, error);
        resolve("");
      },
    });
  });

const callRecipeSync = (payload) =>
  new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: "recipeSync",
      data: payload,
      success: (res) => {
        const result = (res && res.result) || {};
        if (result.ok === false) {
          reject(new Error(result.message || "云端同步失败"));
          return;
        }
        resolve(result);
      },
      fail: reject,
    });
  });

// 判断某食谱本轮是否需要推送完整内容
const needsPush = (recipe, snapshotRecipes, uploadFailed, justUploaded) => {
  if (justUploaded[recipe.id]) {
    return true; // 本轮刚上传成品图 → 需要把 fileID 推上云（updatedAt 可能没变，服务端对等时间戳的图片升级会接受）
  }
  if (uploadFailed[recipe.id] && snapshotRecipes[recipe.id]) {
    // 图片上传失败且云端已有该食谱 → 本轮跳过（避免用无意义的本地路径覆盖云端），
    // 但元数据仍在 live 里，云端不会当作“另一端新建”回传；下一轮重试上传。
    return false;
  }
  if (!snapshotRecipes[recipe.id]) {
    return true; // 新食谱
  }
  if (snapshotRecipes[recipe.id] !== recipe.updatedAt) {
    return true; // 本地有修改
  }
  return Boolean(recipe.image) && !isCloudImage(recipe.image); // 成品图还没上云
};

const syncRecipes = () => {
  if (!canSync()) {
    return Promise.resolve({ ok: false, code: "disabled" });
  }
  if (running) {
    return Promise.resolve({ ok: false, code: "busy" });
  }
  running = true;

  const app = getApp();
  const openid = app.globalData.user.openid;
  const snapshot = loadSnapshot(openid);
  const requestStartedAt = createTimestamp();

  // 1. 准备待推送副本：成品图 data URL → 本地文件 → 云存储 fileID
  const working = app.globalData.appState.recipes.map((recipe) => ({ ...recipe }));
  const uploaded = {}; // id → { fileID, localPath }
  const uploadFailed = {};

  return working
    .filter((recipe) => recipe.image && !isCloudImage(recipe.image))
    .reduce(
      (chain, recipe) =>
        chain.then(() => {
          let filePath = recipe.image;
          if (isDataUrl(filePath)) {
            filePath = persistImageToFile(recipe.id, filePath);
          }
          if (!filePath || isDataUrl(filePath)) {
            return undefined; // 落盘失败，本轮不上传
          }
          return uploadImage(openid, recipe.id, filePath).then((fileID) => {
            if (fileID) {
              recipe.image = fileID;
              uploaded[recipe.id] = { fileID, localPath: filePath };
            } else {
              uploadFailed[recipe.id] = true;
            }
          });
        }),
      Promise.resolve(),
    )
    .then(() => {
      // 2. 组装请求：live 元数据全量，changed 只带需要推送的
      const live = working.map((recipe) => ({ id: recipe.id, updatedAt: recipe.updatedAt }));
      const deletes = computeLocalDeletes(working, snapshot.recipes).map((entry) => ({
        id: entry.id,
        deletedAt: requestStartedAt,
      }));
      const changed = working.filter((recipe) => needsPush(recipe, snapshot.recipes, uploadFailed, uploaded));

      // 首次同步后（已有 lastSyncAt）本地无任何食谱变化时跳过网络请求——
      // 菜单计划/采购清单的保存也会触发防抖同步，不必为此空跑云端
      if (!changed.length && !deletes.length && snapshot.lastSyncAt) {
        return { lastResponse: null, pushed: 0, skipped: true };
      }

      // 3. 分批调用
      const batches = [];
      for (let i = 0; i < changed.length; i += CHANGED_BATCH_SIZE) {
        batches.push(changed.slice(i, i + CHANGED_BATCH_SIZE));
      }
      if (!batches.length) {
        batches.push([]);
      }
      let lastResponse = null;
      let pushed = 0;
      return batches
        .reduce(
          (chain, batch) =>
            chain.then(() =>
              callRecipeSync({ live, changed: batch, deletes }).then((result) => {
                lastResponse = result;
                pushed += result.pushed || 0;
              }),
            ),
          Promise.resolve(),
        )
        .then(() => ({ lastResponse, pushed, skipped: false }));
    })
    .then((outcome) => {
      if (outcome.skipped) {
        return { ok: true, pulled: 0, pushed: 0, removed: 0, skipped: true };
      }
      const response = outcome.lastResponse;

      // 4. 应用云端结果（读取最新 state，防止请求期间本地又改动）
      const fresh = app.globalData.appState;
      const recipesWithUploads = fresh.recipes.map((recipe) =>
        uploaded[recipe.id] ? { ...recipe, image: uploaded[recipe.id].fileID } : recipe,
      );
      const imageChanged = Object.keys(uploaded).length > 0;
      const applied = applySyncResponse({
        recipes: recipesWithUploads,
        mealPlan: fresh.mealPlan,
        upserts: (response.upserts || []).map(migrateRecipe),
        removes: response.removes || [],
        requestStartedAt,
      });
      if (applied.changed || imageChanged) {
        app.globalData.appState = { ...fresh, recipes: applied.recipes, mealPlan: applied.mealPlan };
        app.saveState({ skipSyncSchedule: true });
      }

      // 5. 清理本地图片文件：已换成 fileID 的原图、被墓碑删除食谱的本地图片
      Object.keys(uploaded).forEach((id) => deleteImageFile(uploaded[id].localPath));
      applied.removedImages.forEach((image) => {
        if (image && !isCloudImage(image) && !isDataUrl(image)) {
          deleteImageFile(image);
        }
      });

      // 6. 保存快照
      const now = createTimestamp();
      saveSnapshot(
        buildSnapshot({
          openid,
          lastSyncAt: now,
          versions: response.versions || [],
          tombstones: pruneTombstones(tombstoneMap(response.tombstones || []), now),
        }),
      );

      return {
        ok: true,
        pulled: applied.added + applied.updated,
        pushed: outcome.pushed,
        removed: applied.removedIds.length,
      };
    })
    .catch((error) => {
      console.error("食谱云同步失败", error);
      return {
        ok: false,
        code: "error",
        message: (error && (error.errMsg || error.message)) || "云同步失败",
      };
    })
    .then((result) => {
      running = false;
      return result;
    });
};

// 数据保存后防抖触发（canSync 在真正执行时才判断，app 启动早期也可安全调用）
const scheduleSync = (delay) => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(
    () => {
      syncRecipes();
    },
    typeof delay === "number" ? delay : SYNC_DEBOUNCE_MS,
  );
};

const getLastSyncText = () => {
  try {
    const stored = wx.getStorageSync(RECIPE_SYNC_STORAGE_KEY);
    if (!stored) {
      return "未同步";
    }
    const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
    const time = Date.parse(parsed && parsed.lastSyncAt);
    if (!time) {
      return "未同步";
    }
    const date = new Date(time);
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    return `上次同步 ${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch (error) {
    return "未同步";
  }
};

module.exports = { syncRecipes, scheduleSync, getLastSyncText };
