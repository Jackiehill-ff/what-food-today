import { createId, createTimestamp } from "./ids";
import { createBlankItem } from "./recipes";
import { isSeasoningName } from "./seasoningNames";
import type { ImportDraft, Ingredient, Recipe } from "./types";

export const createImportDraft = (recipe: Partial<Recipe> & { rawText: string; parseFailed?: boolean }): ImportDraft => ({
  id: createId(),
  title: recipe.title ?? "",
  type: "full",
  category: "",
  ingredients: recipe.ingredients?.length ? recipe.ingredients : [createBlankItem("食材")],
  method: recipe.method ?? "",
  rawText: recipe.rawText,
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  parseFailed: Boolean(recipe.parseFailed),
});

const FIELD_PATTERN = /^(食材|调味料|做法)\s*[:：]/;

const isValidTitleLine = (line: string) => {
  const trimmed = line.trim();
  return Boolean(trimmed) && !trimmed.startsWith("#") && !FIELD_PATTERN.test(trimmed);
};

const textAfterField = (line: string, field: "食材" | "调味料" | "做法") =>
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

// 括号感知的食材名切分（顿号/逗号/分号）
const splitNames = (text: string) => {
  const parts: string[] = [];
  let buffer = "";
  let depth = 0;
  for (const ch of text) {
    if (ch === "（" || ch === "(") {
      depth += 1;
    }
    if (ch === "）" || ch === ")") {
      depth = Math.max(0, depth - 1);
    }
    if ((ch === "、" || ch === "，" || ch === "," || ch === ";" || ch === "；") && depth === 0) {
      parts.push(buffer);
      buffer = "";
    } else {
      buffer += ch;
    }
  }
  parts.push(buffer);
  return parts.map((part) => part.trim()).filter(Boolean);
};

// ---------- 名称 / 用量拆分 ----------
// 「花椰菜 1 颗（约 680 克），切小块」→ name=花椰菜，amount=1 颗（约 680 克），切小块
const AMOUNT_PATTERN =
  /([0-9０-９]+(?:[.．][0-9０-９]+)?(?:\s*[-－–—~～][0-9０-９]+(?:[.．][0-9０-９]+)?)?|[½¼¾⅓⅔⅛⅜⅝⅞])\s*(克|千克|公斤|斤|毫升|ml|升|l|大勺|小勺|大匙|小匙|茶匙|勺|匙|朵|根|段|块|片|个|颗|粒|滴|瓣|张|包|罐|瓶|盒|杯|条|份|人份|把|只|枚|支)/i;
const LOOSE_AMOUNT_TAIL = /^(.*?)(?:\s+)?(少许|适量|若干)((?:[（(][^）)]*[）)])?)\s*$/u;

const bracketDepthAt = (text: string, index: number) => {
  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === "（" || text[i] === "(") {
      depth += 1;
    }
    if (text[i] === "）" || text[i] === ")") {
      depth = Math.max(0, depth - 1);
    }
  }
  return depth;
};

const stripTrailingParens = (name: string) => {
  let result = name.trim();
  let previous: string;
  do {
    previous = result;
    result = result.replace(/[（(][^（）()]*[）)]\s*$/u, "").trim();
  } while (result !== previous);
  return result;
};

export const splitIngredientText = (raw: string): { name: string; amount: string } => {
  const text = raw.trim();
  if (!text) {
    return { name: "", amount: "" };
  }
  for (const match of text.matchAll(new RegExp(AMOUNT_PATTERN.source, AMOUNT_PATTERN.flags + "g"))) {
    if (bracketDepthAt(text, match.index ?? 0) === 0) {
      const name = text
        .slice(0, match.index)
        .trim()
        .replace(/[，,、；;：:]+$/u, "")
        .trim();
      if (name) {
        return { name: stripTrailingParens(name), amount: text.slice(match.index).trim() };
      }
      break;
    }
  }
  const loose = text.match(LOOSE_AMOUNT_TAIL);
  if (loose && loose[1].trim()) {
    return { name: stripTrailingParens(loose[1].trim()), amount: `${loose[2]}${loose[3]}`.trim() };
  }
  return { name: text, amount: "" };
};

const toIngredientFromText = (text: string, forceCategory?: "食材" | "调味料"): Ingredient => {
  const { name, amount } = splitIngredientText(text);
  const cleanName = name.replace(/[。．.]+\s*$/u, "").replace(/等\s*$/u, "").trim();
  const category: "食材" | "调味料" = forceCategory ?? (isSeasoningName(cleanName) ? "调味料" : "食材");
  return {
    ...createBlankItem(category),
    name: cleanName,
    amount,
    unit: "",
  };
};

