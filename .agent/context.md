# Project Context

## 项目概况

`今天吃啥？` 是一个个人食谱计划和采购清单应用。当前仓库是 Vite + React + TypeScript 前端应用，部署到 GitHub Pages。

当前阶段准备进入账号 + 云同步开发。在此之前，后续 agent 必须先理解现有本地数据、迁移规则和产品流程，避免云同步开发覆盖或丢失已有用户数据。

## 技术栈和命令

- 前端：React 19、TypeScript、Vite
- 图标：lucide-react
- 账号基础设施：Supabase Auth 客户端，可选配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`
- 本地运行：`npm install` 后执行 `npm run dev`
- 构建验证：`npm run build`
- 预览：`npm run preview`

## 关键文件

- `src/App.tsx`：页面编排、React state、事件处理和组件渲染。
- `src/auth/supabaseClient.ts`：Supabase 浏览器客户端初始化；未配置环境变量时返回本地模式。
- `src/auth/useAuthSession.ts`：Auth session 读取、监听、邮箱 Magic Link 登录和退出。
- `src/data/appStateRepository.ts`：本地/云端数据访问边界；当前 App 使用本地 adapter，云端 adapter 仍为占位。
- `src/domain/types.ts`：主要领域类型，包括 `Recipe`、`AppState`、导入、菜单计划和采购清单类型。
- `src/domain/sync.ts`：同步基础类型，包括同步状态、迁移状态、同步队列和冲突记录。
- `src/domain/constants.ts`：固定常量和默认状态，包括 `meal-planner-app-v1`、分类和 `DEFAULT_STATE`。
- `src/data/appStorage.ts`：本地数据访问层，提供 `loadAppState()` / `saveAppState(state)`，当前实现仍使用 `localStorage`。
- `src/data/syncStorage.ts`：同步元数据本地存储，使用 `meal-planner-sync-v1`，并提供非破坏性备份 helper。
- `src/domain/recipes.ts`：食谱默认值、食材归一化、旧食谱字段兼容迁移和食材筛选 helper。
- `src/domain/importParser.ts`：导入中心文本解析和导入草稿创建。
- `src/domain/mealPlan.ts`：单日菜单日期、日期切换、当天菜单读取 helper。
- `src/domain/shopping.ts`：统一采购清单排序 helper。
- `src/styles.css`：主要样式。
- `scripts/build-recipes-json.mjs`：flomo 文本批量导入脚本，支持笔记切分、括号感知切分、调味料自动识别、字段别名和做法提取；也支持从 App 导出 JSON 归一化。
- `scripts/extract-flomo-images.mjs`：解析 flomo HTML 导出（`Jack Jiang的笔记.html` + `file/` 图片），按标题归一化匹配食谱与笔记，输出 `scripts/recipe-images/flomo-images.json`（多条命中取带图且最新的笔记，取第一张图）。
- `scripts/apply-recipe-images.mjs`：按映射文件（默认 `search-results.json`，成品图用 `flomo-images.json`）下载或读取本地图片、sips 压缩（240px/q55）后以 base64 `image` 字段写入 `recipes.json`；可续跑、缓存于 `scripts/recipe-images/cache/`（已 gitignore）。
- `recipes.json`：批量生成的正式食谱库（163 个食谱，其中 107 个已嵌 flomo 原做成品图），可直接在「数据 → 导入」导入。
- `docs/supabase-schema.sql`：Supabase Postgres/RLS 表结构和 policy 草案。
- `docs/auth-foundation-checklist.md`：账号基础设施手动验收清单。
- `README.md`：运行和部署说明。
- `.github/workflows/`：部署配置。除非用户明确要求，不要修改。

## 当前功能

- 默认进入菜单计划（无独立首页）。
- 菜单计划：单日视图，默认聚焦今天，可切前一天/后一天；一天一个列表，菜按顺序排列，卡片左侧成品图、名称下只显示「N 食材 · M 调味料」数量（不显示类型/做法/名称列表），手柄拖动排序（鼠标/触屏），「更改日期/删除」收在 ⋮ 更多菜单；搜索（空格分隔多关键词，候选最多 8 个，提示词「想吃什么就告诉我，别客气！」）添加，选完立即弹出食材勾选弹窗，勾选缺少的食材直接加入采购清单。
- 导入中心：从 flomo 或其他文本来源粘贴食谱文本，解析成一个或多个草稿，预览编辑后保存到食谱库；也支持通过 `scripts/build-recipes-json.mjs` 批量生成、`scripts/extract-flomo-images.mjs` + `scripts/apply-recipe-images.mjs` 嵌入 flomo 原图后的 `recipes.json` 从「数据 → 导入」导入；另支持上传图片识别文字（Tesseract.js 本地 OCR，中英文）填入文本框再解析。
- 食谱库：信息流卡片（左侧 84px 成品图或占位图标 + 菜名 + 食材名称）默认不显示操作；轻点卡片展开完整做法 + 三个纯图标操作（添加到菜单（今天/明天，加入后弹食材勾选）、编辑、删除）；编辑进入食谱编辑页（成品图上传/更换/移除 + 名称/分类/食材/调味料/做法/备注 + 食材排序），左上角返回箭头回信息流；搜索支持空格分隔多关键词，支持分类筛选。
- 采购清单：统一清单不按日期分类；未勾选在前（分类 → 添加时间），已勾选按勾选时间排在最后（最新勾选永远垫底）；顶栏「手动添加/批量删除/复制清单」三按钮缩小同行显示；「批量删除」一键删除全部已勾选项；数量+单位与名称同行；「复制清单」复制 `- 名称 数量单位`；手动添加（按钮 + 弹窗）。
- 我的：账号与数据面板 + 反馈（GitHub Issues / 复制）。
- 导航：桌面竖向侧栏可折叠（图标窄栏）；移动端（≤980px）左上角汉堡按钮 + 左侧抽屉，替换原底部 Tab。

## 当前本地数据

当前数据保存在浏览器 `localStorage`，存储键为：

```text
meal-planner-app-v1
```

`src/data/appStorage.ts` 中的 `loadAppState()` 负责读取和兼容迁移旧数据，`saveAppState(state)` 负责保存当前状态。未来账号 + 云同步不能直接废弃这个本地存储键，也不能用云端数据无条件覆盖本地数据。

账号基础设施新增同步元数据键：

```text
meal-planner-sync-v1
```

该键保存 `userId`、`deviceId`、`syncStatus`、`syncQueue`、`syncConflicts`、`lastPulledAt`、`lastPushedAt` 和 `migrationStatus`。它不能替代 `meal-planner-app-v1`，只用于后续同步流程的本地游标、队列和迁移状态。

首次迁移或危险选择前，应先通过 `createAppStateBackup()` 将 `meal-planner-app-v1` 原文复制到 `meal-planner-app-v1-backup-<timestamp>`。当前分支不实现自动上传、自动拉取或云端覆盖本地数据。

## 主要数据模型

主要类型集中在 `src/domain/types.ts`。

当前 `AppState` 核心字段包括：

- `recipes`：食谱库，保存用户手动新增、编辑或从导入中心保存的食谱。
- `importRecords`：导入记录预留数据，用于记录导入来源、原文和导入出的食谱 id。
- `mealPlan`：菜单计划条目，按日期和食谱 id 建立安排关系；同一天内顺序即菜单顺序（新增追加在末尾）。旧数据中的餐次 `slotId` 在迁移时去掉，并按 早餐→午餐→晚餐 顺序重排。
- `shoppingItems`：正式采购清单，保存用户从弹窗勾选加入或手动创建的采购项；`date` 字段仅作旧数据兼容保留，展示上不再按日期分类。

当前 `Recipe` 核心字段包括：

- `id`：食谱唯一标识。
- `title`：食谱名称。
- `type`：食谱类型，目前支持完整食谱 `full` 和简单食谱 `simple`。
- `category`：用户填写的食谱分类，例如家常菜、早餐等。
- `ingredients`：食材和调味料列表；其中 `category` 为 `调味料` 的项在 UI 中作为调味料展示。
- `method`：做法步骤文本，通常按行展示。
- `rawText`：原始文本或备注；导入解析不完整时必须保留原文。
- `image`：成品图，压缩后的 data URL（编辑页上传最长边 480px；批量脚本 240px），导入导出和迁移均保留。
- `createdAt`：创建时间。
- `updatedAt`：更新时间。

旧字段如 `name`、`steps`、`notes`、`seasonings` 只应作为迁移输入，不应作为新逻辑的目标字段。
