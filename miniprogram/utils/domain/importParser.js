const { createId, createTimestamp } = require("./ids");
const { createBlankItem } = require("./recipes");

// ---------- 调味料识别（与 scripts/build-recipes-json.mjs 同源，其余默认食材）----------
const SEASONINGS = [
  // 盐 / 糖 / 酸
  "盐", "海盐", "岩盐", "食用盐", "香草盐",
  "糖", "白糖", "红糖", "冰糖", "赤砂糖", "椰糖", "砂糖", "蜂蜜", "枫糖浆", "糖浆", "味淋", "甜味剂", "椰子糖", "龙舌兰蜜", "龙舌兰糖浆",
  "醋", "白醋", "陈醋", "香醋", "米醋", "苹果醋", "红酒醋", "糙米醋", "寿司醋", "柠檬汁", "青柠汁", "酸粉", "泡菜卤水",
  // 油脂
  "油", "植物油", "菜籽油", "橄榄油", "芝麻油", "香油", "椰子油", "芥花油", "黄油", "牛油果油", "红油", "食用油",
  // 酱汁
  "酱油", "生抽", "老抽", "蚝油", "番茄酱", "辣椒酱", "辣豆瓣酱", "豆瓣酱", "黄豆酱", "甜面酱", "芝麻酱",
  "纯芝麻酱", "花生酱", "杏仁酱", "腰果酱", "榛子酱", "鹰嘴豆酱", "韩式辣酱", "腐乳", "老干妈", "麻酱",
  "沙拉酱", "美乃滋", "蛋黄酱", "纯素蛋黄酱", "素食蛋黄酱", "素芝士", "营养酵母", "黄芥末酱", "第戎芥末酱", "青芥末", "芥末", "芥末酱", "香菇素蚝油",
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
  // 蒜姜葱类香辛配菜（酱汁行常写「蒜末」等）
  "蒜末", "蒜泥", "姜末", "葱末", "葱花",
];

const SEASONING_SET = new Set(SEASONINGS);

const isSeasoningName = (name) => {
  const n = (name || "").trim();
  if (!n || n === "牛油果" || n === "油桃") {
    return false;
  }
  if (SEASONING_SET.has(n)) {
    return true;
  }
  // 「苹果醋或柠檬汁」这类并列名：拆开后全部都在调味料名单才归调味料
  const parts = n.split(/[或/／]/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 && parts.every((p) => SEASONING_SET.has(p));
};

const createImportDraft = (recipe = {}) => {
  const namedCount = (recipe.ingredients || []).filter((item) => item.name && item.name.trim()).length;
  return {
    id: createId(),
    title: recipe.title || "",
    type: "full",
    category: "",
    ingredients: recipe.ingredients && recipe.ingredients.length ? recipe.ingredients : [createBlankItem("食材")],
    method: recipe.method || "",
    rawText: recipe.rawText || "",
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    // 标题 / 做法 / 食材缺任何一样都提示补全
    parseFailed: Boolean(recipe.parseFailed) || !namedCount,
  };
};

// ---------- 数量 / 单位（含分数 ½¼¾、区间 1-2、括号备注保留进分量） ----------
const FRACTIONS = "½¼¾⅓⅔⅛⅜⅝⅞⅙⅕";
const NUM_CORE = "(?:[0-9０-９]+(?:[.,．][0-9０-９]+)?|[" + FRACTIONS + "]|半)";
const RANGE = NUM_CORE + "(?:\\s*[-－–—~～至]\\s*" + NUM_CORE + ")?";
const AMOUNT_WORDS = "少许|适量|若干|数片|数个|数块|数根|几滴|几片|几个|几根|几块|几勺|几瓣|几段|一小撮|一撮|一小把|一大把";
const UNITS =
  "毫克|公斤|千克|毫升|大勺|小勺|大匙|小匙|茶匙|汤匙|人份|小段|小把|大把|小块|大片|小片|克|斤|两|升|勺|匙|朵|根|段|块|片|个|把|份|盒|碗|杯|条|颗|粒|滴|瓣|只|张|包|支|罐|袋|卷|枚|套|串|盘|撮|截|头|板|扇|kg|KG|mg|MG|ml|ML|g|G|l|L";

// 「名称 + 数量(单位) + (括号备注)」整体匹配：分量连同备注一起保留，信息不丢
const NAME_AMOUNT_PATTERN = new RegExp(
  "^(.*?)(" + RANGE + "|" + AMOUNT_WORDS + ")(?:\\s*(" + UNITS + "))?(?:\\s*[（(]([^（）()]*)[）)])?\\s*$",
  "u",
);
// 整段就是用量（「适量」「2人份」「3大勺（自制）」）
const AMOUNT_ONLY_PATTERN = new RegExp(
  "^(?:" + RANGE + "|" + AMOUNT_WORDS + ")\\s*(?:" + UNITS + ")?(?:\\s*[（(][^（）()]*[）)])?\\s*$",
  "u",
);

// 做法行：带标签，或「1.」「1、」「①」「第一步」「【第一步】」等编号开头
const STEP_LINE_PATTERN =
  /^(?:做法|步骤|作法)\s*[:：]|[0-9０-９]+\s*[.、．)）]|[①②③④⑤⑥⑦⑧⑨⑩]|【?第[一二三四五六七八九十百]+[步，.、】]/;

