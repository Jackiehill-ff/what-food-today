import { createId, createTimestamp } from "./ids";
import { createBlankItem } from "./recipes";
import type { ImportDraft, Recipe } from "./types";

export const createImportDraft = (recipe: Partial<Recipe> & { rawText: string; parseFailed?: boolean }): ImportDraft => ({
  id: createId(),
  title: recipe.title ?? "",
  type: "full",
  category: "",
  ingredients: recipe.ingredients?.length ? recipe.ingredients : [createBlankItem("其他")],
  method: recipe.method ?? "",
  rawText: recipe.rawText,
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  parseFailed: Boolean(recipe.parseFailed),
});

const FIELD_PATTERN = /^(食材|做法)\s*[:：]/;

const isValidTitleLine = (line: string) => {
  const trimmed = line.trim();
  return Boolean(trimmed) && !trimmed.startsWith("#") && !FIELD_PATTERN.test(trimmed);
};

const textAfterField = (line: string, field: "食材" | "做法") =>
  line.replace(new RegExp(`^${field}\\s*[:：]\\s*`), "").trim();

const findPreviousIndex = (lines: string[], startIndex: number, predicate: (line: string) => boolean) => {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (predicate(lines[index])) {
      return index;
    }
  }
  return -1;
};

const findNextIndex = (
  lines: string[],
  startIndex: number,
  endIndex: number,
  predicate: (line: string) => boolean,
) => {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (predicate(lines[index])) {
      return index;
    }
  }
  return -1;
};

export const parseRecipeImportText = (text: string): ImportDraft[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const ingredientLineIndexes = lines.reduce<number[]>((indexes, line, index) => {
    if (/^食材\s*[:：]/.test(line)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

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
    const ingredients = textAfterField(lines[ingredientLineIndex], "食材")
      .split(/[、，,]/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({
        ...createBlankItem("其他"),
        name,
        amount: "",
        unit: "",
      }));
    const rawStartIndex = titleLineIndex >= 0 ? titleLineIndex : ingredientLineIndex;
    const rawEndIndex = methodEndIndex > rawStartIndex ? methodEndIndex : nextIngredientLineIndex;

    return createImportDraft({
      title,
      ingredients,
      method,
      rawText: lines.slice(rawStartIndex, rawEndIndex).join("\n"),
      parseFailed: !title || !method,
    });
  });
};
