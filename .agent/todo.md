# Todo

## 当前分支：Mini-V1（微信小程序 + 账号登录）

- [x] 导航改版：取消「导入中心」tab（4 tab：菜单计划/食谱库/采购清单/我的）；新增食谱并入食谱库右上角按钮（跳导入页：粘贴文本 / 图片识别）；取消手写空白新建（recipe-edit 仅编辑，无 id 自动跳导入页）。
- [x] UI 按 `docs/visual-spec-v2.md` 重设：token 更新（muted #5c6d63、accent-warm #f2b35c、muted-3、阴影阶梯 sm/md/lg、modal 用 shadow-lg、卡片加 shadow-sm）；按钮 80/72rpx + `:active scale(.97)` 按压反馈；标题/按钮 nowrap 防竖排折行。
- [x] 按用户参考图（采购清单页设计）二次调整：页头白底圆角图标块 + 深绿 #254139 粗标题；按钮白底带图标 + 唯一深绿实心主按钮（复制清单）；清单项「名称深绿粗体 + 数量灰同行 + 来源灰色第二行」；新增 copy/copy-white 图标；按钮文字 600 字重。
- [x] 顶部标题栏固定「计划有范」（app.json + 移除页面级 navigationBarTitleText）；四个 tab 页 + 新增食谱页均加「杏黄图标底 + 标题」页头（菜单计划/食谱库/采购清单/我的/新增食谱）。
- [x] UI 对齐原 APP（配色/字体/图标/尺寸），修复文字显示不全与卡片/搜索框大小。
- [x] 生成线条图标集替换 emoji；tabBar 图标重配色。
- [x] 代码审查（4 路并行）：修复云函数幂等 upsert/集合兜底/资料清洗、导出走文件分享、迁移非字符串防崩溃、图片 MIME/残留清理、picker 索引、modal `inset`、冗余 project.config.json 等。
- [x] 需求图功能补齐：菜单计划长按拖动排序（替代上移/下移）+「分享菜单」Canvas 生成分享图（保存相册/发给朋友）；导入中心 OCR 图片识别（依赖 ocr-plugin 插件，未开通时给指引）；采购清单单项编辑/删除弹窗。
- [x] 预览修正（开发工具误改恢复）：菜单计划清除内联 relative 偏移（前一天/日期/后一天重叠、空状态与搜索框被推偏），改「日期居中在上、前一天/后一天等宽横排在下」；采购清单三操作按钮移出页头、独占一行 flex:1 平铺修复溢出；原生导航栏标题文字全部置空（页内图标页头保留）。
- [x] 发布（2026-09-06）：DevTools CLI 上传代码为开发版本 1.0.0（129.7 KB，AppID wx603e02387ba0a6e0）；云函数 login/saveProfile 部署至 cloud1-d5gx91rnaaa9f0be4（首次 Creating 状态需等待后重试）。提审/上线需到 mp.weixin.qq.com 后台操作。
- [x] OCR 图片识别功能已整体移除（2026-09-06 用户决定取消，不再需要 ocr-plugin 插件）。
- [x] 推送 `origin/Mini-V1`（不合并 main）。
- [x] 真机调试修复（2026-09-06）：真机 JS 引擎不支持 ES2020 `??` 语法导致 invalid file SyntaxError；替换 utils 下 5 文件共 8 处 `??`（importParser 食材行索引、storage 旧 slotOrder 合法值含 0，改显式 undefined 判断；其余改 `||`），并顺手替换 2 处 ES2019 语法（`catch {}` → `catch (e) {}`、`.flatMap` → `.reduce(concat)`）；全量 `node --check` 通过，无 `??`/`?.` 残留。
- [x] 预览问题批量修复（2026-09-06 第二轮，模拟器逐项验证）：
  - 菜单计划：「回到今天」并入前一天/后一天同一行（等宽 flex，无日期时保留空档）、去掉对勾图标；搜索下拉选项垂直居中且与搜索框等宽（原生 button UA 固定宽 184px 需 WXML 内联 `width:100%` 才能稳定覆盖）。
  - 加入菜单：修复不弹食材/调味料勾选弹窗——`ingredient-popup` 的 `decorate` 必须写在 Component `methods` 内（顶层函数不会挂到 this，observer 抛错导致列表为空）；食谱库/菜单计划两处入口均已验证弹窗出列表。
  - 食谱库卡片「今天/明天」按钮溢出屏幕：`width:auto; min-width:0` 压缩原生 button 默认宽度，弹层已验证在屏内。
  - 新增食谱：解析器重写（`utils/domain/importParser.js`）——带「食材：/调味料：/做法：」标签与纯文本粘贴两种格式均可解析；按名称自动区分食材/调味料（调味料名单来自 build-recipes-json 脚本，去掉量词后缀再比对）；「番茄 2个」等名称+用量自动拆分。微信 OCR 图片识别功能整体移除（按钮/ocrFromImage/插件说明）。
  - 编辑食谱页：「添加食材/添加调味料」按钮去居中，靠右且与「分类」列对齐（`margin:0; width:auto; min-width:0`），实测 64px 紧凑按钮贴右边缘。
  - 我的：移除多余的「创建备份」按钮；反馈改走 `feedback` 云函数直接提交 GitHub Issues（无需跳转浏览器，失败时降级为复制文本+引导），提示文案移入「反馈」卡片内（新增独立 `feedbackStatus`，不再串到数据卡片的 `dataStatus`）。
  - 登录页排版：头像改 96rpx 正圆（原生 button UA 固定宽 184px 会盖过 class 样式，尺寸同步写进 WXML 内联样式兜底；退出登录小按钮需两级类名 `.profile-row .logout-btn` 才能收缩），头像与昵称靠左。
  - 账号卡片二轮紧凑化（2026-09-06 晚）：移除「保存资料」按钮，昵称失焦且有改动时自动保存（头像本来就是选完即传即存）；「退出登录」缩为小按钮与头像/昵称同一行贴右；登录成功/资料已保存/已退出登录等成功提示不再显示（仅保留错误提示）；登录/退出后同步刷新右上角「已登录/未登录」标签。模拟器实测：头像 49×49 正圆贴左、昵称输入框 201px、退出按钮 70px 贴右、失焦自动保存云端 profile 成功。
  - 账号卡片三轮（2026-09-06 深夜）：用户编码（openid 掩码）移到「账号」面板标题同一行，置于状态标签左侧（…编码 + 已登录）；昵称输入框与「退出登录」平行排列（头像 + 昵称 + 退出一行）；「导出 JSON」按钮改名「导出」（描述文案同步去掉 JSON 字样）；「反馈」卡片整体取消（先改微信 open-type=feedback，后按用户要求整个下掉；me.js 的 GitHub 反馈流程已清理，`cloudfunctions/feedback` 客户端不再调用，保留在仓库与云端待确认下线）。