// 小节标签行：「标签：内容」，标签不含分隔符且不超过 8 字（「中式烧烤：葱、蒜…」等自定义小节）
const SECTION_LABEL_PATTERN = /^([^\s、，,;；＋+：:]{1,8})\s*[:：]\s*(.*)$/u;

// 看起来是操作说明而非食材名的文字（食材列表里混入的说明不当作食材）
const INSTRUCTION_HINT_PATTERN =
  /调到|调至|调成|拌匀|搅拌均匀|搅打|煮至|煮开|焯烫|焯水|翻炒|腌制|腌渍|备用|即可|就可以|切碎|切丁|切片|切丝|切段|清洗|冲洗|浸泡/;

// 「难度：简单」这类元信息标签
const META_LABEL_PATTERN = /^(难度|时间|分量|份量|人数|热量|卡路里|小贴士|提示|备注|说明)$/;

// flomo 笔记的噪音行：分隔线、#标签、参考链接、时间戳（可带【n】序号前缀）
const isNoiseLine = (line) =>
  /^[-=＝_*]{3,}$/.test(line) ||
  /^#/.test(line) ||
  /https?:\/\/|www\./.test(line) ||
  /^[0-9０-９]{4}[-/.年]/.test(textWithoutIndexMarker(line));

// 纯文本兜底路径的整体跳过行（flomo 导出的页眉等）
const SKIP_LINE_PATTERN = /^[-=＝_*]{3,}$|^#|^导出时间|^共\s*[0-9０-９]+\s*条|^食谱笔记/;
const isContentLine = (line) => Boolean(line) && !SKIP_LINE_PATTERN.test(line) && !isNoiseLine(line);

// 标题候选行：去掉开头的【n】序号标记后再判断（纯标记行不是标题）
const textWithoutIndexMarker = (line) => line.trim().replace(/^【[^】]*】\s*/, "");

// ---------- 小节头识别：关键词可带【】包裹、括号说明、半/全角冒号，也可不带冒号独占一行 ----------
const HEADER_KINDS = [
  { kind: "ingredient", words: ["食材", "主料", "材料", "原料", "配料"] },
  { kind: "seasoning", words: ["调味料", "调料", "酱料"] },
  {
    kind: "method",
    words: ["做法", "做法步骤", "步骤", "作法", "制作方法", "制作步骤", "烹饪方法", "烹饪步骤", "怎么做"],
  },
  { kind: "notes", words: ["小贴士", "贴士", "提示", "关键提醒", "提醒", "注意事项", "注意", "备注", "说明", "心得"] },
];

const keywordKind = (word) => {
  const w = (word || "").trim();
  for (let i = 0; i < HEADER_KINDS.length; i += 1) {
    if (HEADER_KINDS[i].words.indexOf(w) >= 0) {
      return HEADER_KINDS[i].kind;
    }
  }
  return "";
};

