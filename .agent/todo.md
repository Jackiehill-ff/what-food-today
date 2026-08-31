# Todo

## 已完成（2026-09-01）

- [x] 首页"今天的菜单"改为与食谱库相同的卡片展示（菜名 + 食材名称）。
- [x] 食谱卡片名称下方只展示食材名称（不含调味料、不含数量），空格分隔。
- [x] 食谱编辑模式支持食材/调味料排序（上移/下移按钮，移动端可用）。
- [x] 清理 `src/styles.css` 死样式；`npm run build` + `cap sync` + Gradle 重新打包 APK（`what-food-today.apk` 已更新）。

## 当前阶段：封装安卓 APK（Capacitor）

- [x] 新增导出/导入 JSON 数据功能（侧栏"数据"面板；App 内导出用 Filesystem+Share，浏览器用下载）。
- [x] 安装 JDK 17 + JDK 21（Homebrew）、Android SDK（cmdline-tools + platform-tools + android-35 + build-tools 35.0.0）。
- [x] 安装 `@capacitor/core|cli|android|filesystem|share`，`cap init` / `cap add android` / `cap sync` 完成。
- [x] Gradle 构建通过（JDK 21 运行 Gradle；Gradle 发行版走腾讯镜像、Maven 依赖走阿里云镜像）。
- [x] APK 产物：`android/app/build/outputs/apk/debug/app-debug.apk`，根目录副本 `what-food-today.apk`（debug 签名）。
- [x] `.gitignore` 忽略 android 构建产物与 APK。
- [x] 移动端布局：≤980px 隐藏侧栏，改为底部 Tab 导航（首页/菜单/导入/食谱/采购/我的，短标签），"我的"页收纳账号与数据面板；内容区加底部安全区内边距。APK 已重新打包。
- [x] 食材分类改为两类（食材/调味料）+ 单位下拉（无/g/tsp），旧数据自动迁移；食谱库卡片改为「菜名+食材名称」；首页手机端卡片紧凑化（无头浏览器诊断验证无溢出、底部导航正常）。
- [x] 导入脚本 `scripts/build-recipes-json.mjs`：flomo 文本 → recipes.json（食材/调味料分开，用量可选），也支持从 App 导出 JSON 归一化；测试通过。
- [x] 用用户提供的 flomo 文本生成正式 `recipes.json`（源文本存于 `scripts/flomo-export-2026-09-01.txt`；共 122 条笔记 → 163 个食谱，蔬菜 54 / 主食蛋白质 109；重写 `scripts/build-recipes-json.mjs` 的 flomo 解析：按笔记切分、分类提取、括号感知切分、调味料自动识别、名称去量词、字段别名 + 手工覆盖 34 条异构笔记）。
- [ ] 用户在手机上安装验证新布局；如需正式版再打 release（需签名 keystore）。

## 当前阶段：菜单计划改版（日视图 + 弹窗勾选 + 统一清单）

- [x] 数据模型：`MealPlanEntry` 移除 `slotId`，同一天按数组顺序排列（新增靠后）；`AppState.mealSlots` 移除；`ShoppingListItem.date` 保留字段但不再用于分组。
- [x] 迁移：`appStorage.loadAppState` 迁移旧 mealPlan（去 slotId，旧数据按 早餐→午餐→晚餐 顺序重排为数组顺序）。
- [x] 删除：`FIXED_MEAL_SLOTS`、`DEFAULT_SLOT_TIMES`、`getSlotTime`、`getMealDateTime`、`findNextMeal`、`NextMeal`、周视图 helper（`getWeekStart`/`getWeekDays`/`shiftWeek`/`WeekDay`）、采购候选（`buildShoppingCandidates`/`groupShoppingCandidates`/`ShoppingCandidate*`）。
- [x] 新增日视图 helper：`getTodayKey`、`shiftDay(dateKey, offset)`、`getPlannedRecipesForDate(mealPlan, date)`（按数组顺序）、`formatDayHeader`。
- [x] 计划页改日视图：默认今天，前一天/后一天/回到今天；一天一个列表，菜按顺序排列；搜索候选最多 8 个（`.slice(0, 8)`）。
- [x] 弹窗勾选：选完食谱立即弹窗，列出该食谱食材，勾选缺少的 → "加入已选"写入统一采购清单（sourceLabel=食谱名），支持全选。
- [x] 采购清单：移除候选面板；移除手动添加的日期选择；正式清单统一展示（不按天分组，按分类排序），"复制整周"改"复制清单"。
- [x] 首页：改为"今天的菜单"（当天已安排食谱按顺序展示 + 去安排入口）。
- [x] 清理 dead code 与文案；`npm run build` 通过；冒烟测试（迁移/日视图/清单排序）通过。
- [x] Review 后同步 Supabase schema 草案和 `.agent/context.md`，移除旧餐次/采购候选描述，云端菜单草案改为 `date` + `recipe_id` + `position`。
- [ ] 浏览器手动验收（见 `docs/daily-menu-checklist.md`）。