- [x] 预览问题批量修复（2026-09-06 第三轮，模拟器逐项验证）：
  - 页头图标：菜单计划/食谱库/采购清单三页头图标换成与底部 tabBar 同款（`images/tabbar/*-selected.png`，绿色选中版）。
  - 编辑食谱页图片按钮：「换一张」删除；无图显示「上传成品图」、有图显示「移除图片」，同一位置同一尺寸（btn-sm 统一样式）。
  - 添加食材/调味料按钮：新空白行插入该类别最上面（原来是追加到末尾）；导入页 addIngredient 同步改为插到最前。
  - 分享菜单重做（原实现真机不能出图）：根因 ①画布 `position:fixed; left:-9999rpx` 离屏放置，真机不渲染导致导出失败，现改为画布放在可见的预览弹窗内；②原 `wx.shareImageMessage` API 不存在，改 `wx.showShareImageMenu`。新交互：点「分享菜单」→ 弹窗勾选当天要分享的菜（复选框，默认全选）→ 生成 → 弹窗内直接预览（600 宽无图模板：品牌名 + 日期 + 杏黄装饰条，菜名 + 主要食材居中上下排列，食材超两行省略号截断，底部落款）→ 保存到相册 / 发给朋友。模拟器实测 canvasToTempFilePath 导出成功。
  - 解析器顺手修复（2026-09-06）：标题行的【n】序号标记不再混入标题（「【2】蒜蓉西兰花」→「蒜蓉西兰花」，纯标记行不算标题）；flomo 全量回归 124 条标题正常。
