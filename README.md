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

## 微信小程序（Mini-V1）

`miniprogram/` 是基于主分支 APP 版原生重写的微信小程序（AppID `wx603e02387ba0a6e0`），`cloudfunctions/` 是微信一键登录云函数。

- 登录：微信云开发一键登录（云函数 `login` 用 `getWXContext().OPENID` 识别用户），未开通云开发时自动降级为纯本地模式。
- 数据：本地优先，沿用 `meal-planner-app-v1` 数据键与迁移逻辑；**食谱不预置、不打包**，通过「导入中心」或「我的 → 数据 → 导入」自行导入。
- 小程序图标：`assets/brand/app-icon.svg`（黄底 + 汤碗简笔画，即导航栏品牌图标）。

完整的上线步骤见 [`docs/miniprogram-launch.md`](docs/miniprogram-launch.md)。
