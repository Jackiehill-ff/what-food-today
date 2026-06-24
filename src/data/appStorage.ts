import { DEFAULT_STATE, FIXED_MEAL_SLOTS, STORAGE_KEY } from "../domain/constants";
import { createId, createTimestamp } from "../domain/ids";
import { migrateRecipe } from "../domain/recipes";
import type { AppState, ImportRecord } from "../domain/types";

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

export const loadAppState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(stored) as Partial<AppState>;
    const recipes = Array.isArray(parsed.recipes) ? parsed.recipes.map(migrateRecipe).filter((recipe) => recipe.title) : [];
    return {
      recipes,
      importRecords: Array.isArray(parsed.importRecords) ? parsed.importRecords.map(migrateImportRecord) : [],
      mealSlots: FIXED_MEAL_SLOTS,
      mealPlan: (parsed.mealPlan ?? []).filter((entry) => FIXED_MEAL_SLOTS.some((slot) => slot.id === entry.slotId)),
      shoppingItems: parsed.shoppingItems ?? [],
    };
  } catch {
    return DEFAULT_STATE;
  }
};

export const saveAppState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