// ---------- 分段式格式（小标题 + 「- 」食材行 + emoji/数字步骤） ----------
const BULLET_PATTERN = /^[-－–—•·*⋅‧・◦]\s*/;
const TIP_MARK_PATTERN = /^[✨⭐🌟💫]\s*/;
const KEYCAP_STEP_PATTERN = /^[0-9０-９]{1,2}\uFE0F?\u20E3\s*/u;
const STEP_NUMBER_PATTERN = /^(?:step\s*)?[0-9０-９]{1,2}\s*(?:[、)）：]\s*|[.．]\s+)\s*/iu;
const METHOD_HEADER_PATTERN = /制作步骤|制作方法|做法|步骤|directions|instructions|method/i;
const TIPS_HEADER_PATTERN = /tips|小贴士|贴士|小提示|小技巧/i;
const SECTION_HEADER_MAX_LENGTH = 24;

const isIngredientSectionHeader = (line: string) =>
  /[：:]$/u.test(line) && !BULLET_PATTERN.test(line) && line.length <= SECTION_HEADER_MAX_LENGTH;

const stripStepMarker = (line: string) =>
  line.replace(KEYCAP_STEP_PATTERN, "").replace(STEP_NUMBER_PATTERN, "").trim();

export const parseSectionedRecipe = (text: string): ImportDraft => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  let title = "";
  let section: "none" | "ingredients" | "method" | "tips" = "none";
  const items: Ingredient[] = [];
  const methodLines: string[] = [];
  const tipLines: string[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }
    const isBullet = BULLET_PATTERN.test(line);
    if (!isBullet && TIPS_HEADER_PATTERN.test(line)) {
      section = "tips";
      continue;
    }
    if (!isBullet && METHOD_HEADER_PATTERN.test(line)) {
      section = "method";
      continue;
    }
    if (isIngredientSectionHeader(line)) {
      section = "ingredients";
      continue;
    }
    if (section === "method") {
      methodLines.push(stripStepMarker(line));
      continue;
    }
    if (section === "tips") {
      tipLines.push(line.replace(TIP_MARK_PATTERN, "").replace(BULLET_PATTERN, "").trim());
      continue;
    }
    if (isBullet) {
      items.push(toIngredientFromText(line.replace(BULLET_PATTERN, "")));
      continue;
    }
    if (section === "ingredients") {
      splitNames(line).forEach((name) => items.push(toIngredientFromText(name)));
      continue;
    }
    // 正文区的散行：第一行当标题（标题行不含冒号，避免把「调味料：盐」当标题）
    if (!title && !line.startsWith("#") && !line.includes("：") && !line.includes(":")) {
      title = line.replace(/^#+\s*/, "").trim();
    }
  }

  const steps = methodLines.filter(Boolean);
  const numberedMethod = steps
    .map((line, index) => (steps.length > 1 ? `${index + 1}. ${line}` : line))
    .join("\n");
  const tips = tipLines.filter(Boolean);
  const method = tips.length
    ? `${numberedMethod}\n\n小贴士：\n${tips.join("\n")}`.trim()
    : numberedMethod;

  // 同名同用量的重复项只保留一个（如烤蔬菜和酱料里都出现「盐 3 克」）
  const dedupedItems = items.filter(
    (item, index, all) => all.findIndex((other) => other.name === item.name && other.amount === item.amount) === index,
  );

  return createImportDraft({
    title,
    ingredients: dedupedItems,
    method,
    rawText: text.trim(),
    parseFailed: !title || !dedupedItems.length || !steps.length,
  });
};

// ---------- 主入口：「食材：」行优先，其次按分段式解析 ----------
export const parseRecipeImportText = (text: string): ImportDraft[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const ingredientLineIndexes = lines.reduce<number[]>((indexes, line, index) => {
    if (/^食材\s*[:：]/.test(line)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  if (!text.trim()) {
    return [createImportDraft({ rawText: text, parseFailed: true })];
  }

  if (ingredientLineIndexes.length === 0) {
    return [parseSectionedRecipe(text)];
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

    // 食材与调味料分开解析（同一段内），调味料行的解析范围到做法行或下一个食材块为止；
    // 「食材：」行里的名称也按词表自动归类（盐、酱油等落到调味料，与批量脚本一致）
    const blockEnd = methodLineIndex >= 0 ? methodLineIndex : nextIngredientLineIndex;
    const foodIngredients = splitNames(textAfterField(lines[ingredientLineIndex], "食材")).map((name) =>
      toIngredientFromText(name),
    );
    const seasoningIngredients = lines
      .slice(ingredientLineIndex + 1, blockEnd)
      .filter((line) => /^调味料\s*[:：]/.test(line))
      .flatMap((line) => splitNames(textAfterField(line, "调味料")).map((name) => toIngredientFromText(name, "调味料")));

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
