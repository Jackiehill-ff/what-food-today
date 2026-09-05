import { DEFAULT_STATE, STORAGE_KEY } from "../domain/constants";
import { createId, createTimestamp } from "../domain/ids";
import { migrateRecipe, normalizeCategory } from "../domain/recipes";
import type { AppState, ImportRecord, MealPlanEntry, ShoppingListItem } from "../domain/types";

const migrateImportRecord = (record: Partial<ImportRecord>): ImportRecord => ({
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

const migrateShoppingItem = (item: Partial<ShoppingListItem>): ShoppingListItem => ({
  id: item.id ?? createId(),
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
const LEGACY_SLOT_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2 };

type LegacyMealPlanEntry = Partial<MealPlanEntry> & { slotId?: string };

const migrateMealPlan = (mealPlan: unknown): MealPlanEntry[] => {
  if (!Array.isArray(mealPlan)) {
    return [];
  }
  return mealPlan
    .map((entry, index) => {
      const item = entry as LegacyMealPlanEntry;
      return {
        date: typeof item.date === "string" ? item.date : "",
        recipeId: typeof item.recipeId === "string" ? item.recipeId : "",
        slotOrder: item.slotId !== undefined ? (LEGACY_SLOT_ORDER[item.slotId] ?? 99) : 99,
        index,
      };
    })
    .filter((entry) => entry.date && entry.recipeId)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.slotOrder - b.slotOrder ||
        a.index - b.index,
    )
    .map(({ date, recipeId }) => ({ date, recipeId }));
};

export const migrateAppState = (parsed: Partial<AppState>): AppState => {
  const recipes = Array.isArray(parsed.recipes) ? parsed.recipes.map(migrateRecipe).filter((recipe) => recipe.title) : [];
  return {
    recipes,
    importRecords: Array.isArray(parsed.importRecords) ? parsed.importRecords.map(migrateImportRecord) : [],
    mealPlan: migrateMealPlan(parsed.mealPlan),
    shoppingItems: Array.isArray(parsed.shoppingItems) ? parsed.shoppingItems.map(migrateShoppingItem) : [],
  };
};

export const loadAppState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }
    return migrateAppState(JSON.parse(stored) as Partial<AppState>);
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveAppState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
