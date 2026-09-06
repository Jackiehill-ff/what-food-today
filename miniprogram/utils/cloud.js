// 云开发相关封装：微信一键登录 + 用户资料。
// 未开通云开发时，所有函数都会返回失败，页面据此降级为「本地模式」。

const isCloudEnabled = () => Boolean(typeof wx !== "undefined" && wx.cloud);

// 调用云函数 login，返回 { openid, appid, profile }
const login = () =>
  new Promise((resolve, reject) => {
    if (!isCloudEnabled()) {
      reject(new Error("云开发未启用"));
      return;
    }
    wx.cloud.callFunction({
      name: "login",
      success: (res) => resolve(res.result || {}),
      fail: reject,
    });
  });

// 保存昵称 + 头像到云端用户记录
const saveProfile = (profile) =>
  new Promise((resolve, reject) => {
    if (!isCloudEnabled()) {
      reject(new Error("云开发未启用"));
      return;
    }
    wx.cloud.callFunction({
      name: "saveProfile",
      data: { profile },
      success: (res) => resolve(res.result || {}),
      fail: reject,
    });
  });

module.exports = { isCloudEnabled, login, saveProfile };