// 返回 { kind, rest } 或 null。无冒号时仅当整行只有关键词（可带括号说明，如「食材（2人份）」「做法」）才算小节头
const matchSectionHeader = (line) => {
  const s = (line || "").trim();
  if (!s) {
    return null;
  }
  // 【做法步骤】 这类被方括号包裹的小节头
  const bracket = s.match(/^【([^【】]{1,8})】\s*[:：]?\s*(.*)$/u);
  if (bracket) {
    const kind = keywordKind(bracket[1]);
    if (kind && !(bracket[2] && bracket[2].trim())) {
      return { kind, rest: (bracket[2] || "").trim() };
    }
    return null;
  }
  const m = s.match(/^([^\s：:（）()]{1,6})(?:[（(][^（）()]*[）)])?\s*([:：])?\s*(.*)$/u);
  if (!m) {
    return null;
  }
  const kind = keywordKind(m[1]);
  if (!kind) {
    return null;
  }
  const rest = (m[3] || "").trim();
  // 「食材：土豆、萝卜」「食材（2人份）」「食材」都是头；「食材君自备」这种后面直接跟文字的不是
  if (!m[2] && rest) {
    return null;
  }
  return { kind, rest };
};

const isIngredientHeaderLine = (line) => {
  const header = matchSectionHeader(line);
  return Boolean(header) && header.kind === "ingredient";
};
const isMethodHeaderLine = (line) => {
  if (/^(?:做法|步骤|作法)\s*[:：]/.test(line)) {
    return true;
  }
  const header = matchSectionHeader(line);
  return Boolean(header) && header.kind === "method";
};
const isNotesHeaderLine = (line) => {
  const header = matchSectionHeader(line);
  return Boolean(header) && header.kind === "notes";
};

// 无冒号的自定义子节头：「纯素酱汁」「沙拉汁」「糖水」等，需下一行像「名称 数量」的列表项才认定
const SUB_HEADER_PATTERN = /^[^0-9０-９\s，,、。:：;；！？]{1,6}(?:酱汁|酱料|沙拉汁|调味汁|淋酱|糖水|卤水|酱|汁)$/;
const isSubHeaderLine = (line, nextLine) => {
  const s = (line || "").trim();
  if (!s || !nextLine || s.length < 3 || s.length > 8) {
    return false;
  }
  if (!SUB_HEADER_PATTERN.test(s) || SEASONING_SET.has(s)) {
    return false;
  }
  const next = splitNameAmount(nextLine);
  return Boolean(next.name && next.amount);
};

