const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

const sanitizeProfile = (profile) => ({
  nickname: String((profile && profile.nickname) || "").trim().slice(0, 32),
  avatarUrl: String((profile && profile.avatarUrl) || "").trim().slice(0, 512),
});

// 集合不存在时先创建（users 需手动存在，这里做兜底）
const ensureCollection = async () => {
  try {
    await db.createCollection("users");
  } catch (error) {
    // 已存在则忽略；其他错误交给上层处理
  }
};

// 微信一键登录：以 openid 作为文档 _id 做幂等 upsert，避免并发首登产生重复用户
exports.main = async () => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext();

  try {
    let profile = { nickname: "", avatarUrl: "" };
    let createdAt = Date.now();

    try {
      const existing = await db.collection("users").doc(OPENID).get();
      if (existing.data) {
        profile = sanitizeProfile(existing.data.profile);
        createdAt = existing.data.createdAt || createdAt;
      }
    } catch (error) {
      // 文档或集合不存在：新用户，先确保集合存在
      await ensureCollection();
    }

    await db.collection("users").doc(OPENID).set({
      data: {
        openid: OPENID,
        appid: APPID,
        unionid: UNIONID || "",
        profile,
        createdAt,
        lastLoginAt: Date.now(),
      },
    });

    return { ok: true, openid: OPENID, appid: APPID, profile };
  } catch (error) {
    console.error("login failed", error);
    return {
      ok: false,
      code: error.errCode || "",
      message: error.errMsg || error.message || "登录失败",
    };
  }
};
