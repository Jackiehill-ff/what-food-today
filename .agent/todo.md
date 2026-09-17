# Todo

> 已完成轮次的详细记录统一见 `.agent/changelog.md`（2026-06 起全程可查），本文件只保留待办与约束。

## 当前待办

- [ ] 手机安装最新 `what-food-today.apk` 验收 2026-09-17 全部改动：新图标、分段式食谱导入、编辑页食材列表+弹窗、弹窗数量占位「无」、图片仅移除按钮、箭头样式、导航顺序、我的页统计（对照 `docs/daily-menu-checklist.md`）。
- [ ] 如需正式版 APK 再打 release（需自签 keystore，当前为 debug 签名）。

## 下一阶段：账号 + 云同步（设计未完成）

- [ ] 设计未登录、本地使用、登录后同步之间的产品流程。
- [ ] 设计本地 `meal-planner-app-v1` 到云端数据的迁移流程。
- [ ] 设计首次登录时本地数据和云端数据的合并策略。
- [ ] 设计跨设备冲突策略（同一食谱/菜单/采购项被多端修改）。
- [ ] 设计离线编辑和恢复联网后的同步策略。
- [ ] 设计同步失败提示、重试和回滚行为。

已定案：第一版 Supabase Auth + Postgres + RLS；Magic Link 登录；基础设施代码与 schema 草案已就位（见 `docs/supabase-schema.sql`、`docs/auth-foundation-checklist.md`）。

## 开发约束

- [x] 修改代码前先阅读 `README.md`、`.agent/context.md`、`.agent/todo.md`。
- [x] 不删除数据库。
- [x] 不修改部署配置，除非用户明确要求。
- [x] 每完成任务后更新 `.agent/todo.md` 和 `.agent/changelog.md`。

## 验收重点

- [ ] 老用户本地食谱/菜单计划/采购清单不丢失。
- [ ] 未登录状态仍可使用现有功能。
- [ ] 登录后不会无提示覆盖本地数据。
- [ ] 构建通过：`npm run build`。
