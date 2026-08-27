# Changelog

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

- 食谱数据模型已迁移到 `title`、`type`、`category`、`ingredients`、`method`、`rawText` 等字段。
- 保留旧数据兼容迁移，旧字段只作为迁移输入。
- 已支持简单食谱和完整食谱。
- 已支持导入中心：粘贴文本、解析多个食谱、编辑预览、保存到食谱库。
- 已支持首页最近一餐：自动选择未来最近餐次，跳过过去餐次。
- 已支持周计划：按早餐、午餐、晚餐安排食谱。
- 已支持采购候选流程：从周计划生成候选，用户勾选后加入正式采购清单。
- 已支持手动添加采购项，未选择日期时进入“未指定”。

## 最近主分支记录

- `e23566f` Merge recover extra changes
- `edf3149` Polish recipe labels and plan inputs
- `d7f2f3f` Sync manual recipe and plan feedback
- `936a3d8` Recover extra feature changes on current model
- `a3d4753` Merge integration/v1 for v0.2.0
- `111195a` Integrate import center with recipe model
- `ca16819` Add shopping candidate workflow
- `833344f` Add simple recipe support