- [x] 预览问题批量修复（2026-09-07，模拟器逐项验证）：
  - 页头图标放大：菜单计划/食谱库/采购清单的页头图标从 36rpx 放大到 52rpx——tabBar 图标字形只占画布 56%，原「我的」页图标占 83%，按比例放大后三页与「我的」视觉一致（实测 27px vs 18px）。
  - 采购清单长按拖动排序（新增）：交互与菜单计划页一致——长按振动进入拖动、实时让位、松手落位；落位后给全部可见项写入手动顺序号 `order` 持久化。排序规则（`utils/domain/shopping.js`）：已勾选仍排最后按勾选时间；未勾选的，拖过序的按手动顺序在前，从未拖过的保持「分类 → 添加时间」；弹窗加入/手动添加的新采购项带 `order = max+1` 接在清单最后。实测拖动第 1 项到第 3 位、重进页面顺序保持。
  - 分享图落款改字：「共 N 道菜 · 计划有范 · 今天吃啥？」→「共 N 道菜 · 计划有饭」（品牌用字为米饭的「饭」，且全库仅此一处出现）。
  - 更新 `docs/screenshots/` 四个 tab 页最终截图。
- [x] 洁癖收尾（neat-freak）：context.md 双应用化 + 新增 Mini-V1 章节；miniprogram-launch.md「实现边界」刷新；README cloudfunctions 描述修正；todo.md 清理两处过期矛盾（09-07 段误列 feedback 云函数、OCR 待办与已移除记录冲突）。清场已按用户确认执行：删除 docs/visual-spec.md、miniprogram/project.config.json（加入 .gitignore）、cloudfunctions/feedback/ 与 /tmp 会话临时目录（云端 feedback 函数仍部署，属部署动作未动，需要时在云开发控制台手动下线）；全部改动已提交并推送 origin/Mini-V1。

