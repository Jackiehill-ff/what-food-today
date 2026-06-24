import { CATEGORIES } from "./constants";
import { createId, createTimestamp } from "./ids";
import type { Category, Ingredient, Recipe, RecipeType } from "./types";

export const isCategory = (value: string): value is Category => CATEGORIES.includes(value as Category);

export const normalizeCategory = (value: unknown): Category =>
  typeof value === "string" && isCategory(value) ? value : "其他";

export const createBlankItem = (category: Category = "蔬菜"): Ingredient => ({
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
    createdAt: recipe.createdAt || now,
    updatedAt: recipe.updatedAt || now,
  };
};

export const getItemsForRecipe = (recipe: Recipe) => recipe.ingredients.filter((item) => item.name.trim());

export const getRecipeSeasonings = (recipe: Recipe) => recipe.ingredients.filter((item) => item.category === "调料");

export const getRecipeFoodIngredients = (recipe: Recipe) =>
  recipe.ingredients.filter((item) => item.category !== "调料");
