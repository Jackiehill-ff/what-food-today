const app = getApp();
const { migrateAppState, createAppStateBackup } = require("../../utils/storage");
const { isDataUrl, readImageAsDataUrl } = require("../../utils/images");
const { login, saveProfile } = require("../../utils/cloud");

const maskOpenid = (openid) => (openid ? `${openid.slice(0, 6)}****${openid.slice(-4)}` : "");

Page({
  data: {
    isCloudEnabled: false,
    user: null,
    openidMasked: "",
    nickname: "",
    avatarUrl: "",
    busy: false,
    accountMessage: "",
    dataStatus: "",
    stats: { recipes: 0, planned: 0, shopping: 0 },
    feedbackText: "",
  },

  onShow() {
    this.applyUser(app.globalData.user);
    this.setData({ isCloudEnabled: app.globalData.isCloudEnabled });
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
        const user = { openid: result.openid, profile: result.profile || { nickname: "", avatarUrl: "" } };
        app.setUser(user);
        this.applyUser(user);
        this.setData({ busy: false, accountMessage: "登录成功" });
      })
      .catch((error) => {
        console.error("登录失败", error);
        this.setData({ busy: false, accountMessage: "登录失败：请先开通云开发环境并部署 login 云函数" });
      });
  },

  logout() {
    app.clearUser();
    this.applyUser(null);
    this.setData({ accountMessage: "已退出登录，本地数据仍保留" });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onChooseAvatar(e) {
    const tempPath = e.detail.avatarUrl;
    const user = app.globalData.user;
    if (!user || !wx.cloud) {
      return;
    }
    this.setData({ accountMessage: "上传头像中…" });
    wx.cloud.uploadFile({
      cloudPath: `avatars/${user.openid}-${Date.now()}.png`,
      filePath: tempPath,
      success: (res) => {
        this.setData({ avatarUrl: res.fileID });
        this.persistProfile();
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
        const next = { ...user, profile: result.profile || profile };
        app.setUser(next);
        this.applyUser(next);
        this.setData({ accountMessage: "资料已保存" });
      })
      .catch(() => this.setData({ accountMessage: "资料保存失败" }));
  },

  saveProfileTap() {
    this.persistProfile();
  },

  createBackup() {
    const key = createAppStateBackup();
    this.setData({ dataStatus: key ? "已创建本地备份" : "暂无本地数据可备份" });
  },

  exportData() {
    const state = app.globalData.appState;
    // 把本地文件路径的图片读回 base64，保证导出文件可跨设备导入
    const recipes = state.recipes.map((recipe) => {
      if (recipe.image && !isDataUrl(recipe.image)) {
        return { ...recipe, image: readImageAsDataUrl(recipe.image) };
      }
      return recipe;
    });
    const json = JSON.stringify({ ...state, recipes }, null, 2);
    wx.setClipboardData({
      data: json,
      success: () => this.setData({ dataStatus: "已复制 JSON 到剪贴板" }),
      fail: () => this.setData({ dataStatus: "数据过大，复制失败（可先用「创建备份」）" }),
    });
  },

  importData() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["json"],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) {
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

  onFeedbackInput(e) {
    this.setData({ feedbackText: e.detail.value });
  },

  copyFeedback() {
    const text = this.data.feedbackText.trim();
    if (!text) {
      return;
    }
    wx.setClipboardData({ data: text, success: () => this.setData({ dataStatus: "反馈内容已复制" }) });
  },

  openGitHubIssue() {
    const title = "小程序反馈";
    const body = this.data.feedbackText.trim() || "（请在此描述你的建议或遇到的问题）";
    const url = `https://github.com/Jackiehill-ff/What-food-today/issues/new?title=${encodeURIComponent(
      title,
    )}&body=${encodeURIComponent(body)}`;
    wx.setClipboardData({ data: url, success: () => this.setData({ dataStatus: "已复制反馈链接，请到浏览器粘贴提交" }) });
  },
});
