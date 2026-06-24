# Todo

## 下一阶段：账号 + 云同步

- [x] 在不改变现有功能和 UI 行为的前提下，拆分 `src/App.tsx` 的类型、常量、存储层和纯业务 helper，为后续账号、云同步、数据迁移建立架构边界。
- [x] 在 `.agent/context.md` 说明主要数据类型的新位置，并补充 `Recipe` / `AppState` 核心字段的中文含义。
- [x] 确认账号方案和服务选择：第一版采用 Supabase Auth + Supabase Postgres + RLS。
- [ ] 设计未登录、本地使用、登录后同步之间的产品流程。
- [x] 定义云端数据模型草案，覆盖食谱、导入记录、周计划、采购清单，并补充 RLS policy 草案。
- [ ] 设计本地 `meal-planner-app-v1` 到云端数据的迁移流程。
- [ ] 设计首次登录时本地数据和云端数据的合并策略。
- [ ] 设计跨设备冲突策略，包括同一食谱、同一周计划、同一采购项被多端修改的情况。
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
- [ ] 老用户周计划不丢失。
- [ ] 老用户采购清单不丢失。
- [ ] 未登录状态仍可使用现有功能。
- [ ] 登录后不会无提示覆盖本地数据。
- [ ] 构建通过：`npm run build`。