const findPreviousIndex = (lines, startIndex, predicate) => {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (predicate(lines[index], index)) {
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

const findNextContentIndex = (lines, startIndex, endIndex) => {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (lines[index]) {
      return index;
    }
  }
  return -1;
};

// ---------- 名称/用量拆分（括号感知，分量连同括号备注保留） ----------
const stripBullets = (raw) => {
  let n = (raw || "").trim();
  n = n.replace(/^[•·*\-–—]+\s*/u, "").trim();
  n = n.replace(/[。．]+\s*$/u, "").trim();
  n = n.replace(/[：:]+\s*$/u, "").trim();
  return n;
};

const stripNameDecorations = (raw) => {
  let n = stripBullets(raw);
  if (!n) {
    return n;
  }
  let prev;
  do {
    prev = n;
    n = n.replace(/[（(][^（）()]*[）)]\s*$/u, "").trim();
  } while (n !== prev);
  n = n.replace(/等\s*$/u, "").trim();
  return n;
};

// 去掉全部括号注释后判断是否像一句话说明（而不是食材行/标题）
const stripAllParenNotes = (s) => s.replace(/[（(][^（）()]*[）)]/g, "");
const looksLikeProse = (line) => {
  const bare = stripAllParenNotes(line).trim();
  if (!bare) {
    return true;
  }
  if (/[。！？?!]/.test(bare)) {
    return true;
  }
  if (INSTRUCTION_HINT_PATTERN.test(bare)) {
    return true;
  }
  if (/这种|之类的|什么的|比较推荐/.test(bare)) {
    return true;
  }
  // 顿号/逗号枚举（「海带、清水、葱伴侣韩式辣酱…」）是列表不是散文
  if (/[、，,；;]/.test(bare)) {
    return false;
  }
  return bare.length > 30;
};

// 「盐：适量」→ { head: 盐, tail: 适量 }；没有冒号或名称过长时返回 null
const colonSplit = (text) => {
  const idx = text.search(/[：:]/);
  if (idx < 0) {
    return null;
  }
  const head = text.slice(0, idx).trim();
  const tail = text.slice(idx + 1).trim();
  if (!head || head.length > 8 || !tail) {
    return null;
  }
  return { head, tail };
};

const isAmountOnly = (text) => Boolean(text) && AMOUNT_ONLY_PATTERN.test(text.trim());

// 「土豆 300克（黄心，去皮切块）」→ { name: 土豆, amount: 300克（黄心，去皮切块）, note: 黄心，去皮切块 }
// 没有可拆的用量时：短而无分隔符的括号别名并进名称（植物奶（豆奶）），长说明剥掉
const splitNameAmount = (raw) => {
  const s = stripBullets(raw);
  if (!s) {
    return { name: "", amount: "", note: "" };
  }
  const m = s.match(NAME_AMOUNT_PATTERN);
  if (m) {
    const name = (m[1] || "").trim();
    // 名称里括号不配平说明分量匹配穿进了括号注释（「橄榄油（比例10:1:30）」），放弃拆分
    const opens = (name.match(/[（(]/g) || []).length;
    const closes = (name.match(/[）)]/g) || []).length;
    if (name && opens === closes) {
      const core = (m[2] || "").trim();
      const unit = m[3] || "";
      const note = (m[4] || "").trim();
      const amount = core + unit + (note ? "（" + note + "）" : "");
      return { name, amount, note };
    }
  }
  const bare = stripNameDecorations(s);
  if (!bare) {
    return { name: "", amount: "", note: "" };
  }
  const noteMatch = s.match(/[（(]([^（）()]*)[）)]\s*$/u);
  const note = noteMatch ? noteMatch[1].trim() : "";
  const keepAlias = note && note.length <= 10 && !/[、，,；;：:]/.test(note);
  if (keepAlias) {
    return { name: s, amount: "", note: "" };
  }
  // 括号在中间时（「日式菠菜沙拉（菠菜）和风调味酱」）去掉全部括号注释做名称
  const noParen = stripAllParenNotes(s).trim();
  if (noParen && noParen.length <= 14) {
    return { name: noParen, amount: "", note: "" };
  }
  return { name: bare, amount: "", note: "" };
};

// ---------- 括号感知的名称切分（「、，,;；＋+」分隔，括号内不切） ----------
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
    if ((ch === "、" || ch === "，" || ch === "," || ch === ";" || ch === "；" || ch === "＋" || ch === "+") && depth === 0) {
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

// 「油醋汁（橄榄油、香醋、辣椒粉、盐）」「天贝（生抽1大匙、…）」这类「名（配料列表）」：
// 括号内按分隔符展开成多项食材；主体名太短且不像酱汁/复合菜时保留为一项
const BODY_SUFFIX_PATTERN = /(酱汁|酱料|调味汁|沙拉汁|汁|酱|泥|部分|组合|配方)$/;
const toIngredientItems = (raw, forced) => {
  const s = stripBullets(raw);
  const m = s.match(NAME_AMOUNT_PATTERN);
  if (m) {
    const name = (m[1] || "").trim();
    // 名称里括号不配平说明分量匹配穿进了括号注释（「橄榄油（比例10:1:30）」），放弃拆分
    const opens = (name.match(/[（(]/g) || []).length;
    const closes = (name.match(/[）)]/g) || []).length;
    if (name && opens === closes) {
      return [toIngredient(s, forced)];
    }
  }
  const notes = [];
  (s.match(/[（(][^（）()]*[）)]/g) || []).forEach((seg) => {
    notes.push(seg.slice(1, -1).trim());
  });
  const expandable =
    notes.length > 0 &&
    notes.every((note) => note && /[、，,]/.test(note) && !/或者?|也可以|之类的|这种/.test(note));
  if (expandable) {
    const parts = [];
    notes.forEach((note) => {
      note.split(/[、，,]/).forEach((p) => {
        const frag = p.trim();
        if (frag && frag.length <= 12 && !/[。！？：:]/.test(frag)) {
          parts.push(frag);
        }
      });
    });
    if (parts.length >= 2) {
      const items = [];
      const body = stripAllParenNotes(s).trim();
      if (body && body.length <= 6 && !BODY_SUFFIX_PATTERN.test(body)) {
        items.push(toIngredient(body, forced));
      }
      parts.forEach((p) => items.push(toIngredient(p, forced)));
      return items;
    }
  }
  return [toIngredient(s, forced)];
};

// 碎片里的「名称：用量」也拆开（「调味料：盐：适量」切分后得到「盐：适量」）
const pushCleanedItem = (cleaned, forced, items) => {
  const pair = colonSplit(cleaned);
  if (pair && isAmountOnly(pair.tail)) {
    items.push({ ...createBlankItem(isSeasoningName(pair.head) ? "调味料" : "食材"), name: pair.head, amount: pair.tail });
    return;
  }
  toIngredientItems(cleaned, forced).forEach((item) => items.push(item));
};

// 一段文字拆成食材项：先去括号注释再判断是否操作说明（如「加少量清水调到顺滑状态就可以」不当作食材）
// forced 传 "食材"/"调味料" 强制归类，传 "" 按名称自动识别
const namesToItems = (rawText, forced, items) => {
  splitNames(rawText).forEach((raw) => {
    // 「【面包部分】高筋面粉」这类子节标记不进名称
    const cleaned = stripNameDecorations(raw).replace(/^【[^】]*】\s*/, "");
    if (!cleaned || INSTRUCTION_HINT_PATTERN.test(cleaned)) {
      return;
    }
    pushCleanedItem(raw.replace(/^【[^】]*】\s*/, ""), forced, items);
  });
};

// 「食材：」标签后的内容收集：支持同行 + 多行列表；「纯素酱汁」等子节自动归类；散文说明不当食材
const collectSectionItems = (lines, start, end) => {
  const items = [];
  let section = "食材";
  let sectionStartCount = 0;
  let pendingBlank = false;
  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    if (i === start) {
      const header = matchSectionHeader(line);
      if (header && header.rest) {
        namesToItems(header.rest, "食材", items);
      }
      continue;
    }
    if (!line) {
      pendingBlank = true;
      continue;
    }
    if (isNoiseLine(line)) {
      continue;
    }
    const header = matchSectionHeader(line);
    if (header) {
      pendingBlank = false;
      sectionStartCount = items.length;
      if (header.kind === "ingredient") {
        section = "食材";
        if (header.rest) {
          namesToItems(header.rest, "食材", items);
        }
      } else if (header.kind === "seasoning") {
        section = "调味料";
        if (header.rest) {
          namesToItems(header.rest, "调味料", items);
        }
      } else if (header.kind === "method" || header.kind === "notes") {
        break;
      } else {
        section = "other";
        if (header.rest) {
          namesToItems(header.rest, "", items);
        }
      }
      continue;
    }
    if (STEP_LINE_PATTERN.test(line)) {
      break;
    }
    // 「难度：简单」这类元信息：结束当前列表
    const metaMatch = line.match(SECTION_LABEL_PATTERN);
    if (metaMatch && META_LABEL_PATTERN.test(metaMatch[1])) {
      section = "";
      pendingBlank = false;
      continue;
    }
    // 空行后接说明文字：结束自动收集（等下一个小节头）
    if (pendingBlank && items.length > sectionStartCount && looksLikeProse(line)) {
      section = "";
    }
    pendingBlank = false;
    // 无冒号子节头：「纯素酱汁」
    const nextContent = findNextContentIndex(lines, i + 1, end);
    if (nextContent >= 0 && isSubHeaderLine(line, lines[nextContent])) {
      section = "other";
      continue;
    }
    // 带冒号的自定义小节：「酱汁参考：…」「中式烧烤：葱、蒜…」；说明文字（以句号结尾的长句）不当食材
    const labelMatch = metaMatch;
    if (labelMatch) {
      const label = labelMatch[1];
      const rest = (labelMatch[2] || "").trim();
      sectionStartCount = items.length;
      if (rest && isAmountOnly(rest)) {
        items.push({ ...createBlankItem(isSeasoningName(label) ? "调味料" : "食材"), name: label, amount: rest });
        section = "";
      } else if (rest && looksLikeProse(rest)) {
        section = "";
      } else {
        section = "other";
        if (rest) {
          namesToItems(rest, "", items);
        }
      }
      continue;
    }
    if (!section || looksLikeProse(line)) {
      continue;
    }
    namesToItems(line, section === "调味料" ? "调味料" : section === "食材" ? "食材" : "", items);
  }
  return items;
};

// ---------- 纯文本块解析（无「食材：」标签时：标题行 + 一行一个食材 + 编号做法） ----------
const parsePlainChunk = (content) => {
  if (!content.length) {
    return null;
  }
  // 标题：第一个像标题的行；都不是（续块、无标题粘贴）则标题留空
  let titleIndex = -1;
  for (let i = 0; i < Math.min(content.length, 3); i += 1) {
    if (isTitleLike(content[i], content[i + 1])) {
      titleIndex = i;
      break;
    }
  }
  const title = titleIndex >= 0 ? stripCircledPrefix(textWithoutIndexMarker(content[titleIndex])) : "";
  const scanStart = titleIndex >= 0 ? titleIndex + 1 : 0;

  const ingredients = [];
  const methodLines = [];
  // 小节状态："" = 按名称自动识别，"食材"/"调味料" = 强制，"method" = 做法，"notes" = 提示备注
  let section = "";
  for (let i = scanStart; i < content.length; i += 1) {
    const line = content[i];
    if (STEP_LINE_PATTERN.test(line)) {
      methodLines.push(textAfterMethodPrefix(line));
      section = "method";
      continue;
    }
    const header = matchSectionHeader(line);
    if (header) {
      if (header.kind === "ingredient") {
        section = "食材";
        if (header.rest) {
          namesToItems(header.rest, "食材", ingredients);
        }
      } else if (header.kind === "seasoning") {
        section = "调味料";
        if (header.rest) {
          namesToItems(header.rest, "调味料", ingredients);
        }
      } else if (header.kind === "method") {
        section = "method";
        if (header.rest) {
          methodLines.push(header.rest);
        }
      } else if (header.kind === "notes") {
        section = "notes";
      } else {
        section = "";
      }
      continue;
    }
    const labelMatch = line.match(SECTION_LABEL_PATTERN);
    if (labelMatch) {
      const label = labelMatch[1];
      const rest = (labelMatch[2] || "").trim();
      if (META_LABEL_PATTERN.test(label)) {
        continue;
      }
      if (rest && isAmountOnly(rest)) {
        ingredients.push({ ...createBlankItem(isSeasoningName(label) ? "调味料" : "食材"), name: label, amount: rest });
      } else if (rest && looksLikeProse(rest)) {
        // 「主食部分：面包，最好是…。」说明性小节，内容留在原始文本里
        section = "notes";
      } else {
        section = "other";
        if (rest) {
          namesToItems(rest, "", ingredients);
        }
      }
      continue;
    }
    if (section === "method") {
      methodLines.push(line);
      continue;
    }
    if (section === "notes") {
      continue;
    }
    const nextContent = findNextContentIndex(content, i + 1, content.length);
    if (nextContent >= 0 && isSubHeaderLine(line, content[nextContent])) {
      section = "other";
      continue;
    }
    if (looksLikeProse(line)) {
      continue;
    }
    namesToItems(line, section === "调味料" ? "调味料" : "", ingredients);
  }

  // 既没有食材也没有做法的块（纯说明文字、导出文件页眉）不生成草稿
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

const textAfterMethodPrefix = (line) =>
  line
    .replace(/^(?:【第[一二三四五六七八九十百]+步】\s*|(?:【?[^】]{0,6}】?)?\s*(?:做法|步骤|作法)\s*[:：]?\s*)/, "")
    .trim();

// ---------- 分块：【n】序号 / 「菜谱一」前缀 / ①②③子菜谱 / 空行切块，续块（首行不像标题）并回前一块 ----------
const INDEX_MARKER_PATTERN = /^【[0-9０-９]+】/;
const RECIPE_PREFIX_PATTERN = /^(?:菜谱|食谱)\s*[一二两三四五六七八九十0-9０-９]+\s*[:：]?$/;
const CIRCLED_PREFIX_PATTERN = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]\s*/;
const SUB_RECIPE_PATTERN = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]\s*\S+\s*$/;
const stripCircledPrefix = (t) => (t || "").replace(CIRCLED_PREFIX_PATTERN, "");

