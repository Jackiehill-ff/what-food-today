// 食谱云同步纯逻辑单测（服务端 merge.js + 客户端 recipeSyncCore.js）。
// 仓库根 package.json 为 type:module，两个被测模块是 CommonJS，拷到 /tmp 改名 .cjs 后 require。
// 运行：node scripts/test-recipe-sync.mjs

import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const tmp = mkdtempSync(join(tmpdir(), "recipe-sync-test-"));
cpSync(new URL("../cloudfunctions/recipeSync/merge.js", import.meta.url), join(tmp, "merge.cjs"));
cpSync(
  new URL("../miniprogram/utils/domain/recipeSyncCore.js", import.meta.url),
  join(tmp, "core.cjs"),
);

const { mergeRecipes, sanitizeRecipe } = require(join(tmp, "merge.cjs"));
const core = require(join(tmp, "core.cjs"));

const T1 = "2026-09-20T10:00:00.000Z";
const T2 = "2026-09-21T10:00:00.000Z";
const T3 = "2026-09-22T10:00:00.000Z";
const T4 = "2026-09-23T10:00:00.000Z";
const T5 = "2026-09-24T10:00:00.000Z";
const NOW = "2026-09-26T10:00:00.000Z";

const recipe = (id, updatedAt, extra = {}) => ({
  id,
  title: `菜-${id}`,
  type: "full",
  category: "家常菜",
  ingredients: [{ id: `${id}-i1`, name: "土豆", amount: "1个", unit: "", category: "食材" }],
  method: "步骤一",
  rawText: "",
  image: "",
  createdAt: T1,
  updatedAt,
  ...extra,
});

const liveDoc = (id, updatedAt, r = null) => ({
  recipeId: id,
  deleted: false,
  deletedAt: "",
  updatedAt,
  recipe: r || recipe(id, updatedAt),
});
const tombDoc = (id, deletedAt, r = null) => ({
  recipeId: id,
  deleted: true,
  deletedAt,
  updatedAt: deletedAt,
  recipe: r,
});

let passed = 0;
const failures = [];
const check = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
  } else {
    failures.push(`${name}\n    期望 ${e}\n    实际 ${a}`);
  }
};

// ---------- 服务端 mergeRecipes ----------

// 1. 新设备首推：云端空，本地 2 个食谱 → 写 2 档，无需回传
let r = mergeRecipes({
  serverDocs: [],
  clientLive: [{ id: "a", updatedAt: T1 }, { id: "b", updatedAt: T2 }],
  clientChanged: [recipe("a", T1), recipe("b", T2)],
  clientDeletes: [],
  now: NOW,
});
check("首推写入数", r.writes.length, 2);
check("首推版本", r.versions.length, 2);
check("首推无回传", r.upserts.length, 0);
check("首推无墓碑", r.tombstones.length, 0);

// 2. 空设备首拉：云端 1 个，本地空 → 回传该食谱，不写
r = mergeRecipes({ serverDocs: [liveDoc("a", T1)], clientLive: [], clientChanged: [], clientDeletes: [], now: NOW });
check("首拉回传", r.upserts.map((x) => x.id), ["a"]);
check("首拉无写入", r.writes.length, 0);
check("首拉版本", r.versions, [{ id: "a", updatedAt: T1 }]);

// 3. 本地修改推送：本地 T2 新于云端 T1 → 云端更新，不回传
r = mergeRecipes({
  serverDocs: [liveDoc("a", T1)],
  clientLive: [{ id: "a", updatedAt: T2 }],
  clientChanged: [recipe("a", T2)],
  clientDeletes: [],
  now: NOW,
});
check("本地修改写入", r.writes.length, 1);
check("本地修改不回传", r.upserts.length, 0);
check("本地修改后版本", r.versions, [{ id: "a", updatedAt: T2 }]);

// 4. 云端更新拉取：云端 T2 新于本地 T1（本地无 changed）→ 回传云端版
r = mergeRecipes({
  serverDocs: [liveDoc("a", T2)],
  clientLive: [{ id: "a", updatedAt: T1 }],
  clientChanged: [],
  clientDeletes: [],
  now: NOW,
});
check("云端更新回传", r.upserts.map((x) => x.id), ["a"]);
check("云端更新不写入", r.writes.length, 0);

// 5a. 删除方：本地删除（云端旧版 T1）→ 落墓碑
r = mergeRecipes({
  serverDocs: [liveDoc("a", T1)],
  clientLive: [],
  clientChanged: [],
  clientDeletes: [{ id: "a", deletedAt: T3 }],
  now: NOW,
});
check("删除落墓碑", r.tombstones, [{ id: "a", deletedAt: T3 }]);
check("删除有写入", r.writes.length, 1);
check("删除方无回传", r.upserts.length, 0);

