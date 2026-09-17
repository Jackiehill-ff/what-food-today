# Changelog

## 2026-09-17（洁癖收尾：文档一致性整理）

- `todo.md` 精简为「当前待办 / 账号云同步设计 / 开发约束 / 验收重点」，历史完成记录统一指向 changelog。
- `decisions.md` 补记 2026-09-17 轮次决策，标注已移除的反馈功能与排序按钮位置变更。
- `docs/daily-menu-checklist.md` 刷新到当前版本（编辑列表化、导入新格式、箭头、图标、统计、导航顺序）。
- `context.md` 功能列表顺序与新导航一致；代码零改动，`npm run build` 通过。

## 2026-09-17（第十一轮：图片编辑只保留移除）

- 编辑页已有成品图时只显示「移除图片」按钮，去掉「换一张」；换图先移除再重新上传。无图时的「上传成品图」入口不变。
- `npm run build` 通过；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第十轮：数量显示调整）

- 编辑页列表不再为空数量显示「无」（只展示已有的信息，空则不显示）；编辑弹窗的数量输入框占位提示由「2」改为「无」。
- `npm run build` 通过；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第九轮：侧栏导航顺序调整）

- 侧栏导航顺序改为：菜单计划 → 食谱库 → 采购清单 → 导入中心 → 我的（导入中心移到「采购清单」之后）。
- `npm run build` 通过；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第八轮：我的页新增统计）

- 「我的」页品牌卡下新增三列统计块（食谱 / 已安排 / 采购项），数据与侧栏统计一致；样式沿用侧栏统计的半透明白块风格（`.me-stats`）。手机端无侧栏时也能看到这些数字。
- `npm run build` 通过；浏览器验证桌面 + 390px 排版；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第七轮：导入中心占位文案）

- 导入中心粘贴文本框的占位文字改为「把你喜欢的食谱复制过来吧～」。
- `npm run build` 通过；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第六轮：勾选弹窗按食材在前、调味料在后排序）

- 添加食谱后弹出的食材勾选弹窗不再按底层数组原样展示（部分食谱食材/调味料交错，显示为乱序），改为与编辑页一致：先食材（原顺序）、后调味料（原顺序）。`getItemsForRecipe` 分组过滤实现，加入采购清单的顺序同步修复。
- `npm run build` 通过；浏览器验证正常数据与人为交错数据两种场景；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第五轮：数量为空显示「无」）

- 编辑页食材/调味料列表的用量摘要在数量为空时显示弱化灰色的「无」（原来不显示任何内容）；弹窗内数量输入框不变。
- `npm run build` 通过；浏览器验证；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第四轮：移除「我的」页反馈功能）

- 删除「我的」页面的反馈面板（GitHub Issues 提交 + 复制文本），`FeedbackPanel` 组件与 `MessageSquare`/`ExternalLink` 图标导入一并移除；页面只保留品牌区、账号面板和数据面板。
- `npm run build` 通过；浏览器验证「我的」页无反馈入口；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第三轮：编辑弹窗去掉单位栏）

- 食谱编辑页的食材/调味料编辑弹窗移除「单位」一栏（只剩 名称 / 数量 / 分类，两列布局）；`UNIT_OPTIONS`/`UNIT_LABELS` 常量随之删除。`Ingredient.unit` 字段保留（旧数据与采购清单展示兼容），列表摘要仍显示「数量+单位」。
- `npm run build` 通过；浏览器验证弹窗排版；APK 重新打包，根目录 `what-food-today.apk` 已更新。

## 2026-09-17（第二轮：编辑页食材列表化 + 计划卡箭头去框）

