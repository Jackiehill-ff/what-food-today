import type { AppState, Category } from "./types";

export const STORAGE_KEY = "meal-planner-app-v1";
export const SYNC_STORAGE_KEY = "meal-planner-sync-v1";

export const CATEGORIES: Category[] = ["食材", "调味料"];

export const DEFAULT_STATE: AppState = {
  recipes: [],
  importRecords: [],
  mealPlan: [],
  shoppingItems: [],
};
