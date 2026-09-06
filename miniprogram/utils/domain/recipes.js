const { CATEGORIES } = require("./constants");
const { createId, createTimestamp } = require("./ids");

const isCategory = (value) => CATEGORIES.includes(value);

// 旧分类迁移：调料 → 调味料，其余 → 食材
const normalizeCategory = (value) => {
  if (value === "食材" || value === "调味料") {
    return value;
  }
  return value === "调料" ? "调味料" : "食材";
};

const createBlankItem = (category = "食材") => ({
  id: createId(),
  name: "",
  amount: "",
  unit: "",
  category,
});

const createBlankRecipe = () => ({
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

const normalizeIngredient = (item = {}) => ({
  id: item.id || createId(),
  name: (item.name || "").trim(),
  category: normalizeCategory(item.category),
  amount: (item.amount || "").trim(),
  unit: (item.unit || "").trim(),
});

const isRecipeType = (value) => value === "full" || value === "simple";

const migrateRecipe = (recipe = {}) => {
  const now = createTimestamp();
  const ingredients = [
    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
    ...(Array.isArray(recipe.seasonings) ? recipe.seasonings : []),
  ].map(normalizeIngredient);

  return {
    id: recipe.id || createId(),
    title: (recipe.title || recipe.name || "").trim(),
    type: isRecipeType(recipe.type) ? recipe.type : isRecipeType(recipe.kind) ? recipe.kind : "full",
    category: (recipe.category || "").trim(),
    ingredients,
    method: (recipe.method || recipe.steps || "").trim(),
    rawText: (recipe.rawText || recipe.notes || "").trim(),
    image: typeof recipe.image === "string" ? recipe.image : "",
    createdAt: recipe.createdAt || now,
    updatedAt: recipe.updatedAt || now,
  };
};

const getItemsForRecipe = (recipe) => (recipe.ingredients || []).filter((item) => item.name.trim());

const getRecipeSeasonings = (recipe) => (recipe.ingredients || []).filter((item) => item.category === "调味料");

const getRecipeFoodIngredients = (recipe) => (recipe.ingredients || []).filter((item) => item.category === "食材");

// 食谱卡片摘要：仅食材（不含调味料），仅名称，空格分隔
const getRecipeIngredientSummary = (recipe) =>
  (recipe.ingredients || [])
    .filter((item) => item.category === "食材" && item.name.trim())
    .map((item) => item.name.trim())
    .join(" ");

module.exports = {
  isCategory,
  normalizeCategory,
  createBlankItem,
  createBlankRecipe,
  normalizeIngredient,
  migrateRecipe,
  getItemsForRecipe,
  getRecipeSeasonings,
  getRecipeFoodIngredients,
  getRecipeIngredientSummary,
};
