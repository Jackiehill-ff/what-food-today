import { createId, createTimestamp } from "./ids";
import { createBlankItem } from "./recipes";
import { isSeasoningName, SEASONING_WORDS } from "./seasoningNames";
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

// ---------- 从做法步骤中提取食材 ----------
// 场景一：食材段漏写、只在做法里出现的调味料——按词表锚定提取（认得紧邻的用量），几乎不误报；
// 场景二：原文完全没有食材信息——从做法里提取所有紧跟用量的短词作为兜底，预览里可改可删。
const VERB_TOKENS = [
  "加入", "倒入", "放入", "撒入", "淋入", "烹入", "调入", "添入", "注入", "抹上", "刷上", "涂上", "裹上", "放上", "打成", "分成", "切成", "打入", "撕成", "压成",
  "加", "倒", "放", "淋", "撒", "取", "用", "备", "盛", "舀", "泡", "浸", "抹", "刷", "涂", "抓",
];
const TRAILING_ACTIONS = [
  "翻炒", "炒匀", "拌炒", "煸炒", "爆香", "爆炒", "煎至", "炸至", "烤至", "炒出", "炒香", "炒到", "炒散",
  "煮开", "烧开", "炖煮", "焖煮", "腌制", "腌好", "搅打", "搅散", "打散", "搅拌", "混合", "揉匀", "揉至",
  "静置", "放凉", "冷藏", "备用", "即可", "出锅", "盛起", "稍微", "稍许", "调味", "提味", "提鲜",
  "适量", "少许", "若干",
];
const METHOD_NAME_STOPWORDS = new Set([
  "锅", "火", "大火", "中火", "小火", "火力", "火候", "水温", "油温", "温度", "分钟", "小时", "秒钟",
  "表面", "锅底", "锅边", "碗里", "模具", "烤箱", "冰箱", "盘子", "铲子", "纸巾", "厨房纸",
]);
// 名称候选切段：标点/空白/括号/引号，数字也算切段（同一行多个「名称+用量」时各取各的）
const NAME_DELIMITER_PATTERN = /[、，,；;：:\s0-9０-９.．（）()【】「」“”]/u;
const LEADING_CONNECTOR_PATTERN = /^(?:和|或|与|跟|及|还有|再加上?|配上|加上?)+/u;

// 用量前紧邻的名称候选：按标点/空白切段后，砍掉最后一个动词之前的部分（「转小火加入生抽」→ 生抽）
const cutAfterLastVerb = (segment: string) => {
  let cut = 0;
  for (const verb of VERB_TOKENS) {
    const index = segment.lastIndexOf(verb);
    if (index >= 0) {
      cut = Math.max(cut, index + verb.length);
    }
  }
  return segment.slice(cut).replace(LEADING_CONNECTOR_PATTERN, "");
};

// 用量后紧邻的名称候选：砍掉从第一个动作词开始的部分（「生抽翻炒至出香味」→ 生抽）
const cutAtTrailingAction = (chunk: string) => {
  let cut = chunk.length;
  for (const action of TRAILING_ACTIONS) {
    const index = chunk.indexOf(action);
    if (index >= 0 && index < cut) {
      cut = index;
    }
  }
  return chunk.slice(0, cut).replace(LEADING_CONNECTOR_PATTERN, "");
};

const isValidMinedName = (name: string) => {
  if (!name || name.length > 6 || METHOD_NAME_STOPWORDS.has(name)) {
    return false;
  }
  if (/^[0-9０-９]+$/.test(name)) {
    return false;
  }
  // 单字名称只保留调味料词表能命中的（盐/糖/醋…），散文里孤立的单字基本都是动词碎片
  return name.length > 1 || isSeasoningName(name);
};

const createMinedItem = (name: string, amount: string): Ingredient => ({
  ...createBlankItem(isSeasoningName(name) ? "调味料" : "食材"),
  name,
  amount,
  unit: "",
});

const amountAtStart = (text: string) => {
  const match = text.match(new RegExp(`^\\s*(${AMOUNT_PATTERN.source})`, "i"));
  return match?.[1] ?? "";
};

const amountAtEnd = (text: string) => {
  const match = text.match(new RegExp(`(${AMOUNT_PATTERN.source})\\s*$`, "i"));
  return match?.[1] ?? "";
};

const looseAmountAtStart = (text: string) => {
  const match = text.match(/^\s*各?\s*(适量|少许|若干)/u);
  return match?.[1] ?? "";
};

