const { DEFAULT_STATE, STORAGE_KEY, SYNC_STORAGE_KEY } = require("./domain/constants");
const { createId, createTimestamp } = require("./domain/ids");
const { migrateRecipe, normalizeCategory } = require("./domain/recipes");
const { isDataUrl, persistImageToFile } = require("./images");

const migrateImportRecord = (record = {}) => ({
  id: record.id || createId(),
  sourceType:
    record.sourceType === "flomo" || record.sourceType === "image" || record.sourceType === "manual"
      ? record.sourceType
      : "manual",
  sourceId: record.sourceId,
  rawText: record.rawText,
  importedRecipeIds: Array.isArray(record.importedRecipeIds) ? record.importedRecipeIds : [],
  createdAt: record.createdAt || createTimestamp(),
});

const migrateShoppingItem = (item = {}) => ({
  id: item.id || createId(),
  date: typeof item.date === "string" ? item.date : "",
  name: typeof item.name === "string" ? item.name : "",
  amount: typeof item.amount === "string" ? item.amount : "",
  unit: typeof item.unit === "string" ? item.unit : "",
  category: normalizeCategory(item.category),
  sourceLabel: typeof item.sourceLabel === "string" ? item.sourceLabel : "",
  sourceCandidateId: item.sourceCandidateId,
  createdAt: typeof item.createdAt === "number" ? item.createdAt : 0,
  checked: Boolean(item.checked),
  checkedAt: typeof item.checkedAt === "number" ? item.checkedAt : undefined,
});

// 旧版按早餐/午餐/晚餐（slotId）安排；迁移时去掉 slotId，
// 同一天内按 早餐 → 午餐 → 晚餐 顺序重排为数组顺序，保留原有顺序语义。
const LEGACY_SLOT_ORDER = { breakfast: 0, lunch: 1, dinner: 2 };

const migrateMealPlan = (mealPlan) => {
  if (!Array.isArray(mealPlan)) {
    return [];
  }
  return mealPlan
    .map((entry, index) => {
      const item = entry || {};
      return {
        date: typeof item.date === "string" ? item.date : "",
        recipeId: typeof item.recipeId === "string" ? item.recipeId : "",
        slotOrder: item.slotId !== undefined ? (LEGACY_SLOT_ORDER[item.slotId] ?? 99) : 99,
        index,
      };
    })
    .filter((entry) => entry.date && entry.recipeId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.slotOrder - b.slotOrder || a.index - b.index)
    .map(({ date, recipeId }) => ({ date, recipeId }));
};

const migrateAppState = (parsed = {}) => {
  const recipes = Array.isArray(parsed.recipes)
    ? parsed.recipes.map(migrateRecipe).filter((recipe) => recipe.title)
    : [];
  return {
    recipes,
    importRecords: Array.isArray(parsed.importRecords) ? parsed.importRecords.map(migrateImportRecord) : [],
    mealPlan: migrateMealPlan(parsed.mealPlan),
    shoppingItems: Array.isArray(parsed.shoppingItems) ? parsed.shoppingItems.map(migrateShoppingItem) : [],
  };
};

const loadAppState = () => {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (!stored) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    return migrateAppState(typeof stored === "string" ? JSON.parse(stored) : stored);
  } catch (error) {
    console.error("读取本地数据失败", error);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
};

const saveAppState = (state) => {
  try {
    // 把成品图 data URL 落盘为本地文件，避免单个 key 超限
    const recipes = (state.recipes || []).map((recipe) => {
      if (isDataUrl(recipe.image)) {
        return { ...recipe, image: persistImageToFile(recipe.id, recipe.image) };
      }
      return recipe;
    });
    wx.setStorageSync(STORAGE_KEY, JSON.stringify({ ...state, recipes }));
  } catch (error) {
    // 存储配额满时保底：不让保存异常打断整个应用，但明确暴露问题
    console.error("保存本地数据失败（可能超出存储配额）", error);
  }
};

const DEFAULT_SYNC_METADATA = {
  deviceId: "",
  syncStatus: "local-only",
  syncQueue: [],
  syncConflicts: [],
  migrationStatus: "not-started",
};

const createDeviceId = () => `device-${createId()}`;

const normalizeSyncMetadata = (metadata = {}) => ({
  userId: metadata.userId,
  deviceId: metadata.deviceId || createDeviceId(),
  syncStatus: metadata.syncStatus || "local-only",
  syncQueue: Array.isArray(metadata.syncQueue) ? metadata.syncQueue : [],
  syncConflicts: Array.isArray(metadata.syncConflicts) ? metadata.syncConflicts : [],
  lastPulledAt: metadata.lastPulledAt,
  lastPushedAt: metadata.lastPushedAt,
  migrationStatus: metadata.migrationStatus || "not-started",
});

const loadSyncMetadata = () => {
  try {
    const stored = wx.getStorageSync(SYNC_STORAGE_KEY);
    return normalizeSyncMetadata(stored ? (typeof stored === "string" ? JSON.parse(stored) : stored) : DEFAULT_SYNC_METADATA);
  } catch {
    return normalizeSyncMetadata(DEFAULT_SYNC_METADATA);
  }
};

const saveSyncMetadata = (metadata) => {
  wx.setStorageSync(SYNC_STORAGE_KEY, JSON.stringify(metadata));
};

const createAppStateBackup = () => {
  const stored = wx.getStorageSync(STORAGE_KEY);
  if (!stored) {
    return null;
  }
  const backupKey = `${STORAGE_KEY}-backup-${createTimestamp().replace(/[:.]/g, "-")}`;
  wx.setStorageSync(backupKey, stored);
  return backupKey;
};

module.exports = {
  migrateAppState,
  loadAppState,
  saveAppState,
  loadSyncMetadata,
  saveSyncMetadata,
  createAppStateBackup,
};