// 「①泰式做法」「②姜黄豆腐三明治」这类子菜谱标题行：整行 = 序号 + 名称，
// 且下一行是小节头/「XX：」标签/同款序号行（区别于「① 苹果切好…」这种步骤行）
const isSubRecipeTitle = (line, nextLine) => {
  if (!line || !SUB_RECIPE_PATTERN.test(line)) {
    return false;
  }
  if (!nextLine) {
    return false;
  }
  if (SUB_RECIPE_PATTERN.test(nextLine)) {
    return true;
  }
  if (matchSectionHeader(nextLine) || SECTION_LABEL_PATTERN.test(nextLine)) {
    return true;
  }
  return false;
};

const isTitleLike = (line, nextLine) => {
  const raw = (line || "").trim();
  const t = textWithoutIndexMarker(raw);
  if (!t || isNoiseLine(raw)) {
    return false;
  }
  if (isSubRecipeTitle(t, nextLine)) {
    return true;
  }
  if (INDEX_MARKER_PATTERN.test(raw)) {
    return false;
  }
  if (matchSectionHeader(t)) {
    return false;
  }
  if (STEP_LINE_PATTERN.test(t)) {
    return false;
  }
  if (RECIPE_PREFIX_PATTERN.test(t)) {
    return false;
  }
  if (/^(难度|时间|分量|份量|人数|热量|卡路里)\s*[:：]/.test(t)) {
    return false;
  }
  if (looksLikeProse(t)) {
    return false;
  }
  if (t.length > 30) {
    return false;
  }
  // 「番茄 2个」这种带分量的行是食材行不是标题
  const na = splitNameAmount(t);
  if (na.amount) {
    return false;
  }
  return true;
};

