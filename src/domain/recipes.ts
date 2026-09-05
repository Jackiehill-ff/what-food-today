import { CATEGORIES } from "./constants";
import { createId, createTimestamp } from "./ids";
import type { Category, Ingredient, Recipe, RecipeType } from "./types";

export const isCategory = (value: string): value is Category => CATEGORIES.includes(value as Category);

// 旧分类迁移：调料 → 调味料，其余（蔬菜/豆类/谷类/其他）→ 食材
export const normalizeCategory = (value: unknown): Category => {
  if (value === "食材" || value === "调味料") {
    return value;
  }
  return value === "调料" ? "调味料" : "食材";
};

export const createBlankItem = (category: Category = "食材"): Ingredient => ({
  id: createId(),
  name: "",
  amount: "",
  unit: "",
  category,
});

export const createBlankRecipe = (): Recipe => ({
  id: createId(),
  title: "",
  type: "full",
  category: "",
  ingredients: [createBlankItem()],
  method: "",
  rawText: "",
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
});

export const normalizeIngredient = (item: Partial<Ingredient>): Ingredient => ({
  id: item.id || createId(),
  name: item.name?.trim() ?? "",
  category: normalizeCategory(item.category),
  amount: item.amount?.trim() ?? "",
  unit: item.unit?.trim() ?? "",
});

const isRecipeType = (value: unknown): value is RecipeType => value === "full" || value === "simple";

export const migrateRecipe = (
  recipe: Partial<Recipe> & {
    kind?: RecipeType;
    name?: string;
    seasonings?: Partial<Ingredient>[];
    steps?: string;
    notes?: string;
  },
): Recipe => {
  const now = createTimestamp();
  const ingredients = [
    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
    ...(Array.isArray(recipe.seasonings) ? recipe.seasonings : []),
  ].map(normalizeIngredient);

  return {
    id: recipe.id || createId(),
    title: (recipe.title ?? recipe.name ?? "").trim(),
    type: isRecipeType(recipe.type) ? recipe.type : isRecipeType(recipe.kind) ? recipe.kind : "full",
    category: recipe.category?.trim() ?? "",
    ingredients,
    method: (recipe.method ?? recipe.steps ?? "").trim(),
    rawText: (recipe.rawText ?? recipe.notes ?? "").trim(),
    image: typeof recipe.image === "string" ? recipe.image : "",
    createdAt: recipe.createdAt || now,
    updatedAt: recipe.updatedAt || now,
  };
};

export const getItemsForRecipe = (recipe: Recipe) => recipe.ingredients.filter((item) => item.name.trim());

export const getRecipeSeasonings = (recipe: Recipe) => recipe.ingredients.filter((item) => item.category === "调味料");

export const getRecipeFoodIngredients = (recipe: Recipe) =>
  recipe.ingredients.filter((item) => item.category === "食材");

// 食谱卡片摘要：仅食材（不含调味料），仅名称，空格分隔
export const getRecipeIngredientSummary = (recipe: Recipe) =>
  recipe.ingredients
    .filter((item) => item.category === "食材" && item.name.trim())
    .map((item) => item.name.trim())
    .join(" ");
