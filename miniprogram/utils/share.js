// 页面分享：统一提供「转发给朋友」与「分享到朋友圈」。
// 页面必须同时定义 onShareAppMessage / onShareTimeline，右上角菜单的两个分享入口才可用，
// 否则转发按钮置灰、「分享到朋友圈」显示「当前不支持」。
const BRAND = "计划有饭 · 今天吃啥？";
const SHARE_IMAGE = "/images/brand/app-icon.png";

// 用法：const share = createPageShare({ title, path, query }); Page({ ...share, ... })
const createPageShare = (options) => {
  const title = options && options.title ? options.title : BRAND;
  const path = options && options.path ? options.path : "/pages/plan/plan";
  const query = options && options.query ? options.query : "";
  return {
    onShareAppMessage() {
      return { title, path: path + (query ? "?" + query : ""), imageUrl: SHARE_IMAGE };
    },
    onShareTimeline() {
      return { title, query, imageUrl: SHARE_IMAGE };
    },
  };
};

module.exports = { createPageShare };
