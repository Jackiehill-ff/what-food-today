const { loadAppState, saveAppState, loadSyncMetadata, saveSyncMetadata } = require("./utils/storage");
const { CLOUD_ENV } = require("./utils/config");

const USER_STORAGE_KEY = "meal-planner-user-v1";

App({
  globalData: {
    appState: null,
    syncMetadata: null,
    user: null,
    isCloudEnabled: false,
  },

  onLaunch() {
    // 初始化云开发；未开通时静默降级为纯本地模式
    if (wx.cloud) {
      try {
        const options = { traceUser: true };
        if (CLOUD_ENV) {
          options.env = CLOUD_ENV;
        }
        wx.cloud.init(options);
        this.globalData.isCloudEnabled = true;
      } catch (error) {
        console.error("云开发初始化失败，继续使用本地模式", error);
      }
    }

    this.globalData.appState = loadAppState();
    this.globalData.syncMetadata = loadSyncMetadata();
    this.globalData.user = wx.getStorageSync(USER_STORAGE_KEY) || null;
  },

  // 数据修改后的统一保存入口
  saveState() {
    if (!saveAppState(this.globalData.appState)) {
      this._warnSaveFailure();
    }
  },

  _warnSaveFailure() {
    // 节流：避免连续写入失败时反复弹提示
    if (this._saveToastVisible) {
      return;
    }
    this._saveToastVisible = true;
    wx.showToast({ title: "保存失败：本地存储空间不足", icon: "none", duration: 2500 });
    setTimeout(() => {
      this._saveToastVisible = false;
    }, 3000);
  },

  saveSyncMetadata() {
    saveSyncMetadata(this.globalData.syncMetadata);
  },

  setUser(user) {
    this.globalData.user = user;
    wx.setStorageSync(USER_STORAGE_KEY, user);
  },

  clearUser() {
    this.globalData.user = null;
    wx.removeStorageSync(USER_STORAGE_KEY);
  },
});
