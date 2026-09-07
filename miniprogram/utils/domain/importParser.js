const { createId, createTimestamp } = require("./ids");
const { createBlankItem } = require("./recipes");

// ---------- 调味料识别（与 scripts/build-recipes-json.mjs 同源，其余默认食材）----------
const SEASONINGS = [
  // 盐 / 糖 / 酸
  "盐", "海盐", "岩盐", "食用盐", "香草盐",
  "糖", "白糖", "红糖", "冰糖", "赤砂糖", "椰糖", "砂糖", "蜂蜜", "枫糖浆", "糖浆", "味淋", "甜味剂", "椰子糖",
  "醋", "白醋", "陈醋", "香醋", "米醋", "苹果醋", "红酒醋", "糙米醋", "寿司醋", "柠檬汁", "青柠汁", "酸粉", "泡菜卤水",
  // 油脂
  "油", "植物油", "菜籽油", "橄榄油", "芝麻油", "香油", "椰子油", "芥花油", "黄油", "牛油果油", "红油", "食用油",
  // 酱汁
  "酱油", "生抽", "老抽", "蚝油", "番茄酱", "辣椒酱", "辣豆瓣酱", "豆瓣酱", "黄豆酱", "甜面酱", "芝麻酱",
  "纯芝麻酱", "花生酱", "杏仁酱", "腰果酱", "榛子酱", "鹰嘴豆酱", "韩式辣酱", "腐乳", "老干妈", "麻酱",
  "沙拉酱", "美乃滋", "素芝士", "营养酵母", "黄芥末酱", "第戎芥末酱", "青芥末", "芥末", "芥末酱", "香菇素蚝油",
  // 香辛料 / 粉类
  "胡椒", "胡椒粉", "黑胡椒", "白胡椒", "白胡椒粉", "花椒", "花椒粉", "花椒面", "辣椒粉", "辣椒面",
  "韩式粗辣椒面", "五香粉", "孜然", "孜然粉", "咖喱", "咖喱粉", "姜黄", "姜黄粉", "肉桂粉", "肉豆蔻粉",
  "姜粉", "香叶", "八角", "桂皮", "烟熏辣椒粉", "烟熏甜椒粉", "红椒粉", "大蒜粉", "生蒜粉", "蒜粉",
  "香草精", "抹茶粉", "可可粉", "咖喱叶", "黄芥子",
  // 干制香草
  "罗勒碎", "干罗勒", "干牛至", "迷迭香", "干迷迭香", "百里香", "牛至", "欧芹", "芫荽", "香菜籽", "月桂叶", "意式综合香料", "意式香料",
  // 发酵 / 增稠
  "酵母", "苏打粉", "泡打粉", "淀粉", "玉米淀粉", "水淀粉", "木薯粉",
  "味噌", "白味噌", "红味噌", "味增",
];

const SEASONING_SET = new Set(SEASONINGS);

const isSeasoningName = (name) => {
  const n = (name || "").trim();
  if (!n || n === "牛油果" || n === "油桃") {
    return false;
  }
  return SEASONING_SET.has(n);
};

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

const FIELD_PATTERN = /^(食材|调味料|调料|做法)\s*[:：]/;

// 做法行：带标签，或「1.」「1、」「①」「第一步」等编号开头
const STEP_LINE_PATTERN = /^(?:做法|步骤|作法)\s*[:：]|[0-9０-９]+\s*[.、．)）]|[①②③④⑤⑥⑦⑧⑨⑩]|第[一二三四五六七八九十]+[步，.、]/;

const isIngredientListLine = (line) => /^食材\s*[:：]/.test(line);
const isSeasoningListLine = (line) => /^(调味料|调料)\s*[:：]/.test(line);

// 标题候选行：去掉开头的【n】序号标记后再判断（纯标记行不是标题）
const textWithoutIndexMarker = (line) => line.trim().replace(/^【[^】]*】\s*/, "");

const isValidTitleLine = (line) => {
  const trimmed = textWithoutIndexMarker(line);
  return Boolean(trimmed) && !trimmed.startsWith("#") && !FIELD_PATTERN.test(trimmed);
};