// 5b. 另一设备：本地还在库 → 收到 removes
r = mergeRecipes({
  serverDocs: [tombDoc("a", T3)],
  clientLive: [{ id: "a", updatedAt: T1 }],
  clientChanged: [],
  clientDeletes: [],
  now: NOW,
});
check("墓碑通知删除", r.removes, [{ id: "a", deletedAt: T3 }]);
check("墓碑通知不写入", r.writes.length, 0);

// 6. 删除 vs 云端更新：云端 T5 编辑晚于 T3 删除 → 编辑胜出回传，不落墓碑
r = mergeRecipes({
  serverDocs: [liveDoc("a", T5)],
  clientLive: [],
  clientChanged: [],
  clientDeletes: [{ id: "a", deletedAt: T3 }],
  now: NOW,
});
check("编辑胜出回传", r.upserts.map((x) => x.id), ["a"]);
check("编辑胜出无墓碑", r.tombstones.length, 0);
check("编辑胜出不写入", r.writes.length, 0);

// 7. 删除后本地又编辑（T4 晚于墓碑 T3）→ 复活
r = mergeRecipes({
  serverDocs: [tombDoc("a", T3)],
  clientLive: [{ id: "a", updatedAt: T4 }],
  clientChanged: [recipe("a", T4)],
  clientDeletes: [],
  now: NOW,
});
check("复活写入", r.writes.length, 1);
check("复活无墓碑", r.tombstones.length, 0);
check("复活版本", r.versions, [{ id: "a", updatedAt: T4 }]);
check("复活不回传", r.upserts.length, 0);
check("复活无删除通知", r.removes.length, 0);

// 8. 图片上传失败分叉：本地元数据新（T2）但无 changed → 云端保持 T1 不动，也不回传覆盖本地
r = mergeRecipes({
  serverDocs: [liveDoc("a", T1)],
  clientLive: [{ id: "a", updatedAt: T2 }],
  clientChanged: [],
  clientDeletes: [],
  now: NOW,
});
check("分叉不写入", r.writes.length, 0);
check("分叉不回传", r.upserts.length, 0);
check("分叉版本保持旧值", r.versions, [{ id: "a", updatedAt: T1 }]);

// 9a. 时间戳相同但图片升级为 cloud fileID → 接受客户端
r = mergeRecipes({
  serverDocs: [liveDoc("a", T1)],
  clientLive: [{ id: "a", updatedAt: T1 }],
  clientChanged: [recipe("a", T1, { image: "cloud://env.1234/recipes/o1/a.jpg" })],
  clientDeletes: [],
  now: NOW,
});
check("图片升级写入", r.writes.length, 1);
check("图片升级写入值", r.writes[0].recipe.image, "cloud://env.1234/recipes/o1/a.jpg");

// 9b. 旧图是云文件且被替换 → 进 imageDeletes 清理
r = mergeRecipes({
  serverDocs: [liveDoc("a", T1, recipe("a", T1, { image: "cloud://env.1234/recipes/o1/a-old.jpg" }))],
  clientLive: [{ id: "a", updatedAt: T1 }],
  clientChanged: [recipe("a", T1, { image: "cloud://env.1234/recipes/o1/a-new.jpg" })],
  clientDeletes: [],
  now: NOW,
});
check("旧云图清理", r.imageDeletes, ["cloud://env.1234/recipes/o1/a-old.jpg"]);

// 10. 时间戳相同、图片相同 → 不写
r = mergeRecipes({
  serverDocs: [liveDoc("a", T1, recipe("a", T1, { image: "cloud://x/y.jpg" }))],
  clientLive: [{ id: "a", updatedAt: T1 }],
  clientChanged: [recipe("a", T1, { image: "cloud://x/y.jpg" })],
  clientDeletes: [],
  now: NOW,
});
check("相同不写入", r.writes.length, 0);

// 11. sanitize：非法 id 丢弃、超长字段截断、非法时间戳兜底
check("非法id丢弃", sanitizeRecipe(recipe("含 中文", T1), NOW), null);
const long = sanitizeRecipe(recipe("a", T1, { title: "长".repeat(500), updatedAt: "not-a-date" }), NOW);
check("标题截断", long.title.length, 200);
check("非法updatedAt兜底", long.updatedAt, NOW);
check("非法调味料归类", sanitizeRecipe({ id: "a", ingredients: [{ name: "盐", category: "香料" }] }, NOW).ingredients[0].category, "食材");

