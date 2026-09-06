# Changelog

## 2026-09-06（Mini-V1 · 代码审查修复）

- 云函数：`login`/`saveProfile` 改为以 openid 作 `_id` 的幂等 upsert（消除并发首登重复用户 + 统一 schema）；加 try/catch + `createCollection` 兜底 + 结构化 `{ok,code,message}` 返回；`saveProfile` 服务端清洗资料（昵称限长 32、头像仅接受 `cloud://`/`https`/空）。
- `me.js`：登录/保存错误透传真实 errMsg；登录结果校验 openid；头像稳定路径覆盖上传 + 清理旧文件；头像守卫改判 `isCloudEnabled`；导出改为异步读图 + `wx.shareFileMessage` 文件分享（不再受剪贴板 ~1MB 限制）；导入去掉不可靠的 `extension` 过滤、改按文件名 `.json` 校验。
- 数据层：`recipes.js` 迁移用 `typeof === "string"` 判定，避免历史数据混入非字符串时抛错导致整份数据被重置；恢复 `??` 语义；`storage.saveAppState` 返回成败、`app.saveState` 失败 toast 提示；`images.js` 修正 MIME 推导、去掉 `/s` 标志、新增 `deleteImageFile` 并在删除食谱/更换图片时清理残留文件。
- `recipe-edit`：图片 MIME 按扩展名推导（不再硬编码 jpeg）；picker 绑定 `value` 索引；删除/换图清理旧本地文件。
- 样式/配置：`modal-mask` 去掉 `inset` 简写改为显式四边；分类圆点加 `max-width` 防溢出；「我的」账号状态标签改为 JS 预计算 `syncTagText`；删除冗余 `miniprogram/project.config.json`（统一用根目录配置，导入须选仓库根目录）。

## 2026-09-06（Mini-V1 · UI 对齐原 APP）

- 配色/字体/图标全面对齐原 APP `styles.css`：主色 `#2f6f57`、次级绿 `#2d4d42`、危险 `#a43e35`、弱化 `#66776d`，卡片 `#fbfcfa`+`#dfe5dc` 边框、输入 `#cfd8ce`、日期条 `#eef5ef`、状态条 `#e4eee5` 等逐一校正；字体补回 Inter + PingFang 等原栈。
- 修复文字显示不全：菜谱卡片标题/摘要/做法/弹窗食材名去掉 `nowrap` 截断，改为换行 + `overflow-wrap: anywhere`；分类圆点「食/调」改回完整「食材/调味料」。
- 搜索框、卡片、缩略图、按钮尺寸对齐原规格（搜索框图标+输入 38px、卡片 14px 内距/8px 圆角、缩略图 84/56px、按钮 38px）。
- 用 lucide 同源路径生成线条图标（`miniprogram/images/icons/`）替换全部 emoji/符号（🥣→汤碗、⋮/✕/🗑/✎/＋/▲▼/↑↓ 等）；tabBar 图标重配色（`#66776d`/`#2f6f57`）。
- `ingredient-popup` 组件改为自包含样式，规避组件样式隔离问题。
- 补充 `project.private.config.json` 到 `.gitignore`；`miniprogram/project.config.json` 加 `cloudfunctionRoot` 支持直接导入 `miniprogram/` 目录。

## 2026-09-06（分支 Mini-V1：原生微信小程序重写 + 微信一键登录）

- 新建分支 `Mini-V1`（AppID `wx603e02387ba0a6e0`），基于主分支最新 APP 版用原生微信小程序重写（WXML/WXSS/JS）。
- 生成小程序图标：`assets/brand/app-icon.svg` / `app-icon-144.png` / `app-icon-1024.png`（黄底 `#f8d46b` + 深绿 `#254139` 汤碗简笔画，即导航栏品牌图标）；生成 tabBar 五枚图标 `miniprogram/images/tabbar/`。
- 移植领域与数据层到 `miniprogram/utils/`（constants/ids/recipes/mealPlan/shopping/search/importParser + storage），沿用 `meal-planner-app-v1` 数据键与迁移逻辑；新增 `images.js`（成品图落盘，规避小程序单 key 1MB 上限）、`presenter.js`、`shoppingOps.js`。
- 微信一键登录：云函数 `cloudfunctions/login`、`cloudfunctions/saveProfile`（云开发，`getWXContext().OPENID` 识别 + `users` 集合登记资料），客户端 `utils/cloud.js` + `我的` 页登录/退出/头像昵称。
- 实现全部五个 tab 页：菜单计划（日视图/加菜/弹窗勾选/改日期/删除/上移下移）、导入中心（粘贴解析）、食谱库（信息流/搜索/分类/展开/加到菜单/编辑/删除）+ 食谱编辑（成品图/食材排序）、采购清单（勾选排序/手动添加/批量删除/复制）、我的（登录/数据导出导入/备份/反馈/统计）。
- 食谱不预置不打包，用户自行导入（「导入中心」或「数据 → 导入」）。
- 新增 `docs/miniprogram-launch.md` 上线指南；所有 JS/JSON 通过语法校验。
- 未改动部署配置（`.github/workflows/`）；未在微信开发者工具内真机联调（需用户在工具内操作，见上线指南）。

