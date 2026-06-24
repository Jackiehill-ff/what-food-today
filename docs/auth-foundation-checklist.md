# Auth Foundation Checklist

## 未配置 Supabase

- 删除或留空 `.env.local` 中的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。
- 运行 `npm run dev`。
- 侧栏账号区显示本地模式。
- 首页、周计划、导入中心、食谱库和采购清单仍可正常读写本地数据。
- 刷新页面后 `meal-planner-app-v1` 数据仍保留。

## 配置 Supabase

- 在 `.env.local` 填写 Supabase URL 和 publishable key。
- Supabase Auth Site URL 配置为生产地址。
- Redirect allow list 加入生产地址、本地 `http://localhost:5173/**` 和 `http://127.0.0.1:5173/**`。
- 输入邮箱发送 Magic Link。
- 点击邮箱链接回到应用后，侧栏显示当前登录邮箱和同步状态。

## 本地备份

- 登录后点击创建备份。
- 浏览器 localStorage 中出现 `meal-planner-app-v1-backup-<timestamp>`。
- 原 `meal-planner-app-v1` 内容未被删除或替换。
- `meal-planner-sync-v1` 中的 `migrationStatus` 变为 `backup-created`。

## 退出登录

- 点击退出。
- 侧栏回到未登录状态。
- 本地食谱、周计划和采购清单仍保留。
- 刷新页面后本地数据仍可用。

## 本分支不验证

- 自动上传本地数据到云端。
- 自动拉取云端数据覆盖本地。
- 双向同步。
- 冲突解决 UI。
