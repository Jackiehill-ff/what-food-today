# 今天吃啥？

个人食谱计划和采购清单应用。

## 本地运行

```bash
npm install
npm run dev
```

## 可选账号配置

未配置 Supabase 时，应用会继续作为纯本地应用运行，并保留 `meal-planner-app-v1` 数据。

如需测试账号入口，复制 `.env.example` 为 `.env.local` 后填写：

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Supabase Auth 的 Site URL 建议配置为：

```text
https://jackiehill-ff.github.io/what-food-today/
```

本地开发 Redirect URL 可加入：

```text
http://localhost:5173/**
http://127.0.0.1:5173/**
```

## 部署到 GitHub Pages

推送到 GitHub 仓库的 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages。

当前仓库地址：

```text
https://github.com/Jackiehill-ff/What-food-today
```

发布地址通常是：

```text
https://jackiehill-ff.github.io/what-food-today/
```
