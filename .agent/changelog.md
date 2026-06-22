# Changelog

## 2026-06-22

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