## 功能核对（2026-06-24 检查，未改代码）

- [x] ① 食谱上传/编辑：标准模板已实现（名称/分类/食材/调味料/做法/备注）；"上传"仅文本粘贴，无文件/图片上传。
- [x] ② 菜单计划：周计划网格按"天×餐次"搜索选择食谱（多选），已实现。
- [x] ③ 备菜清单：候选生成+勾选加入已实现；但无"选完食谱立即弹窗"交互，需去采购清单 tab 手动勾选。
- [x] ④ 以天为单位：数据层已按天（mealPlan/shoppingItems 均带 date，采购清单按天分组）；无"当天"专属视图，整体为周视图。
- [x] ⑤ App 封装 + 安卓：未实现（无 Capacitor/PWA/APK 构建，仅有 GitHub Pages 网页版）。

## 下一阶段：账号 + 云同步

- [x] 在不改变现有功能和 UI 行为的前提下，拆分 `src/App.tsx` 的类型、常量、存储层和纯业务 helper，为后续账号、云同步、数据迁移建立架构边界。
- [x] 在 `.agent/context.md` 说明主要数据类型的新位置，并补充 `Recipe` / `AppState` 核心字段的中文含义。
- [x] 确认账号方案和服务选择：第一版采用 Supabase Auth + Supabase Postgres + RLS。
- [ ] 设计未登录、本地使用、登录后同步之间的产品流程。
- [x] 定义云端数据模型草案，覆盖食谱、导入记录、菜单计划、采购清单，并补充 RLS policy 草案。
- [ ] 设计本地 `meal-planner-app-v1` 到云端数据的迁移流程。
- [ ] 设计首次登录时本地数据和云端数据的合并策略。
- [ ] 设计跨设备冲突策略，包括同一食谱、同一菜单计划、同一采购项被多端修改的情况。
- [ ] 设计离线编辑和恢复联网后的同步策略。
- [ ] 设计同步失败提示、重试和回滚行为。
- [x] 增加账号入口，但保持未登录用户可继续使用本地功能。
- [x] 实现前先补充同步相关测试或手动验收清单。

## 当前分支：账号基础设施

- [x] 引入 `@supabase/supabase-js`，通过 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY` 初始化客户端。
- [x] 未配置 Supabase 环境变量时自动降级为纯本地模式。
- [x] 实现邮箱 Magic Link 登录入口、session 监听和退出登录；退出后不清理本地数据。
- [x] 新增 `meal-planner-sync-v1` 同步元数据和非破坏性本地备份 helper。
- [x] 新增本地/云端数据访问边界；云端 adapter 仅为占位，不做自动同步。
- [x] 补充 Supabase SQL/RLS 草案和手动验收清单。
- [x] 构建通过：`npm run build`。

## 开发约束

- [x] 修改代码前先阅读 `README.md`、`.agent/context.md`、`.agent/todo.md`。
- [x] 不删除数据库。
- [x] 不修改部署配置，除非用户明确要求。
- [x] 每完成任务后更新 `.agent/todo.md` 和 `.agent/changelog.md`。

## 验收重点

- [ ] 老用户本地食谱不丢失。
- [ ] 老用户菜单计划不丢失。
- [ ] 老用户采购清单不丢失。
- [ ] 未登录状态仍可使用现有功能。
- [ ] 登录后不会无提示覆盖本地数据。
- [ ] 构建通过：`npm run build`。
