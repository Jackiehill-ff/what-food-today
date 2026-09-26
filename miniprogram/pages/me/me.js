const app = getApp();
const { migrateAppState } = require("../../utils/storage");
const { isDataUrl, readImageAsDataUrlAsync } = require("../../utils/images");
const { getTodayKey } = require("../../utils/domain/mealPlan");
const { login, saveProfile, downloadFile } = require("../../utils/cloud");
const recipeSync = require("../../utils/recipeSync");
const { createPageShare } = require("../../utils/share");

const maskOpenid = (openid) => (openid ? `${openid.slice(0, 6)}****${openid.slice(-4)}` : "");

Page({
  ...createPageShare({ title: "计划有饭 · 今天吃啥？", path: "/pages/me/me" }),

  data: {
    isCloudEnabled: false,
    syncTagText: "本地模式",
    user: null,
    openidMasked: "",
    nickname: "",
    avatarUrl: "",
    busy: false,
    accountMessage: "",
    syncBusy: false,
    syncStatus: "",
    syncTimeText: "未同步",
    dataStatus: "",
    stats: { recipes: 0, planned: 0, shopping: 0 },
  },

  onShow() {
    this.applyUser(app.globalData.user);
    const isCloudEnabled = app.globalData.isCloudEnabled;
    this.setData({
      isCloudEnabled,
      syncTagText: isCloudEnabled ? (app.globalData.user ? "已登录" : "未登录") : "本地模式",
      syncTimeText: app.globalData.user ? recipeSync.getLastSyncText() : "未同步",
    });
    this.refreshStats();
  },

  refreshStats() {
    const state = app.globalData.appState;
    this.setData({
      stats: {
        recipes: state.recipes.length,
        planned: state.mealPlan.length,
        shopping: state.shoppingItems.length,
      },
    });
  },

  applyUser(user) {
    const profile = (user && user.profile) || {};
    this.setData({
      user,
      openidMasked: user ? maskOpenid(user.openid) : "",
      nickname: profile.nickname || "",
      avatarUrl: profile.avatarUrl || "",
    });
  },

  loginTap() {
    if (!this.data.isCloudEnabled) {
      this.setData({ accountMessage: "未开通云开发，当前继续使用本地数据" });
      return;
    }
    this.setData({ busy: true, accountMessage: "" });
    login()
      .then((result) => {
        if (!result || result.ok === false) {
          this.setData({ busy: false, accountMessage: (result && result.message) || "登录失败，请稍后重试" });
          return;
        }
        if (!result.openid) {
          this.setData({ busy: false, accountMessage: "登录结果缺少用户标识，请重试" });
          return;
        }
        const user = { openid: result.openid, profile: result.profile || { nickname: "", avatarUrl: "" } };
        app.setUser(user);
        this.applyUser(user);
        // 成功状态不额外显示文字，页面直接切换为已登录布局
        this.setData({ busy: false, accountMessage: "", syncTagText: "已登录" });
        // 登录成功即把食谱库与云端做一次双向同步
        recipeSync.syncRecipes().then((res) => {
          this.refreshStats();
          this.setData({ syncTimeText: recipeSync.getLastSyncText() });
          if (res.ok && (res.pulled > 0 || res.pushed > 0)) {
            wx.showToast({
              title: `食谱已同步：拉取 ${res.pulled} · 推送 ${res.pushed}`,
              icon: "none",
              duration: 2500,
            });
          } else if (!res.ok && res.code !== "disabled" && res.code !== "busy") {
            this.setData({ accountMessage: `食谱同步失败：${res.message || "请稍后重试"}` });
          }
        });
      })
      .catch((error) => {
        console.error("登录失败", error);
        this.setData({
          busy: false,
          accountMessage: `登录失败：${(error && (error.errMsg || error.message)) || "未知错误，请确认已开通云开发并部署 login 云函数"}`,
        });
      });
  },

  logout() {
    app.clearUser();
    this.applyUser(null);
    this.setData({
      accountMessage: "",
      syncStatus: "",
      syncTimeText: "未同步",
      syncTagText: this.data.isCloudEnabled ? "未登录" : "本地模式",
    });
  },

  // 手动「立即同步」：拉取 + 推送一次食谱库
  syncTap() {
    if (this.data.syncBusy) {
      return;
    }
    if (!this.data.user) {
      this.setData({ syncStatus: "请先登录后再同步" });
      return;
    }
    this.setData({ syncBusy: true, syncStatus: "正在同步…" });
    recipeSync.syncRecipes().then((res) => {
      this.setData({ syncBusy: false });
      this.refreshStats();
      this.setData({ syncTimeText: recipeSync.getLastSyncText() });
      if (res.ok) {
        const parts = [];
        if (res.pulled) {
          parts.push(`拉取 ${res.pulled}`);
        }
        if (res.pushed) {
          parts.push(`推送 ${res.pushed}`);
        }
        if (res.removed) {
          parts.push(`删除 ${res.removed}`);
        }
        this.setData({ syncStatus: parts.length ? `同步完成：${parts.join(" · ")}` : "云端与本地已一致" });
        return;
      }
      if (res.code === "busy") {
        this.setData({ syncStatus: "正在同步中，请稍候" });
        return;
      }
      this.setData({ syncStatus: `同步失败：${res.message || "请检查网络后重试"}` });
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  // 「保存资料」按钮已移除：昵称失焦且有改动时自动保存
  onNicknameBlur() {
    const user = app.globalData.user;
    if (!user) {
      return;
    }
    const next = this.data.nickname.trim();
    const prev = (user.profile && user.profile.nickname) || "";
    if (next === prev) {
      return;
    }
    this.persistProfile();
  },

  onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    const user = app.globalData.user;
    if (!user || !this.data.isCloudEnabled || !wx.cloud) {
      this.setData({ accountMessage: "请先登录后再设置头像" });
      return;
    }
    this.setData({ accountMessage: "上传头像中…" });
    const oldFileId = this.data.avatarUrl;
    // 稳定路径：同名覆盖，避免每次更换头像都累积新的云存储文件
    wx.cloud.uploadFile({
      cloudPath: `avatars/${user.openid}.png`,
      filePath: tempPath,
      success: (res) => {
        this.setData({ avatarUrl: res.fileID });
        this.persistProfile();
        if (oldFileId && oldFileId.startsWith("cloud://") && oldFileId !== res.fileID) {
          wx.cloud.deleteFile({ fileList: [oldFileId], success: () => {}, fail: () => {} });
        }
      },
      fail: () => this.setData({ accountMessage: "头像上传失败" }),
    });
  },

  persistProfile() {
    const user = app.globalData.user;
    if (!user) {
      return;
    }
    const profile = { nickname: this.data.nickname.trim(), avatarUrl: this.data.avatarUrl };
    saveProfile(profile)
      .then((result) => {
        if (!result || result.ok === false) {
          this.setData({ accountMessage: (result && result.message) || "资料保存失败" });
          return;
        }
        const next = { ...user, profile: result.profile || profile };
        app.setUser(next);
        this.applyUser(next);
        this.setData({ accountMessage: "" });
      })
      .catch((error) => {
        console.error("资料保存失败", error);
        this.setData({ accountMessage: "资料保存失败" });
      });
  },

  exportData() {
    const state = app.globalData.appState;
    this.setData({ dataStatus: "正在生成备份…" });
    // 异步读回本地图片，避免阻塞 UI；图片随 JSON 一起导出，保证可跨设备导入。
    // 云端成品图（cloud:// fileID）先下载到临时文件再读回 base64，下载失败保留原 fileID 不阻断导出
    const tasks = state.recipes.map((recipe) => {
      if (!recipe.image || isDataUrl(recipe.image)) {
        return Promise.resolve(recipe);
      }
      if (recipe.image.indexOf("cloud://") === 0) {
        return downloadFile(recipe.image)
          .then((tempPath) => readImageAsDataUrlAsync(tempPath).then((image) => ({ ...recipe, image })))
          .catch(() => recipe);
      }
      return readImageAsDataUrlAsync(recipe.image).then((image) => ({ ...recipe, image }));
    });
    Promise.all(tasks)
      .then((recipes) => {
        const json = JSON.stringify({ ...state, recipes }, null, 2);
        const fileName = `what-food-today-${getTodayKey()}.json`;
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        try {
          wx.getFileSystemManager().writeFileSync(filePath, json, "utf8");
        } catch (error) {
          console.error("写入备份文件失败", error);
          this.setData({ dataStatus: "写入备份文件失败" });
          return;
        }
        wx.shareFileMessage({
          filePath,
          fileName,
          success: () => this.setData({ dataStatus: "已生成备份文件，请发送到聊天保存" }),
          fail: () => {
            // 分享文件不可用时回退到剪贴板（仅小数据可靠）
            wx.setClipboardData({
              data: json,
              success: () => this.setData({ dataStatus: "已复制 JSON 到剪贴板（数据较大时可能不完整）" }),
              fail: () => this.setData({ dataStatus: "导出失败" }),
            });
          },
        });
      })
      .catch((error) => {
        console.error("导出失败", error);
        this.setData({ dataStatus: "导出失败：读取图片出错" });
      });
  },

  importData() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) {
          return;
        }
        const fileName = (file.name || file.path || "").toLowerCase();
        if (!fileName.endsWith(".json")) {
          this.setData({ dataStatus: "请选择 .json 文件" });
          return;
        }
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: file.path,
          encoding: "utf8",
          success: (readRes) => {
            try {
              const migrated = migrateAppState(JSON.parse(readRes.data));
              if (!migrated.recipes.length && !migrated.mealPlan.length && !migrated.shoppingItems.length) {
                this.setData({ dataStatus: "导入失败：文件里没有有效数据" });
                return;
              }
              wx.showModal({
                title: "导入数据",
                content: `将替换当前全部数据（${migrated.recipes.length} 个食谱），确定继续？`,
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    app.globalData.appState = migrated;
                    app.saveState();
                    this.setData({ dataStatus: `已导入 ${migrated.recipes.length} 个食谱` });
                    this.refreshStats();
                  }
                },
              });
            } catch (error) {
              console.error("导入失败", error);
              this.setData({ dataStatus: "导入失败：文件格式不正确" });
            }
          },
          fail: () => this.setData({ dataStatus: "读取文件失败" }),
        });
      },
    });
  },

});
