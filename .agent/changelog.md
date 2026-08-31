# Changelog

## 2026-09-01（首页菜单展示 + 食材排序 + 卡片摘要）

- 首页"今天的菜单"改为与食谱库相同的卡片展示（菜名 + 食材名称），保留空态"去安排"入口；卡片"查看食谱"进入编辑。
- 食谱卡片名称下方只展示食材（不含调味料），仅显示名称（不含数量/单位），用空格分隔；新增 `getRecipeIngredientSummary` helper 并统一用于食谱库与首页卡片。
- 食谱编辑模式新增食材/调味料排序：每行增加上移/下移按钮，调整同一分类内的顺序（移动端同样可用）；`reorderRecipeItem` 在 `ingredients` 数组内与同分类相邻项交换。
- 清理 `src/styles.css` 中首页旧详情卡片遗留的死样式（`next-meal-card/main/meta/section/items/steps/actions`），仅保留仍在使用的 `next-meal-empty`。
- `npm run build` 通过；`npx cap sync android` + Gradle `assembleDebug`（JDK 21）重新打包 APK，根目录 `what-food-today.apk` 已更新。

## 2026-09-01（flomo 食谱批量导入）

- 用用户提供的 flomo 导出文本（122 条笔记，`scripts/flomo-export-2026-09-01.txt`）生成正式 `recipes.json`：共 163 个食谱（蔬菜 54 / 主食蛋白质 109），可直接在「数据 → 导入」导入。
- 重写 `scripts/build-recipes-json.mjs` 的 flomo 解析，替换原「按食材行切分」的粗糙逻辑：
  - 按 `【N】` 笔记标记切分，并从标签 `#03Resource/植物领先/分类食谱/蔬菜|主食蛋白质` 提取食谱分类。
  - 括号感知的食材名切分（`、`/`,` 切分不穿透 `（）`），避免「鹰嘴豆茄子泥（茄子、熟鹰嘴豆…）」被拆碎。
  - 调味料自动识别：内置调味料词表（盐/糖/酱/油/香料/发酵/增稠等），「食材：」中混入的盐、酱油、醋等自动归为「调味料」；蒜/姜/葱/辣椒等辛香食材仍归「食材」。
  - 名称清理：去掉结尾的数量/单位（含范围 `3-4 朵`、`1.5 大勺`、`半根`）、结尾句号、`等`。
  - 字段别名：`调味/调料/酱料/沙拉汁/汤底/麻酱/油醋汁/沙拉酱/花生酱沙拉汁/无油腰果蛋黄酱/配菜` 等行均纳入食材解析。
  - 做法识别兼容 `做法①：`、`做法二：`；做法文本去除 Ref/URL/`- ` 重复清单/`搭配：` 等噪音。
  - 手工覆盖 34 条异构笔记（无「食材：」的纯文本、集合型清单、`❶❷❸`/`①②③` 分步、`饼皮/面饼/豆腐部分` 多栏、`做法一/二`、`搭配①/②` 等），保证 122 条笔记全部落到结构化食谱且标题正确。
  - 同一食谱内食材按名称去重；`--app` 模式（从 App 导出 JSON 归一化）保持不变。
- 旧的两条测试数据（番茄炒蛋/清蒸鲈鱼）被正式食谱库替换。

## 2026-06-24（分类/单位/卡片/脚本 改版）

- 食材分类改为两类：`Category = "食材" | "调味料"`，替换原 蔬菜/豆类/谷类/调料/其他；`normalizeCategory` 自动迁移旧分类（调料→调味料，其余→食材）；`appStorage` 同时迁移采购项的旧分类。
- 单位改为下拉选择：`UNIT_OPTIONS = ["", "g", "tsp"]`（无/克/茶匙），可后续扩展。
- 食谱库卡片改为「菜名 + 食材名称」（仅名称，顿号连接）；编辑模式的分类下拉只剩 食材/调味料，单位下拉 g/tsp。
- 导入解析器 `importParser` 支持 `调味料：` 字段，导入草稿自动区分食材与调味料。
- 首页"今天的菜单"手机端紧凑化（卡片内边距/字号/芯片缩小）；底部导航改用短标签（菜单/导入/食谱/采购）。
- 新增 `scripts/build-recipes-json.mjs`：flomo 文本 → `recipes.json`（食材/调味料分开、用量可选），或从 App 导出 JSON 归一化；可直接被「数据 → 导入」使用。
- 用无头 Edge + CDP 在 390px 视口诊断验证：无横向溢出、卡片全宽、底部导航与各 tab 正常、迁移正确。
- APK 已重新打包：`what-food-today.apk`。

