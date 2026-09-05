// 把图片映射文件里搜到的成品图
// 下载（或本地路径直接读取）→ 压缩（macOS sips，最长边 240px / JPEG q55）→ base64 写入 recipes.json。
//
// 可续跑：已有 image 的食谱跳过；原图和处理后小图缓存在 scripts/recipe-images/cache/。
// 补图：往映射文件加 { "食谱名": { url } } 再跑一次即可。
//
// 用法：node scripts/apply-recipe-images.mjs [映射文件.json]
//       （默认 scripts/recipe-images/search-results.json；flomo 提取结果用 flomo-images.json）
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const RECIPES_PATH = join(ROOT, "recipes.json");
const IMAGES_DIR = join(ROOT, "scripts", "recipe-images");
const CACHE_DIR = join(IMAGES_DIR, "cache");
const RESULTS_PATH = process.argv[2] ? process.argv[2].replace(/^\/+/, "/") : join(IMAGES_DIR, "search-results.json");

// 240px 缩略图：卡片 84px / 计划卡 56px / 编辑页预览 168px 都够用，
// 且 163 张全嵌 base64 后 recipes.json 导入 localStorage（≈2.6M 字符上限）不会爆配额。
const MAX_SIDE = 240;
const JPEG_QUALITY = 55;

const download = async (url, dest) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 2048) {
    throw new Error(`文件过小 (${buffer.length}B)`);
  }
  writeFileSync(dest, buffer);
};

// sips 输出 JPEG；webp/png 等都会被转码
const compress = (source, dest, maxSide = MAX_SIDE, quality = JPEG_QUALITY) => {
  execFileSync(
    "sips",
    ["-Z", String(maxSide), "-s", "format", "jpeg", "-s", "formatOptions", String(quality), source, "--out", dest],
    { stdio: "pipe" },
  );
};

const cacheName = (url) => url.split("/").pop() || "img";

// 缓存键带上路径哈希：flomo 不同日期目录里可能有同名文件
const cacheKey = (url) => {
  const hash = createHash("md5").update(url).digest("hex").slice(0, 8);
  return `${cacheName(url).replace(/\.[a-z0-9]+$/i, "")}-${hash}`;
};

const isLocalPath = (url) => url.startsWith("/");

const processImage = async (url) => {
  // 本地路径（flomo 导出图片）直接作原图，无需下载
  const rawPath = isLocalPath(url) ? url : join(CACHE_DIR, `raw-${cacheKey(url)}`);
  const jpgPath = join(CACHE_DIR, `${cacheKey(url)}.jpg`);

  if (!isLocalPath(url) && !existsSync(rawPath)) {
    await download(url, rawPath);
  }
  if (!existsSync(jpgPath)) {
    compress(rawPath, jpgPath);
  }
  let jpeg = readFileSync(jpgPath);
  if (jpeg.length > 40 * 1024) {
    // 细节多的图一次压不够，逐步缩小再压
    for (const [side, quality] of [
      [208, 46],
      [180, 40],
    ]) {
      compress(rawPath, jpgPath, side, quality);
      jpeg = readFileSync(jpgPath);
      if (jpeg.length <= 40 * 1024) {
        break;
      }
    }
  }
  if (jpeg.length > 40 * 1024) {
    throw new Error(`压缩后仍过大 (${jpeg.length}B)`);
  }
  return { dataUrl: `data:image/jpeg;base64,${jpeg.toString("base64")}`, bytes: jpeg.length };
};

const main = async () => {
  mkdirSync(CACHE_DIR, { recursive: true });
  const data = JSON.parse(readFileSync(RECIPES_PATH, "utf8"));
  const results = JSON.parse(readFileSync(RESULTS_PATH, "utf8"));

  let done = 0;
  let failed = 0;
  let skipped = 0;
  let totalImageBytes = 0;

  for (const recipe of data.recipes) {
    const entry = results[recipe.title];
    if (!entry?.url) {
      continue;
    }
    if (recipe.image) {
      skipped += 1;
      continue;
    }
    try {
      const { dataUrl, bytes } = await processImage(entry.url);
      recipe.image = dataUrl;
      totalImageBytes += bytes;
      done += 1;
      console.log(`ok   ${recipe.title} (${(bytes / 1024).toFixed(1)}KB)`);
    } catch (error) {
      failed += 1;
      console.warn(`fail ${recipe.title}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  writeFileSync(RECIPES_PATH, JSON.stringify(data, null, 2), "utf8");
  console.log(`\n写入 ${done} 张（跳过已有 ${skipped}，失败 ${failed}），图片共 ${(totalImageBytes / 1024).toFixed(0)}KB`);
};

main();