const nextNonBlankLine = (lines, index) => {
  for (let i = index + 1; i < lines.length; i += 1) {
    if (lines[i]) {
      return lines[i];
    }
  }
  return "";
};

const splitIntoChunks = (lines) => {
  const blocks = [];
  let current = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (INDEX_MARKER_PATTERN.test(line)) {
      if (current.length) {
        blocks.push(current);
      }
      current = [];
      continue;
    }
    if (RECIPE_PREFIX_PATTERN.test(line)) {
      if (current.length) {
        blocks.push(current);
      }
      current = [];
      continue;
    }
    if (!line) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    // ①②③ 子菜谱标题：强切新块（行本身保留）
    if (isSubRecipeTitle(line, nextNonBlankLine(lines, i))) {
      if (current.length) {
        blocks.push(current);
      }
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.length) {
    blocks.push(current);
  }

  // 过滤噪音行后，首行不像标题的块并回前一块（跨空行的食材/做法续行）；
  // 但【n】序号强切出来的块永远独立（序号行被当噪音过滤后块首可能不是标题）
  const chunks = [];
  blocks.forEach((block, blockIndex) => {
    const forcedSplit = INDEX_MARKER_PATTERN.test(block[0] || "");
    const content = block.filter(isContentLine);
    if (!content.length) {
      return;
    }
    if (blockIndex > 0 && !forcedSplit && !isTitleLike(content[0], content[1])) {
      chunks[chunks.length - 1].push(...content);
      return;
    }
    chunks.push(content);
  });
  return chunks;
};