- 食谱编辑页食材/调味料从「行内多输入框表格」改为紧凑列表：每行只显示「名称 + 用量」摘要和 编辑/删除 两个图标按钮；点编辑（或摘要）弹出编辑框（名称/数量/单位/分类 + 上移/下移/删除 + 完成），修改即时生效；点「添加」直接弹出新项的空编辑框。
- 原行内拖拽换区功能移除，改分类在编辑框的「分类」下拉完成（原 `moveRecipeItem` 与 `RECIPE_ITEM_DRAG_TYPE` 删除）；行内上移/下移按钮移入编辑框。
- 修复：编辑弹窗因改分类自动关闭时残留 `editingItemId`，同一项再移回本区会自己重新弹出（新增 effect 在项不在本区时清状态）。
- 菜单计划卡片展开箭头去掉方框边框，改为无框裸箭头（18px、#819087），与食谱库卡片一致。
- 样式：新增 `.item-list/.item-list-row/.item-summary/.item-edit-grid/.item-edit-reorder/.plan-card-more`，清理 `.item-table/.item-row/.item-reorder/.reorder-button/.item-editor.drag-over` 及 720px 媒体查询里的行内表格适配。
- `npm run build` 通过；浏览器验证：列表排版、编辑/添加/删除/上移/改分类、弹窗重开 bug、390px 手机宽度排版；APK 重新打包，根目录 `what-food-today.apk` 已更新（4.6MB）。

## 2026-09-17（分支 app-v1：分段式食谱导入 + 箭头统一 + App 图标）

- 导入中心支持「分段式」食谱文本（小标题 + 「- 」食材行 + emoji/数字步骤 + 💡Tips），无「食材：」行时自动走新解析路径：首个普通行作标题，冒号短行（如「烤蔬菜：」「Chermoula 酱：」）作为食材小节，`1️⃣`/`1.` 步骤行去编号后重排为 `1. 2. 3.`，`✨` 小贴士收进做法末尾「小贴士：」块；同名同用量重复项去重（烤蔬菜与酱料里的「盐 3 克」只留一份）。
- 新增 `src/domain/seasoningNames.ts`：调味料词表从 `scripts/build-recipes-json.mjs` 移植到应用内（含「粉/酱/醋/糖/盐/油/汁/精」后缀兜底，排除牛油果/油条等），导入时自动区分食材/调味料，与批量脚本口径一致。
- 食材行支持「名称 + 用量」自动拆分（`splitIngredientText`）：「花椰菜 1 颗（约 680 克），切小块」→ 名称=花椰菜、用量=1 颗（约 680 克），切小块；跳过括号内的数字（如「约 680 克」）不误切。导入预览每行新增「数量」输入框，保存导入食谱时不再清空用量。
- 「食材：」行解析升级：同样做名称/用量拆分与调味料自动归类（与批量脚本一致）。
- 食谱库卡片展开箭头移到卡片最右侧（`.feed-card-text` 加 `flex: 1`），不再紧贴食材文字。
- 菜单计划卡片「⋮」更多按钮改为向下箭头（展开时变向上），与食谱库卡片一致。
- App 图标替换为用户上传的黄色碗图标（`~/Desktop/app-icon-1024.png`）：sips 生成各密度 `ic_launcher.png`/`ic_launcher_round.png`（中心裁切 700px 去透明圆角）与自适应图标 `ic_launcher_foreground.png`（全图 108dp 各密度），背景色改为图标黄 `#F8D46B`；新增 `public/favicon.png` 并在 `index.html` 引用（网页 favicon + apple-touch-icon）。
- `npm run build` 通过；esbuild 单测 + 浏览器实测：北非花椰菜沙拉解析出标题/19 项食材（含用量、食材 11 + 调味料 10 自动分类）/3 步做法 + 小贴士，老格式（`食材：`/`调味料：`）回归通过；桌面与 390px 截图验证箭头位置。APK 重新打包（JDK 21），根目录 `what-food-today.apk` 已更新（4.45MB）。
- 备注：用户反馈的「编辑页新增空白项出现在列表第一个」在当前代码无法复现——`addRecipeItem` 历史所有版本均为追加到数组末尾，浏览器实测食材/调味料区新增空白项都出现在各区末尾；重装新 APK 后如仍出现再排查。

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
