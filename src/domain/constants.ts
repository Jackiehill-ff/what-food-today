import type { AppState, Category } from "./types";

export const STORAGE_KEY = "meal-planner-app-v1";
export const SYNC_STORAGE_KEY = "meal-planner-sync-v1";
export const RECIPE_ITEM_DRAG_TYPE = "application/x-recipe-item";

export const CATEGORIES: Category[] = ["食材", "调味料"];

// 食材/调味料的单位选项（可后续扩展）
export const UNIT_OPTIONS = ["", "g", "tsp"] as const;
export const UNIT_LABELS: Record<string, string> = { "": "无", g: "克 (g)", tsp: "茶匙 (tsp)" };

export const DEFAULT_STATE: AppState = {
  recipes: [],
  importRecords: [],
  mealPlan: [],
  shoppingItems: [],
};