// 12. 墓碑时间戳只更新更旧的
r = mergeRecipes({
  serverDocs: [tombDoc("a", T4)],
  clientLive: [],
  clientChanged: [],
  clientDeletes: [{ id: "a", deletedAt: T3 }],
  now: NOW,
});
check("墓碑保持更新时间", r.writes.length, 0);

// 13. 双端同 id 不同食谱（另一端新建同 id）：云端新 → 回传
r = mergeRecipes({
  serverDocs: [liveDoc("a", T2)],
  clientLive: [{ id: "b", updatedAt: T2 }, { id: "a", updatedAt: T1 }],
  clientChanged: [recipe("b", T2)],
  clientDeletes: [],
  now: NOW,
});
check("云端新回传a", r.upserts.map((x) => x.id), ["a"]);

// ---------- 客户端 core ----------

// 14. computeLocalDeletes：快照有、本地无 → 删除
check(
  "本地删除识别",
  core.computeLocalDeletes([recipe("a", T1), recipe("c", T1)], { a: T1, b: T1, c: T1 }),
  [{ id: "b" }],
);
check("无快照不算删除", core.computeLocalDeletes([recipe("a", T1)], null), []);

// 15. applySyncResponse：新增 + 更新 + 删除（联动清 mealPlan）
const applied = core.applySyncResponse({
  recipes: [recipe("a", T1), recipe("b", T1)],
  mealPlan: [{ date: "2026-09-26", recipeId: "b" }, { date: "2026-09-26", recipeId: "a" }],
  upserts: [recipe("a", T2), recipe("c", T2)],
  removes: [{ id: "b", deletedAt: T3 }],
  requestStartedAt: T2,
});
check("应用后数量", applied.recipes.length, 2); // a(更新) + c(新增)，b 删除
check("应用后id", applied.recipes.map((x) => x.id).sort(), ["a", "c"]);
check("应用更新版本", applied.recipes.find((x) => x.id === "a").updatedAt, T2);
check("应用统计", [applied.added, applied.updated, applied.removedIds], [1, 1, ["b"]]);
check("删除联动菜单", applied.mealPlan, [{ date: "2026-09-26", recipeId: "a" }]);
check("有变化标记", applied.changed, true);
check("删除图片回收", applied.removedImages, []); // recipe() 默认 image 为空串 → 不收集，有图才回收

// 16. 请求期间本地又编辑 → 云端版本不覆盖、墓碑不删除
const midflight = core.applySyncResponse({
  recipes: [recipe("a", T5)],
  mealPlan: [],
  upserts: [recipe("a", T4)],
  removes: [{ id: "a", deletedAt: T4 }],
  requestStartedAt: T2,
});
check("请求期间编辑保护", midflight.recipes.map((x) => x.updatedAt), [T5]);

// 17. 本地编辑晚于墓碑 → 保留待下轮复活
const resurrectLocal = core.applySyncResponse({
  recipes: [recipe("a", T4)],
  mealPlan: [],
  upserts: [],
  removes: [{ id: "a", deletedAt: T3 }],
  requestStartedAt: T3,
});
check("编辑晚于删除保留", resurrectLocal.recipes.length, 1);

// 18. 换账号快照作废
const fresh = core.snapshotForUser({ openid: "o1", lastSyncAt: T1, recipes: { a: T1 }, tombstones: {} }, "o2");
check("换账号快照重置", fresh, { openid: "o2", lastSyncAt: "", recipes: {}, tombstones: {} });
const kept = core.snapshotForUser({ openid: "o1", lastSyncAt: T1, recipes: { a: T1 }, tombstones: { b: T2 } }, "o1");
check("同账号快照保留", kept.recipes, { a: T1 });

// 19. 墓碑裁剪：只留一年内、最多 N 条
const tombs = { old: "2024-01-01T00:00:00.000Z", recent: T5, mid: T3 };
check("墓碑按时间裁剪", Object.keys(core.pruneTombstones(tombs, NOW)), ["recent", "mid"]);
check("墓碑按数量裁剪", Object.keys(core.pruneTombstones(tombs, NOW, 365, 1)), ["recent"]);

// 20. buildSnapshot + tombstoneMap
const snap = core.buildSnapshot({
  openid: "o1",
  lastSyncAt: NOW,
  versions: [{ id: "a", updatedAt: T1 }],
  tombstones: core.tombstoneMap([{ id: "b", deletedAt: T3 }]),
});
check("快照构建", snap, { openid: "o1", lastSyncAt: NOW, recipes: { a: T1 }, tombstones: { b: T3 } });

rmSync(tmp, { recursive: true, force: true });

console.log(`通过 ${passed} 项`);
if (failures.length) {
  console.error(`失败 ${failures.length} 项：\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