// ---------- 带标签块的解析（块内有「食材：/食材（2人份）」头，一个块可含多个食谱） ----------
const parseLabeledChunk = (lines) => {
  const headerIndexes = [];
  lines.forEach((line, index) => {
    if (isIngredientHeaderLine(line)) {
      headerIndexes.push(index);
    }
  });
  if (!headerIndexes.length) {
    return [];
  }

  return headerIndexes.map((ingredientLineIndex, recipeIndex) => {
    // 真机 JS 引擎不支持 ?? 语法，改用显式判断（索引 0 是合法值，不能用 ||）
    const nextIngredientLineIndex =
      recipeIndex + 1 < headerIndexes.length ? headerIndexes[recipeIndex + 1] : lines.length;
    const titleLineIndex = findPreviousIndex(lines, ingredientLineIndex - 1, (line, index) =>
      isTitleLike(line, lines[index + 1] || ""),
    );
    const title = titleLineIndex >= 0 ? stripCircledPrefix(textWithoutIndexMarker(lines[titleLineIndex])) : "";
    const nextTitleLineIndex =
      recipeIndex + 1 < headerIndexes.length
        ? findPreviousIndex(lines, headerIndexes[recipeIndex + 1] - 1, (line, index) =>
            isTitleLike(line, lines[index + 1] || ""),
          )
        : -1;
    const methodLineIndex = findNextIndex(lines, ingredientLineIndex + 1, nextIngredientLineIndex, isMethodHeaderLine);
    const methodEndBase =
      nextTitleLineIndex > methodLineIndex && methodLineIndex >= 0 ? nextTitleLineIndex : nextIngredientLineIndex;
    // 做法 到「小贴士/关键提醒」或下一个标题为止（提示保留在原始文本里）
    const notesIndex =
      methodLineIndex >= 0 ? findNextIndex(lines, methodLineIndex + 1, methodEndBase, isNotesHeaderLine) : -1;
    const methodEndIndex = notesIndex >= 0 ? notesIndex : methodEndBase;
    const methodHeader = methodLineIndex >= 0 ? matchSectionHeader(lines[methodLineIndex]) : null;
    const firstMethodLine = methodHeader ? methodHeader.rest : methodLineIndex >= 0 ? textAfterMethodPrefix(lines[methodLineIndex]) : "";
    const method =
      methodLineIndex >= 0
        ? [firstMethodLine, ...lines.slice(methodLineIndex + 1, methodEndIndex).filter(isContentLine)]
            .filter(Boolean)
            .join("\n")
        : "";

    // 食材收集范围：到做法标签、下一个食谱标题或下一个「食材：」为止
    let blockEnd = nextIngredientLineIndex;
    if (methodLineIndex >= 0 && methodLineIndex < blockEnd) {
      blockEnd = methodLineIndex;
    }
    if (nextTitleLineIndex >= 0 && nextTitleLineIndex < blockEnd) {
      blockEnd = nextTitleLineIndex;
    }
    const ingredients = collectSectionItems(lines, ingredientLineIndex, blockEnd);

    // 原始文本含块内标题前的行（如「3款三明治」总名行），信息不丢
    const rawStartIndex = titleLineIndex >= 0 ? 0 : ingredientLineIndex;
    const rawEndIndex = methodEndBase > rawStartIndex ? methodEndBase : nextIngredientLineIndex;

    return createImportDraft({
      title,
      ingredients,
      method,
      rawText: lines.slice(rawStartIndex, rawEndIndex).join("\n"),
      parseFailed: !title || !method,
    });
  });
};

// ---------- 主入口：先按【n】/「菜谱一」/空行分块（续块并回），块内有食材头走标签解析，否则纯文本兜底 ----------
const parseRecipeImportText = (text) => {
  if (!text || !text.trim()) {
    return [createImportDraft({ rawText: text || "", parseFailed: true })];
  }
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const chunks = splitIntoChunks(lines);

  const drafts = [];
  chunks.forEach((chunk) => {
    const hasIngredientHeader = chunk.some(isIngredientHeaderLine);
    const chunkDrafts = hasIngredientHeader ? parseLabeledChunk(chunk) : [parsePlainChunk(chunk)].filter(Boolean);
    chunkDrafts.forEach((draft) => drafts.push(draft));
  });
  if (drafts.length) {
    return drafts;
  }
  return [createImportDraft({ rawText: text, parseFailed: true })];
};

module.exports = { createImportDraft, parseRecipeImportText };