- [x] 新建分支 `Mini-V1`（AppID `wx603e02387ba0a6e0`）。
- [x] 确认路线：基于主分支最新 APP 版原生微信小程序重写 + 微信一键登录（云开发）。
- [x] 生成小程序图标（黄底 `#f8d46b` + 深绿 `#254139` 汤碗简笔画）+ tabBar 图标。
- [x] 搭建小程序骨架（project.config.json/app.json/app.wxss/sitemap.json）。
- [x] 移植领域与数据层（utils/domain/*、storage、images 落盘）。
- [x] 微信一键登录云函数（login/saveProfile）+ 客户端。
- [x] 实现五个 tab 页 + 食谱编辑页（含食材勾选弹窗组件）。
- [x] 语法校验（JS/JSON 全部通过）；`docs/miniprogram-launch.md` 上线指南。
- [ ] 在微信开发者工具内导入联调（开通云开发、建 `users` 集合、部署云函数、真机预览）。
- [ ] 上传小程序图标（公众平台设置 → 小程序头像，用 assets/brand/app-icon-144.png）。
- [ ] （后续轮次）云同步（登录已就绪，数据仍本地，云数据库 users 仅存账号资料）。

## 已完成（2026-09-05 发布收尾清理）

- [x] 删除过程性文件：`scripts/recipe-images/`（搜索映射 search-results.json、flomo 映射 flomo-images.json、41MB cache）、`dist/`、`android/app/build`、`android/.gradle`；flomo 映射可随时用 `extract-flomo-images.mjs` 重新生成。
- [x] 删除远端 `origin/app-v1` 分支，仅保留本地 `app-v1`；`main` 已包含全部提交。
- [x] 保留：`what-food-today.apk`（装机产物）、`scripts/flomo-export-2026-09-01.txt`（源文本孤本，Downloads 清理后不可再生）。

## 已完成（2026-09-05 第三轮：菜单计划 ⋮ 菜单改版）

- [x] ⋮ 展开面板：上方显示完整做法（保换行、超高滚动），底部「修改时间」日期选择 + 「删除」按钮同一行。
- [x] `npm run build` 通过；浏览器 + 390px 截图验证；APK 重新打包并更新下载服务。

## 已完成（2026-09-05 第二轮：flomo 成品图 + UI 微调）

- [x] 成品图数据源切换为 flomo 笔记原图：`scripts/extract-flomo-images.mjs` 解析 flomo HTML 导出（备忘录标题归一化匹配、多条命中取带图最新笔记的第一张图）→ `flomo-images.json` → `apply-recipe-images.mjs scripts/recipe-images/flomo-images.json` 嵌入。107/163 带图（其余笔记无图留空），recipes.json 1.59MB。
- [x] 菜单计划卡片：名称下只显示「N 食材 · M 调味料」数量。
- [x] 食谱库卡片：「添加到菜单/编辑/删除」图标按钮移入展开区，与做法一起显示，折叠时隐藏。
- [x] 采购清单顶栏三按钮（手动添加/批量删除/复制清单）缩小并固定同一行（390px 手机宽度验证通过）。
- [x] `npm run build` 通过；浏览器验证三处改动；APK 重新打包并更新局域网下载服务。

## 已完成（2026-09-05 分支 app-v1：成品图 + 卡片改版 + 搜索 + 采购清单）

- [x] 食谱编辑页新增上传/更换/移除成品图（canvas 压缩为 data URL，`Recipe.image` + `src/domain/images.ts`，迁移兼容保留）。
- [x] 食谱库卡片：左侧 84px 成品图（无图占位）；编辑/删除改纯图标；新增「添加到菜单」图标（今天/明天），加入后弹食材勾选。
- [x] 菜单计划卡片：隐藏类型/做法，只显示食材+调味料名称；左侧 56px 成品图；「更改日期/删除」收进 ⋮ 菜单；手柄拖动排序（pointer 事件，触屏可用）；搜索提示词改「想吃什么就告诉我，别客气！」。
- [x] 菜单计划 + 食谱库搜索支持多关键词（空格分隔、全部命中，`src/domain/search.ts`）；计划搜索纳入食材名。
- [x] 采购清单：最新勾选排最后（`checkedAt`，未勾选仍按分类+时间在前）；「批量删除」一键删已勾选；数量单位与名称同行（弹窗同步）；复制清单只复制名称+数量单位。
- [x] `npm run build` 通过；浏览器冒烟测试通过（搜索/弹窗/改日期/拖拽/勾选排序/批量删除/复制/图片渲染）。
- [x] 新增 `scripts/apply-recipe-images.mjs`：下载图片 → sips 压缩（240px/q55，超 40KB 自动二次压缩）→ base64 写入 `recipes.json`；可续跑、带缓存、支持本地路径与自定义映射文件。
- [x] 成品图最终采用 flomo 原图（107/163）；早前网络搜索图已被替换，`search-results.json` 仅留作参考。
- [x] 用户在手机端导入 recipes.json 验证通过（2026-09-05 确认无误）。

## 已完成（2026-09-03 UI/交互改版 + 导入 OCR）

- [x] 取消首页，默认进入「菜单计划」页；移除 `home` tab 及首页组件/死样式。
- [x] 导航改为竖向可收放：桌面侧栏可折叠为图标窄栏（`sidebarCollapsed`），移动端改为左上角汉堡按钮 + 左侧抽屉（`drawerOpen`），替换底部固定 Tab。
- [x] 食谱库改为信息流优先：默认展示全部食谱卡片（名称 + 基本食材），轻点卡片展开完整做法与「编辑/删除」；「编辑」跳至食谱编辑页（原 `RecipeForm`），左上角返回箭头回到信息流。
- [x] 采购清单：手动添加改为与「复制清单」同行的按钮，点击弹出原手动添加表单（弹窗内 名称/数量/单位/分类）。
- [x] 「我的」页新增反馈面板：提交到 GitHub Issues / 复制反馈文本。
- [x] 导入中心新增「上传图片识别文字」（Tesseract.js 本地 OCR，中英文）；验证结论：粘贴网址抓取因浏览器跨域（CORS）+ 社媒登录墙/反爬，纯前端不可行，暂不实现。
- [x] `npm run build` 通过（tesseract.js 已代码分割为懒加载 chunk，worker/core/语言包运行时从 CDN 下载）。
- [x] 重新打包 APK：`npx cap sync android` + `./gradlew assembleDebug`（JDK 21），根目录 `what-food-today.apk` 已更新。
- [ ] 手机安装验证新导航/抽屉（OCR 需联网下载语言包）。

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