const textAfterField = (line, pattern) => line.replace(pattern, "").trim();
const INGREDIENT_PREFIX = /^食材\s*[:：]\s*/;
const SEASONING_PREFIX = /^(?:调味料|调料)\s*[:：]\s*/;
const METHOD_PREFIX = /^(?:做法|步骤|作法)\s*[:：]?\s*/;

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

// ---------- 名称/用量拆分（括号感知，对齐导入脚本策略） ----------
const AMOUNT_TAIL_PATTERN =
  /([0-9０-９]+[.,．]?[0-9０-９]*(?:[-－–—~～][0-9０-９]+[.,．]?[0-9０-９]*)?|半|少许|适量|若干|数个|数块|一小把|一大把|几滴)\s*(克|g|公斤|千克|斤|两|毫升|ml|升|l|大勺|小勺|大匙|小匙|茶匙|勺|匙|朵|根|段|小段|块|片|个|把|小把|大把|人份|份|盒|碗|杯|条|颗|粒|滴|瓣|只|张|包|支|罐|袋|卷|枚|套|串|盘)?\s*$/u;

const stripNameDecorations = (raw) => {
  let n = (raw || "").trim();
  if (!n) {
    return n;
  }
  n = n.replace(/^[•·*\-–—]+\s*/u, "").trim();
  let prev;
  do {
    prev = n;
    n = n.replace(/[（(][^（）()]*[）)]\s*$/u, "").trim();
  } while (n !== prev);
  n = n.replace(/[。．.]+\s*$/u, "").trim();
  n = n.replace(/等\s*$/u, "").trim();
  return n;
};

// 「番茄 2个」→ { name: 番茄, amount: 2个 }；没有可拆的用量时原样返回
const splitNameAmount = (raw) => {
  const cleaned = stripNameDecorations(raw);
  if (!cleaned) {
    return { name: "", amount: "" };
  }
  const match = cleaned.match(AMOUNT_TAIL_PATTERN);
  if (match && match.index > 0) {
    const name = cleaned.slice(0, match.index).trim();
    if (name) {
      return { name, amount: match[0].trim() };
    }
  }
  return { name: cleaned, amount: "" };
};

// ---------- 括号感知的名称切分（「、，,;；」分隔，括号内不切） ----------
const splitNames = (text) => {
  const parts = [];
  let buf = "";
  let depth = 0;
  for (const ch of text) {
    if (ch === "（" || ch === "(") {
      depth += 1;
    }
    if (ch === "）" || ch === ")") {
      depth = Math.max(0, depth - 1);
    }
    if ((ch === "、" || ch === "，" || ch === "," || ch === ";" || ch === "；") && depth === 0) {
      parts.push(buf);
      buf = "";
    } else {
      buf += ch;
    }
  }
  parts.push(buf);
  return parts.map((s) => s.trim()).filter(Boolean);
};

const toIngredient = (raw, forcedCategory) => {
  const { name, amount } = splitNameAmount(raw);
  // 「调味料：」行强制归调味料；「食材：」行与纯文本行按名称自动识别
  const category = forcedCategory === "调味料" ? "调味料" : isSeasoningName(name) ? "调味料" : "食材";
  return { ...createBlankItem(category), name, amount };
};

const namesToIngredients = (line, prefix, forcedCategory) =>
  splitNames(textAfterField(line, prefix)).map((name) => toIngredient(name, forcedCategory));

// ---------- 纯文本兜底解析（无「食材：」标签时：按空行/【n】分块，一行一个食材） ----------
const SKIP_LINE_PATTERN = /^[-=＝_*]{3,}$|^#|^导出时间|^共\s*[0-9０-９]+\s*条|^食谱笔记/;

const splitIntoBlocks = (lines) => {
  const blocks = [];
  let current = [];
  lines.forEach((line) => {
    if (/^【[0-9０-９]+】/.test(line)) {
      if (current.length) {
        blocks.push(current);
      }
      current = [];
      return;
    }
    if (!line.trim()) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      return;
    }
    current.push(line.trim());
  });
  if (current.length) {
    blocks.push(current);
  }
  return blocks;
};