## 2026-06-24（移动端布局修复）

- Review 修复：`docs/supabase-schema.sql` 的菜单计划表移除旧 `slot_id`，增加 `position` 表达同一天菜单顺序；同步 `.agent/context.md` 旧餐次/采购候选描述。
- 手机端（≤980px）隐藏侧栏，新增底部 Tab 导航：首页 / 菜单 / 导入 / 食谱 / 采购 / 我的；`Tab` 类型新增 `"me"`。
- 新增"我的"页：复用侧栏深色卡片样式展示品牌、账号面板、数据面板。
- 内容区底部加安全区内边距（`env(safe-area-inset-bottom)`），避免被底部导航遮挡。
- APK 已重新打包：`what-food-today.apk`。

## 2026-06-24（APK 打包完成）

- Gradle `assembleDebug` 构建成功，产出 `android/app/build/outputs/apk/debug/app-debug.apk`（根目录副本 `what-food-today.apk`，4.2MB，debug 签名）。
- 打包要点：Gradle 需以 JDK 21 运行（Capacitor 8 插件要求 Java 21 编译），`gradle.properties` 配置 `org.gradle.java.installations.paths` 指向两个 JDK；Gradle 发行版改用腾讯镜像，Maven 依赖加阿里云镜像。
- `.gitignore` 增加 Capacitor/Android 构建产物与 `*.apk` 忽略规则。
- 待用户手机安装验证；正式版需 release 签名。

## 2026-06-24（导出/导入 + Capacitor 封装进行中）

- 新增侧栏"数据"面板：导出 JSON 备份 / 从备份文件导入（替换式，带确认）；浏览器端用下载，App 端（Capacitor）用 Filesystem + Share 保存/分享文件。
- 抽取 `migrateAppState(parsed)` 复用迁移逻辑（`appStorage.ts`），导入文件时同样经过兼容迁移。
- 安装打包环境：JDK 17（Homebrew）、Android SDK（cmdline-tools + platform-tools + android-35 + build-tools 35.0.0）、`@capacitor/core|cli|android|filesystem|share`。
- `npx cap init`（appId `com.jackiehill.whatfoodtoday`，webDir `dist`）、`cap add android`、`cap sync android` 完成。
- 因网络无法访问 services.gradle.org，Gradle 发行版改用腾讯镜像，Maven 依赖加阿里云镜像（`android/build.gradle`、`gradle-wrapper.properties`）。

## 2026-06-24（菜单计划改版实现）

- 数据模型：`MealPlanEntry` 移除 `slotId`；`AppState.mealSlots`、`MealSlot`、`NextMeal`、`ShoppingCandidate*`、`WeekDay`、`ShoppingGroup` 等类型删除；`ShoppingListItem.date` 保留字段但不再用于分组。
- 迁移：`appStorage.loadAppState` 将旧 mealPlan 去 `slotId` 并按 早餐→午餐→晚餐 顺序重排为数组顺序；食谱旧字段迁移不变。
- 领域层：删除餐次推断与周视图 helper（`getSlotTime`/`getMealDateTime`/`findNextMeal`/`getWeekStart`/`getWeekDays`/`shiftWeek`）和采购候选生成/分组；新增 `getTodayKey`/`shiftDay`/`formatDayHeader`/`getPlannedRecipesForDate` 与统一清单排序 `sortShoppingItems`（分类→未勾选优先→时间）。
- UI：菜单计划页改为单日视图（默认今天，前一天/后一天/回到今天），一天一个列表按顺序排列；搜索候选最多 8 个；选完食谱立即弹出食材勾选弹窗（默认不勾选、支持全选），勾选缺少的食材直接加入统一采购清单；采购清单页移除候选面板与手动添加的日期选择，改为单一清单；首页改为"今天的菜单"。
- 验证：`npm run build` 通过；临时冒烟测试覆盖 旧数据迁移 / 日视图 helper（含跨月跨年）/ 统一清单排序，全部通过；新增 `docs/daily-menu-checklist.md` 手动验收清单。

## 2026-06-24（菜单计划改版方案确认，未改代码）

