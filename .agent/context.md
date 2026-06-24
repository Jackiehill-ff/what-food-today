# Project Context

## 项目概况

`今天吃啥？` 是一个个人食谱计划和采购清单应用。当前仓库是 Vite + React + TypeScript 前端应用，部署到 GitHub Pages。

当前阶段准备进入账号 + 云同步开发。在此之前，后续 agent 必须先理解现有本地数据、迁移规则和产品流程，避免云同步开发覆盖或丢失已有用户数据。

## 技术栈和命令

- 前端：React 19、TypeScript、Vite
- 图标：lucide-react
- 本地运行：`npm install` 后执行 `npm run dev`
- 构建验证：`npm run build`
- 预览：`npm run preview`

## 关键文件

- `src/App.tsx`：页面编排、React state、事件处理和组件渲染。
- `src/domain/types.ts`：主要领域类型，包括 `Recipe`、`AppState`、导入、周计划、采购候选和采购清单类型。
- `src/domain/constants.ts`：固定常量和默认状态，包括 `meal-planner-app-v1`、固定餐次、分类和 `DEFAULT_STATE`。
- `src/data/appStorage.ts`：本地数据访问层，提供 `loadAppState()` / `saveAppState(state)`，当前实现仍使用 `localStorage`。
- `src/domain/recipes.ts`：食谱默认值、食材归一化、旧食谱字段兼容迁移和食材筛选 helper。
- `src/domain/importParser.ts`：导入中心文本解析和导入草稿创建。
- `src/domain/mealPlan.ts`：周计划日期、餐次时间、最近一餐推断 helper。
- `src/domain/shopping.ts`：采购候选生成、采购候选分组和正式采购清单分组 helper。
- `src/styles.css`：主要样式。
- `README.md`：运行和部署说明。
- `.github/workflows/`：部署配置。除非用户明确要求，不要修改。

## 当前功能

- 首页：自动展示未来最近一餐，跳过当前时间之前的餐次。
- 周计划：按早餐、午餐、晚餐安排食谱。
- 导入中心：从 flomo 或其他文本来源粘贴食谱文本，解析成一个或多个草稿，预览编辑后保存到食谱库。
- 食谱库：新增、编辑、删除、搜索食谱。
- 采购清单：从周计划生成候选食材，用户手动勾选后加入正式采购清单；也支持手动添加采购项。

## 当前本地数据

当前数据保存在浏览器 `localStorage`，存储键为：

```text
meal-planner-app-v1
```

`src/data/appStorage.ts` 中的 `loadAppState()` 负责读取和兼容迁移旧数据，`saveAppState(state)` 负责保存当前状态。未来账号 + 云同步不能直接废弃这个本地存储键，也不能用云端数据无条件覆盖本地数据。

## 主要数据模型

主要类型集中在 `src/domain/types.ts`。

当前 `AppState` 核心字段包括：

- `recipes`：食谱库，保存用户手动新增、编辑或从导入中心保存的食谱。
- `importRecords`：导入记录预留数据，用于记录导入来源、原文和导入出的食谱 id。
- `mealSlots`：固定餐次，目前为早餐、午餐、晚餐；读取旧数据时仍强制使用固定餐次。
- `mealPlan`：周计划条目，按日期、餐次和食谱 id 建立安排关系。
- `shoppingItems`：正式采购清单，只保存用户从候选食材手动加入或手动创建的采购项。

当前 `Recipe` 核心字段包括：

- `id`：食谱唯一标识。
- `title`：食谱名称。
- `type`：食谱类型，目前支持完整食谱 `full` 和简单食谱 `simple`。
- `category`：用户填写的食谱分类，例如家常菜、早餐等。
- `ingredients`：食材和调味料列表；其中 `category` 为 `调料` 的项在 UI 中作为调味料展示。
- `method`：做法步骤文本，通常按行展示。
- `rawText`：原始文本或备注；导入解析不完整时必须保留原文。
- `createdAt`：创建时间。
- `updatedAt`：更新时间。

旧字段如 `name`、`steps`、`notes`、`seasonings` 只应作为迁移输入，不应作为新逻辑的目标字段。
