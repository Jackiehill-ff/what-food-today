const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 保存用户昵称与头像（头像昵称填写能力）
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const profile = event.profile || {};
  const now = Date.now();
  const users = db.collection("users");
  const existing = await users.where({ openid: OPENID }).get();

  if (existing.data.length === 0) {
    await users.add({ data: { openid: OPENID, profile, createdAt: now, lastLoginAt: now } });
  } else {
    await users.doc(existing.data[0]._id).update({ data: { profile, lastLoginAt: now } });
  }

  return { ok: true, profile };
};