## 2026-09-05（清理：过程性文件与远端分支）

- 删除 `scripts/recipe-images/` 全目录（搜索图映射、flomo 映射、41MB 图片缓存）、`dist/`、`android` 构建产物；相关脚本保留，补图流程改为 extract → apply 两步。
- 删除远端 `origin/app-v1`，仅保留本地分支；`main` 为唯一远端分支。

## 2026-09-05（收尾：app-v1 合并 main）

- 手机端验收通过；`app-v1` 合并到 `main` 并推送（GitHub Pages 自动部署新版）。
- 按用户确认删除一次性文件 `scripts/recipe-images/titles.json`（标题清单可随时由 recipes.json 再生成）。
- 局域网 APK 下载服务关闭。

## 2026-09-05（分支 app-v1 · 第三轮：菜单计划 ⋮ 菜单改为「做法 + 修改时间/删除」）

- 菜单计划卡片「⋮」展开面板重排：上方显示完整做法（保留换行，超高可滚动），底部一行放「修改时间（日期选择）」和「删除」按钮（带文字），替换原「改到 + 删除图标」布局。
- `npm run build` 通过；浏览器验证：点开 ⋮ 出做法与两按钮、换行保留、390px 手机宽度截图确认排版无溢出。

## 2026-09-05（分支 app-v1 · 第二轮：flomo 成品图 + 三处 UI 微调）

- 成品图改用 flomo 笔记原图：新增 `scripts/extract-flomo-images.mjs` 解析 flomo HTML 导出（`~/Downloads/flomo@Jack Jiang-20260901`），按标题归一化匹配食谱与笔记，多条命中取「带图且最新」的笔记第一张图，输出 `scripts/recipe-images/flomo-images.json`；`apply-recipe-images.mjs` 支持指定映射文件和本地图片路径（缓存键加路径哈希防同名冲突）。`recipes.json` 清空原搜索图后嵌入 **107/163** 张 flomo 原图（1.59MB），其余 56 个笔记无图按用户要求留空（含泰式/中式炒空心菜、花菜沙拉做法一/二——笔记本身无图）。
- 菜单计划卡片：名称下方只显示「N 食材 · M 调味料」数量，不再列食材/调味料名称；删除 `getRecipeSeasoningSummary` 及相关样式。
- 食谱库卡片：「添加到菜单/编辑/删除」三个图标按钮从卡片行移入展开区，默认隐藏，轻点卡片与做法一起显示。
- 采购清单顶栏：「手动添加/批量删除/复制清单」缩小字号与内距（13px/34px 高）并禁止换行，桌面与 390px 手机宽度下均保持同一行（已截图验证）。
- `npm run build` 通过；浏览器验证：计划卡数量显示、卡片折叠无按钮/展开出三按钮、三按钮同行。

## 2026-09-05（分支 app-v1：成品图 + 卡片改版 + 多关键词搜索 + 采购清单优化）

