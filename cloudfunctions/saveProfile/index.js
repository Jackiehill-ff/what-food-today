const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

// 服务端清洗：昵称限长、头像只接受云文件 ID / https / 空
const sanitizeProfile = (profile) => {
  const nickname = String((profile && profile.nickname) || "").trim().slice(0, 32);
  const rawAvatar = String((profile && profile.avatarUrl) || "").trim().slice(0, 512);
  const avatarUrl =
    rawAvatar && (rawAvatar.startsWith("cloud://") || rawAvatar.startsWith("https://")) ? rawAvatar : "";
  return { nickname, avatarUrl };
};

const ensureCollection = async () => {
  try {
    await db.createCollection("users");
  } catch (error) {
    // 已存在则忽略
  }
};

// 保存昵称与头像：同样以 openid 作为文档 _id 做幂等 upsert，保持与 login 一致的结构
exports.main = async (event) => {
  const { OPENID, APPID, UNIONID } = cloud.getWXContext();

  try {
    const profile = sanitizeProfile(event.profile);
    let createdAt = Date.now();

    try {
      const existing = await db.collection("users").doc(OPENID).get();
      if (existing.data) {
        createdAt = existing.data.createdAt || createdAt;
      }
    } catch (error) {
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

    return { ok: true, profile };
  } catch (error) {
    console.error("saveProfile failed", error);
    return {
      ok: false,
      code: error.errCode || "",
      message: error.errMsg || error.message || "保存失败",
    };
  }
};