// 词表锚定的调味料扫描：名称前后紧跟着用量（「生抽2勺」「2勺生抽」「盐适量」）就算命中；
// 长词优先、按字符区间去重，避免「黄油」命中后再把里面的「油」重复算一次
const scanSeasoningsFromMethod = (lines: string[], found: Map<string, Ingredient>) => {
  for (const line of lines) {
    const occurrences: { word: string; index: number }[] = [];
    for (const word of SEASONING_WORDS) {
      for (let index = line.indexOf(word); index >= 0; index = line.indexOf(word, index + 1)) {
        occurrences.push({ word, index });
      }
    }
    occurrences.sort((a, b) => b.word.length - a.word.length);
    const occupied: [number, number][] = [];
    for (const { word, index } of occurrences) {
      if (found.has(word)) {
        continue;
      }
      const end = index + word.length;
      if (occupied.some(([start, stop]) => index < stop && end > start)) {
        continue;
      }
      const after = line.slice(end);
      const before = line.slice(0, index);
      const amount = amountAtStart(after) || looseAmountAtStart(after) || amountAtEnd(before);
      if (amount) {
        found.set(word, createMinedItem(word, amount));
        occupied.push([index, end]);
      }
    }
  }
};

// 「名称+用量」兜底扫描：只认紧跟用量的短词，名称可以出现在用量前（「生抽2勺」）或后（「100克面粉」）
const scanAmountItemsFromMethod = (lines: string[], found: Map<string, Ingredient>) => {
  for (const line of lines) {
    for (const match of line.matchAll(new RegExp(AMOUNT_PATTERN.source, "gi"))) {
      const index = match.index ?? 0;
      if (bracketDepthAt(line, index) !== 0) {
        continue;
      }
      const amount = match[0].trim();
      const before = line.slice(0, index);
      // 同一行里更早的用量（含单位）先砍掉，避免上一个单位字符混进名称（「200克和淡奶油」→ 淡奶油）
      const earlier = [...before.matchAll(new RegExp(AMOUNT_PATTERN.source, "gi"))].pop();
      const afterEarlier = earlier ? before.slice((earlier.index ?? 0) + earlier[0].length) : before;
      let name = cutAfterLastVerb(afterEarlier.split(NAME_DELIMITER_PATTERN).filter(Boolean).pop() ?? "");
      if (!isValidMinedName(name)) {
        name = cutAtTrailingAction(line.slice(index + match[0].length).split(NAME_DELIMITER_PATTERN)[0] ?? "");
      }
      if (!isValidMinedName(name) || found.has(name)) {
        continue;
      }
      found.set(name, createMinedItem(name, amount));
    }
  }
};

export const extractIngredientsFromMethod = (methodLines: string[], hasItems: boolean): Ingredient[] => {
  const lines = methodLines.map(stripStepMarker).filter(Boolean);
  const seasonings = new Map<string, Ingredient>();
  scanSeasoningsFromMethod(lines, seasonings);
  const amountItems = new Map<string, Ingredient>();
  if (!hasItems) {
    scanAmountItemsFromMethod(lines, amountItems);
  }
  // 「淡奶油100毫升」会先被词表里的「油」抢走用量：名称互为包含且用量相同时，去掉被包含的短词
  const extras = [...amountItems.values()].filter((item) => !seasonings.has(item.name));
  const kept = [...seasonings.values()].filter(
    (item) => !extras.some((other) => other.name !== item.name && other.name.includes(item.name) && other.amount === item.amount),
  );
  return [...kept, ...extras];
};

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

  // 做法补充：食材段漏写的调味料按词表补全；一个食材都没有时从做法兜底提取
  const namedItems = dedupedItems.filter((item) => item.name.trim());
  const minedItems = extractIngredientsFromMethod(steps, namedItems.length > 0).filter(
    (item) => !namedItems.some((existing) => existing.name === item.name),
  );
  const ingredients = [...dedupedItems, ...minedItems];

  return createImportDraft({
    title,
    ingredients,
    method,
    rawText: text.trim(),
    parseFailed: !title || !ingredients.some((item) => item.name.trim()) || !steps.length,
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

    // 做法补充：只在做法里出现的调味料按词表补全；食材段为空时从做法兜底提取
    const baseItems = [...foodIngredients, ...seasoningIngredients];
    const namedItems = baseItems.filter((item) => item.name);
    const minedItems = extractIngredientsFromMethod(method ? method.split(/\r?\n/) : [], namedItems.length > 0).filter(
      (item) => !namedItems.some((existing) => existing.name === item.name),
    );

    return createImportDraft({
      title,
      ingredients: [...baseItems, ...minedItems],
      method,
      rawText: lines.slice(rawStartIndex, rawEndIndex).join("\n"),
      parseFailed: !title || !method,
    });
  });
};