- 食谱编辑页新增「上传/更换/移除成品图」：`Recipe.image` 字段存压缩后的 data URL（canvas 缩到最长边 480px、JPEG 0.68），新增 `src/domain/images.ts`；`migrateRecipe` 兼容保留 `image`，导入导出 JSON 均不丢图。
- 食谱库卡片改版：左侧展示 84px 成品图（无图显示 Soup 占位），编辑/删除改为纯图标按钮，新增「添加到菜单」图标（CalendarPlus），点开出「今天/明天」选项，加入后同样弹出食材勾选弹窗。
- 菜单计划卡片改版：不显示食谱类型和做法，只显示食材名称 + 调味料名称；左侧 56px 成品图；「更改日期（date input）/删除」收纳进右上「⋮」更多菜单默认隐藏；支持按住手柄拖动排序（pointer 事件，鼠标/触屏通用），`reorderMealPlanEntries` 只重排当天条目、`moveMealPlanEntry` 改日期且目标日去重。
- 搜索栏多关键词：菜单计划与食谱库搜索均按空格切分关键词、全部命中才匹配（`src/domain/search.ts`）；计划搜索提示词改为「想吃什么就告诉我，别客气！」，并把食材名纳入计划搜索范围。
- 采购清单：勾选时间排序——未勾选在前（分类→添加时间），已勾选按勾选时间排后、最新勾选永远最后（`ShoppingListItem.checkedAt`）；新增「批量删除」一键删除全部已勾选项（confirm 确认）；数量+单位与名称同行展示（弹窗内同步）；「复制清单」只复制 `- 名称 数量单位`，不再带勾选标记和分类。
- 食谱成品图批量入库：新增 `scripts/apply-recipe-images.mjs`（下载 `scripts/recipe-images/search-results.json` 中的图片 → sips 压缩 240px/q55 → base64 写入 `recipes.json`，可续跑、带缓存与超限二次压缩）。已为 85/163 个食谱嵌入成品图（搜索词与选图记录见 `search-results.json`；剩余 78 个按用户要求暂停，补图时往该文件加条目重跑脚本即可）。`recipes.json` 从 345KB 增至 1.6MB，低于 Android WebView localStorage ≈2.6M 字符上限。
- `saveAppState` 捕获 localStorage 配额异常（console.error），避免超限时保存崩溃。
- `npm run build` 通过；浏览器冒烟验证：多关键词搜索、加菜弹窗、改日期、拖拽排序、勾选排序、批量删除、复制文本、图片渲染（快照 + 截图）。

## 2026-09-03（导航改版 + 食谱信息流 + 采购弹窗 + 反馈 + 导入 OCR）

- 取消首页：`Tab` 移除 `home`，默认进入「菜单计划」；删除首页组件 `TodayMenu` 与相关死样式（`.home-workspace`/`.today-menu*`）。
- 导航改竖向可收放：桌面侧栏新增折叠按钮（`sidebarCollapsed` 折叠为 76px 图标窄栏，隐藏品牌文字/导航文字/账号/数据/统计）；移动端移除底部固定 Tab，改为左上角汉堡按钮（`.mobile-topbar`）+ 左侧抽屉（`.sidebar.open` + `.sidebar-backdrop`），抽屉内只保留品牌 + 竖向导航。
- 食谱库改信息流优先：默认展示全部食谱卡片（名称 + 基本食材），轻点卡片展开完整做法与「编辑/删除」；「编辑」进入食谱编辑页（原 `RecipeForm`），左上角返回箭头回到信息流；新增「新增食谱」入口。`RecipeFeedCard` 新增，`RecipeForm` 复用为编辑页。
- 采购清单：手动添加改为与「复制清单」同行的按钮，点击弹出原手动添加表单（弹窗内 名称/数量/单位/分类）；`ManualShoppingForm` 组件改为内联弹窗表单并删除。
- 「我的」页新增反馈面板：提交到 GitHub Issues（`/issues/new` 预填标题正文）/ 复制反馈文本（`FeedbackPanel`）。
- 导入中心新增「上传图片识别文字」：引入 `tesseract.js`（懒加载），本地 OCR 中英文（`chi_sim+eng`），结果填入粘贴文本框后再解析。
- 可行性结论：粘贴网址自动抓取因浏览器跨域（CORS）限制，且小红书/抖音/Instagram/YouTube 等有登录墙与反爬，纯前端不可行，暂未实现（见 `.agent/decisions.md`）。
- `npm run build` 通过；tesseract.js 代码分割为懒加载 chunk，worker/core/语言包运行时从 CDN 下载。
- 重新打包 APK：`npx cap sync android` + `./gradlew assembleDebug`（JDK 21），根目录 `what-food-today.apk` 已更新（debug 签名，约 4.35MB）。

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
