const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 微信一键登录：用云函数上下文里的 openid 识别用户，
// 首次登录时写入 users 集合，之后更新 lastLoginAt。
exports.main = async () => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext();
  const now = Date.now();
  const users = db.collection("users");
  const existing = await users.where({ openid: OPENID }).get();

  let profile = { nickname: "", avatarUrl: "" };

  if (existing.data.length === 0) {
    await users.add({
      data: {
        openid: OPENID,
        appid: APPID,
        unionid: UNIONID || "",
        profile,
        createdAt: now,
        lastLoginAt: now,
      },
    });
  } else {
    const record = existing.data[0];
    profile = record.profile || profile;
    await users.doc(record._id).update({ data: { lastLoginAt: now } });
  }

  return { openid: OPENID, appid: APPID, profile };
};
