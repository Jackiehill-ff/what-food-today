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

- `src/App.tsx`：核心业务逻辑和 UI 状态，包含食谱、导入、周计划、首页最近一餐、采购清单。
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

`src/App.tsx` 中的 `loadState()` 负责读取和兼容迁移旧数据。未来账号 + 云同步不能直接废弃这个本地存储键，也不能用云端数据无条件覆盖本地数据。

## 主要数据模型

当前 `AppState` 包含：

- `recipes`：食谱库。
- `importRecords`：导入记录预留数据。
- `mealSlots`：固定餐次，目前为早餐、午餐、晚餐。
- `mealPlan`：周计划条目。
- `shoppingItems`：正式采购清单。

当前 `Recipe` 目标字段包括：

- `id`
- `title`
- `type`
- `category`
- `ingredients`
- `method`
- `rawText`
- `createdAt`
- `updatedAt`

旧字段如 `name`、`steps`、`notes`、`seasonings` 只应作为迁移输入，不应作为新逻辑的目标字段。
