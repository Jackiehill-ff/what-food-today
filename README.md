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

## 打包 Android APK（debug）

依赖：Android SDK（`~/Library/Android/sdk`，platforms 35/36）和 JDK 21（Homebrew keg 版 `openjdk@21`，系统 `java` 命令找不到是正常的）。

```bash
npm run build
npx cap sync android
cd android
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../what-food-today.apk
```

产物为 debug 签名；正式版需自签 keystore 后打 release。