- 确认改版方案：取消周视图与餐次划分，计划页改单日视图（默认今天，可切前一天/后一天）；搜索候选最多 8 个；选完食谱立即弹窗勾选缺少食材加入清单；正式采购清单不再按天分组，只保留统一清单；首页改为"今天的菜单"。
- 数据模型决策：`MealPlanEntry` 去 `slotId`，同一天按数组顺序排列；`mealSlots`/`shoppingItems.date` 保留字段仅作旧数据兼容；旧 mealPlan 迁移时按 早餐→午餐→晚餐 顺序重排。
- 移除采购候选面板（弹窗统一入口）与手动添加的日期选择；暂不封装 APP。

## 2026-06-24（功能核对）

- 对照用户五项需求核对现有实现（未改代码）：①食谱标准模板+编辑已实现，"上传"仅文本粘贴；②周计划搜索选择食谱已实现；③采购候选勾选加入已实现，但无选菜后立即弹窗；④数据层按天，周视图无"当天"专属视图；⑤App 封装/安卓上传未实现，需 PWA 或 Capacitor。
- `npm run build` 通过。

## 2026-06-24

- 在 `feature/auth-foundation` 上引入 `@supabase/supabase-js`，新增 Supabase 客户端初始化、Auth session 监听、邮箱 Magic Link 登录和退出登录基础能力。
- 未配置 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 时，应用继续以纯本地模式运行，不影响 `meal-planner-app-v1`。
- 新增侧栏账号入口和同步状态展示；退出登录默认保留本地数据。
- 新增 `meal-planner-sync-v1` 同步元数据、本地备份 helper、同步队列/冲突/迁移状态类型。
- 新增 `src/data/appStateRepository.ts` 作为本地/云端数据访问边界；当前 App 仍使用本地 adapter，云端 adapter 不做自动同步。
- 新增 `docs/supabase-schema.sql` 和 `docs/auth-foundation-checklist.md`，记录 Supabase 表结构、RLS policy 草案和手动验收清单。
- 更新 README 和 `.agent/context.md`；`npm run build` 已通过。

## 2026-06-22

- 拆分 `src/App.tsx` 中集中的领域类型、固定常量、本地存储读写与兼容迁移、导入解析、周计划日期/最近一餐、采购候选和采购分组 helper。
- 新增 `src/data/appStorage.ts` 作为可替换的数据访问边界，当前仍使用 `localStorage` 和原有 `meal-planner-app-v1` key。
- 保持现有功能和 UI 行为不变，未实现账号、云同步或新数据库；`npm run build` 已通过。
- 补充 `.agent/context.md` 中主要数据类型的新位置，以及 `Recipe` / `AppState` 核心字段的中文含义。
- 新增 agent 交接文档体系：根目录 `AGENTS.md` 和 `.agent/` 知识库。
- 梳理账号 + 云同步开发前的项目现状、关键决策、待办和历史变更。
- 明确后续开发不能直接废弃或覆盖本地 `meal-planner-app-v1` 数据。

## 当前已实现能力

- 食谱数据模型已迁移到 `title`、`type`、`category`、`ingredients`、`method`、`rawText` 等字段；食材分类为 食材/调味料，单位可选 无/g/tsp。
- 保留旧数据兼容迁移，旧字段只作为迁移输入。
- 已支持简单食谱和完整食谱。
- 已支持导入中心：粘贴文本、解析多个食谱、编辑预览、保存到食谱库；支持 `scripts/build-recipes-json.mjs` 批量生成后导入。
- 已支持首页"今天的菜单"：按添加顺序展示当天已安排食谱，空态引导去菜单计划。
- 已支持菜单计划（单日视图）：默认今天，可切前一天/后一天；搜索添加食谱后弹出食材勾选弹窗，直接加入采购清单。
- 已支持统一采购清单：不按日期分类，按分类排序，来自弹窗勾选和手动添加。
- 已支持移动端底部 Tab 导航和"我的"页。
- 已支持 APK 打包（Capacitor + Android debug）。

## 最近主分支记录

- `e23566f` Merge recover extra changes
- `edf3149` Polish recipe labels and plan inputs
- `d7f2f3f` Sync manual recipe and plan feedback
- `936a3d8` Recover extra feature changes on current model
- `a3d4753` Merge integration/v1 for v0.2.0
- `111195a` Integrate import center with recipe model
- `ca16819` Add shopping candidate workflow
- `833344f` Add simple recipe support
