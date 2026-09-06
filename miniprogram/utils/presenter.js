const {
  getRecipeFoodIngredients,
  getRecipeSeasonings,
  getRecipeIngredientSummary,
} = require("./domain/recipes");

// 给食谱对象补充展示字段（数量标签 + 食材摘要），供页面渲染使用
const decorateRecipe = (recipe) => {
  const foodCount = getRecipeFoodIngredients(recipe).length;
  const seasoningCount = getRecipeSeasonings(recipe).length;
  const countLabel =
    [foodCount ? `${foodCount} 食材` : "", seasoningCount ? `${seasoningCount} 调味料` : ""]
      .filter(Boolean)
      .join(" · ") || "暂无食材";

  return {
    ...recipe,
    summary: getRecipeIngredientSummary(recipe),
    countLabel,
  };
};

module.exports = { decorateRecipe };
