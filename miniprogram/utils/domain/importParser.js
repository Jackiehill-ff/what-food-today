const { createId, createTimestamp } = require("./ids");
const { createBlankItem } = require("./recipes");

const createImportDraft = (recipe = {}) => ({
  id: createId(),
  title: recipe.title || "",
  type: "full",
  category: "",
  ingredients: recipe.ingredients && recipe.ingredients.length ? recipe.ingredients : [createBlankItem("食材")],
  method: recipe.method || "",
  rawText: recipe.rawText || "",
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  parseFailed: Boolean(recipe.parseFailed),
});

const FIELD_PATTERN = /^(食材|调味料|做法)\s*[:：]/;

const isValidTitleLine = (line) => {
  const trimmed = line.trim();
  return Boolean(trimmed) && !trimmed.startsWith("#") && !FIELD_PATTERN.test(trimmed);
};

const textAfterField = (line, field) => line.replace(new RegExp(`^${field}\\s*[:：]\\s*`), "").trim();

const findPreviousIndex = (lines, startIndex, predicate) => {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (predicate(lines[index])) {
      return index;
    }
  }
  return -1;
};

const findNextIndex = (lines, startIndex, endIndex, predicate) => {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (predicate(lines[index])) {
      return index;
    }
  }
  return -1;
};

const splitNames = (line, field) =>
  textAfterField(line, field)
    .split(/[、，,;；]/)
    .map((name) => name.trim())
    .filter(Boolean);

const toIngredient = (name, category) => ({
  ...createBlankItem(category),
  name,
  amount: "",
  unit: "",
});

const parseRecipeImportText = (text) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const ingredientLineIndexes = [];
  lines.forEach((line, index) => {
    if (/^食材\s*[:：]/.test(line)) {
      ingredientLineIndexes.push(index);
    }
  });

  if (!text.trim() || ingredientLineIndexes.length === 0) {
    return [createImportDraft({ rawText: text, parseFailed: true })];
  }

  return ingredientLineIndexes.map((ingredientLineIndex, recipeIndex) => {
    const nextIngredientLineIndex = ingredientLineIndexes[recipeIndex + 1] ?? lines.length;
    const titleLineIndex = findPreviousIndex(lines, ingredientLineIndex - 1, isValidTitleLine);
    const title = titleLineIndex >= 0 ? lines[titleLineIndex] : "";
    const nextTitleLineIndex =
      recipeIndex + 1 < ingredientLineIndexes.length
        ? findPreviousIndex(lines, ingredientLineIndexes[recipeIndex + 1] - 1, isValidTitleLine)
        : -1;
    const methodLineIndex = findNextIndex(lines, ingredientLineIndex + 1, nextIngredientLineIndex, (line) =>
      /^做法\s*[:：]/.test(line),
    );
    const methodEndIndex =
      nextTitleLineIndex > methodLineIndex && methodLineIndex >= 0 ? nextTitleLineIndex : nextIngredientLineIndex;
    const method =
      methodLineIndex >= 0
        ? [textAfterField(lines[methodLineIndex], "做法"), ...lines.slice(methodLineIndex + 1, methodEndIndex)]
            .filter(Boolean)
            .join("\n")
        : "";

    const blockEnd = methodLineIndex >= 0 ? methodLineIndex : nextIngredientLineIndex;
    const foodIngredients = splitNames(lines[ingredientLineIndex], "食材").map((name) => toIngredient(name, "食材"));
    const seasoningIngredients = lines
      .slice(ingredientLineIndex + 1, blockEnd)
      .filter((line) => /^调味料\s*[:：]/.test(line))
      .flatMap((line) => splitNames(line, "调味料").map((name) => toIngredient(name, "调味料")));

    const rawStartIndex = titleLineIndex >= 0 ? titleLineIndex : ingredientLineIndex;
    const rawEndIndex = methodEndIndex > rawStartIndex ? methodEndIndex : nextIngredientLineIndex;

    return createImportDraft({
      title,
      ingredients: [...foodIngredients, ...seasoningIngredients],
      method,
      rawText: lines.slice(rawStartIndex, rawEndIndex).join("\n"),
      parseFailed: !title || !method,
    });
  });
};

module.exports = { createImportDraft, parseRecipeImportText };
