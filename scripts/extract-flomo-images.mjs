// 从 flomo HTML 导出里提取「食谱 → 成品图」映射，输出 flomo-images.json。
// 匹配策略：食谱标题（归一化后）出现在笔记正文里即算命中；
// 多条笔记命中时取「带图且时间最新」的一条，取其第一张图。
// 用法：node scripts/extract-flomo-images.mjs <flomo导出目录>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const exportDir = process.argv[2];
if (!exportDir) {
  throw new Error("用法: node scripts/extract-flomo-images.mjs <flomo导出目录>");
}

const html = readFileSync(join(exportDir, "Jack Jiang的笔记.html"), "utf8");
const recipes = JSON.parse(readFileSync(new URL("../recipes.json", import.meta.url), "utf8")).recipes;

// 归一化：去空白、全角转半角括号，便于「花菜沙拉（做法一）」等标题比对
const normalize = (text) =>
  text
    .replace(/[\s（）()·、，,]/g, "")
    .replace(/｜/g, "|")
    .toLowerCase();

const stripHtml = (html) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const memos = html
  .split('<div class="memo"')
  .slice(1)
  .map((block) => {
    const time = block.match(/<div class="time">([^<]+)<\/div>/)?.[1]?.trim() ?? "";
    const contentHtml = block.match(/<div class="content">([\s\S]*?)<\/div>/)?.[1] ?? "";
    const content = stripHtml(contentHtml);
    const images = [...block.matchAll(/<img[^>]+src="([^"]+)"/g)]
      .map((match) => join(exportDir, match[1].replace("file://", "").replace(/^file\//, "file/")))
      .filter((src) => /\.(png|jpe?g|webp)$/i.test(src));
    return { time, content, normalized: normalize(content), images };
  })
  .sort((a, b) => b.time.localeCompare(a.time)); // 新笔记优先

const matches = (memo, title) => {
  const target = normalize(title);
  if (!target) {
    return false;
  }
  if (memo.normalized.includes(target)) {
    return true;
  }
  // 合并型标题（如「豆泥 | 毛豆hummus」）拆开逐段匹配
  const parts = target.split("|").filter(Boolean);
  return parts.length > 1 && parts.every((part) => memo.normalized.includes(part));
};

const result = {};
let withImage = 0;
let noImage = 0;
let unmatched = [];

for (const recipe of recipes) {
  const hit = memos.find((memo) => matches(memo, recipe.title) && memo.images.length > 0);
  if (hit) {
    result[recipe.title] = { url: hit.images[0], caption: `flomo ${hit.time}` };
    withImage += 1;
  } else {
    const anyHit = memos.some((memo) => matches(memo, recipe.title));
    if (anyHit) {
      noImage += 1; // 命中笔记但笔记本身没图
    } else {
      unmatched.push(recipe.title);
    }
  }
}

writeFileSync(
  new URL("./recipe-images/flomo-images.json", import.meta.url),
  JSON.stringify(result, null, 1),
  "utf8",
);
console.log(`带图食谱 ${withImage} / 命中但无图 ${noImage} / 未命中 ${unmatched.length}`);
console.log("未命中标题：", unmatched.join("、"));