const parsePlainBlock = (blockLines) => {
  const content = blockLines.filter((line) => !SKIP_LINE_PATTERN.test(line));
  if (!content.length) {
    return null;
  }
  const title = content[0];
  const ingredients = [];
  const methodLines = [];
  content.slice(1).forEach((line) => {
    if (isIngredientListLine(line)) {
      ingredients.push(...namesToIngredients(line, INGREDIENT_PREFIX, "食材"));
      return;
    }
    if (isSeasoningListLine(line)) {
      ingredients.push(...namesToIngredients(line, SEASONING_PREFIX, "调味料"));
      return;
    }
    if (STEP_LINE_PATTERN.test(line)) {
      methodLines.push(textAfterField(line, METHOD_PREFIX));
      return;
    }
    splitNames(line).forEach((name) => {
      if (name) {
        ingredients.push(toIngredient(name, "食材"));
      }
    });
  });

  // 没有任何食材/做法结构的块（如导出文件的说明页眉）不生成草稿
  if (!ingredients.length && !methodLines.length) {
    return null;
  }

  return createImportDraft({
    title,
    ingredients,
    method: methodLines.filter(Boolean).join("\n"),
    rawText: content.join("\n"),
    parseFailed: !title || !methodLines.length,
  });
};

const parsePlainImportText = (lines) => {
  const drafts = splitIntoBlocks(lines)
    .map((block) => parsePlainBlock(block))
    .filter(Boolean);
  if (drafts.length) {
    return drafts;
  }
  return [createImportDraft({ rawText: lines.join("\n"), parseFailed: true })];
};

// ---------- 主入口：优先按「食材：」标签解析，否则走纯文本兜底 ----------
const parseRecipeImportText = (text) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const ingredientLineIndexes = [];
  lines.forEach((line, index) => {
    if (isIngredientListLine(line)) {
      ingredientLineIndexes.push(index);
    }
  });

  if (!text.trim()) {
    return [createImportDraft({ rawText: text, parseFailed: true })];
  }
  if (ingredientLineIndexes.length === 0) {
    return parsePlainImportText(lines);
  }

  return ingredientLineIndexes.map((ingredientLineIndex, recipeIndex) => {
    // 真机 JS 引擎不支持 ?? 语法，改用显式判断（索引 0 是合法值，不能用 ||）
    const nextIngredientLineIndex =
      recipeIndex + 1 < ingredientLineIndexes.length ? ingredientLineIndexes[recipeIndex + 1] : lines.length;
    const titleLineIndex = findPreviousIndex(lines, ingredientLineIndex - 1, isValidTitleLine);
    const title = titleLineIndex >= 0 ? textWithoutIndexMarker(lines[titleLineIndex]) : "";
    const nextTitleLineIndex =
      recipeIndex + 1 < ingredientLineIndexes.length
        ? findPreviousIndex(lines, ingredientLineIndexes[recipeIndex + 1] - 1, isValidTitleLine)
        : -1;
    const methodLineIndex = findNextIndex(lines, ingredientLineIndex + 1, nextIngredientLineIndex, (line) =>
      /^(做法|步骤|作法)\s*[:：]/.test(line),
    );
    const methodEndIndex =
      nextTitleLineIndex > methodLineIndex && methodLineIndex >= 0 ? nextTitleLineIndex : nextIngredientLineIndex;
    const method =
      methodLineIndex >= 0
        ? [textAfterField(lines[methodLineIndex], METHOD_PREFIX), ...lines.slice(methodLineIndex + 1, methodEndIndex)]
            .filter(Boolean)
            .join("\n")
        : "";

    const blockEnd = methodLineIndex >= 0 ? methodLineIndex : nextIngredientLineIndex;
    const foodIngredients = namesToIngredients(lines[ingredientLineIndex], INGREDIENT_PREFIX, "食材");
    const seasoningIngredients = lines
      .slice(ingredientLineIndex + 1, blockEnd)
      .filter((line) => isSeasoningListLine(line))
      .reduce((all, line) => all.concat(namesToIngredients(line, SEASONING_PREFIX, "调味料")), []);

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
