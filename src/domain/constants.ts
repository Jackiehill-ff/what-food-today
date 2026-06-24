import type { AppState, Category, MealSlot } from "./types";

export const STORAGE_KEY = "meal-planner-app-v1";
export const RECIPE_ITEM_DRAG_TYPE = "application/x-recipe-item";

export const CATEGORIES: Category[] = ["蔬菜", "豆类", "谷类", "调料", "其他"];

export const DEFAULT_SLOT_TIMES: Record<string, { hour: number; minute: number }> = {
  breakfast: { hour: 8, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 0 },
};

export const FIXED_MEAL_SLOTS: MealSlot[] = [
  { id: "breakfast", name: "早餐" },
  { id: "lunch", name: "午餐" },
  { id: "dinner", name: "晚餐" },
];

export const DEFAULT_STATE: AppState = {
  recipes: [],
  importRecords: [],
  mealSlots: FIXED_MEAL_SLOTS,
  mealPlan: [],
  shoppingItems: [],
};
