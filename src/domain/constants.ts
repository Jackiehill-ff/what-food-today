import type { AppState, Category } from "./types";

export const STORAGE_KEY = "meal-planner-app-v1";
export const SYNC_STORAGE_KEY = "meal-planner-sync-v1";
export const RECIPE_ITEM_DRAG_TYPE = "application/x-recipe-item";

export const CATEGORIES: Category[] = ["蔬菜", "豆类", "谷类", "调料", "其他"];

export const DEFAULT_STATE: AppState = {
  recipes: [],
  importRecords: [],
  mealPlan: [],
  shoppingItems: [],
};
