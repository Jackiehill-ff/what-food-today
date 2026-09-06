const STORAGE_KEY = "meal-planner-app-v1";
const SYNC_STORAGE_KEY = "meal-planner-sync-v1";

const CATEGORIES = ["食材", "调味料"];

// 食材/调味料的单位选项
const UNIT_OPTIONS = ["", "g", "tsp"];
const UNIT_LABELS = { "": "无", g: "克 (g)", tsp: "茶匙 (tsp)" };

const DEFAULT_STATE = {
  recipes: [],
  importRecords: [],
  mealPlan: [],
  shoppingItems: [],
};

module.exports = {
  STORAGE_KEY,
  SYNC_STORAGE_KEY,
  CATEGORIES,
  UNIT_OPTIONS,
  UNIT_LABELS,
  DEFAULT_STATE,
};
