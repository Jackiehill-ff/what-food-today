// 图片本地文件处理。
// 微信小程序单个 storage key 上限约 1MB，食谱成品图的 base64 会撑爆单 key，
// 因此保存时把 data URL 落盘为本地文件、storage 里只存文件路径；导出时再读回 base64。

const isDataUrl = (value) => typeof value === "string" && value.startsWith("data:");

const IMAGE_DIR = `${wx.env.USER_DATA_PATH}/images`;

const ensureImageDir = () => {
  try {
    wx.getFileSystemManager().mkdirSync(IMAGE_DIR, true);
  } catch (error) {
    // 目录已存在时忽略
  }
};

// 把 data URL 写到本地文件，返回可渲染的文件路径；失败时回退为原 data URL
const persistImageToFile = (recipeId, dataUrl) => {
  ensureImageDir();
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.*)$/s);
    const ext = match ? (match[1] === "jpeg" ? "jpg" : match[1]) : "jpg";
    const base64 = match ? match[2] : dataUrl.slice(dataUrl.indexOf(",") + 1);
    const filePath = `${IMAGE_DIR}/${recipeId}.${ext}`;
    wx.getFileSystemManager().writeFileSync(filePath, base64, "base64");
    return filePath;
  } catch (error) {
    console.error("图片写入本地失败", error);
    return dataUrl;
  }
};

// 读取本地图片文件，转回 base64 data URL（用于导出）
const readImageAsDataUrl = (filePath) => {
  try {
    const base64 = wx.getFileSystemManager().readFileSync(filePath, "base64");
    const ext = filePath.split(".").pop() === "png" ? "png" : "jpeg";
    return `data:image/${ext};base64,${base64}`;
  } catch (error) {
    console.error("读取本地图片失败", error);
    return "";
  }
};

module.exports = { isDataUrl, persistImageToFile, readImageAsDataUrl };
