const app = getApp();
const { createId, createTimestamp } = require("../../utils/domain/ids");
const { createBlankItem, createBlankRecipe } = require("../../utils/domain/recipes");
const { isDataUrl, deleteImageFile } = require("../../utils/images");

const UNIT_VALUES = ["", "g", "tsp"];
const UNIT_LABELS = { "": "无", g: "克 (g)", tsp: "茶匙 (tsp)" };
const CATEGORIES = ["食材", "调味料"];

const mimeForPath = (filePath) => {
  const ext = (String(filePath || "").split(".").pop() || "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
};

Page({
  data: {
    editingId: "",
    draft: null,
    food: [],
    seasoning: [],
    unitValues: UNIT_VALUES,
    unitLabels: ["无", "克 (g)", "茶匙 (tsp)"],
    categories: CATEGORIES,
  },

  onLoad(options) {
    this._pendingImageDeletes = [];
    const id = options && options.id;
    if (id) {
      const recipe = app.globalData.appState.recipes.find((item) => item.id === id);
      if (recipe) {
        const ingredients = recipe.ingredients.length
          ? recipe.ingredients.map((item) => ({ ...item }))
          : [createBlankItem()];
        this.setData({ draft: { ...recipe, ingredients }, editingId: id });
        this.refreshSections();
        return;
      }
    }
    this.setData({ draft: createBlankRecipe(), editingId: "" });
    this.refreshSections();
  },

  refreshSections() {
    const draft = this.data.draft;
    const decorate = (item) => ({
      ...item,
      unitLabel: UNIT_LABELS[item.unit] || "无",
      unitIndex: UNIT_VALUES.indexOf(item.unit) > -1 ? UNIT_VALUES.indexOf(item.unit) : 0,
      categoryIndex: CATEGORIES.indexOf(item.category) > -1 ? CATEGORIES.indexOf(item.category) : 0,
    });
    this.setData({
      food: draft.ingredients.filter((item) => item.category === "食材").map(decorate),
      seasoning: draft.ingredients.filter((item) => item.category === "调味料").map(decorate),
    });
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`draft.${field}`]: e.detail.value });
  },

  // ---- 图片 ----
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      success: (res) => {
        const tempPath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
        if (tempPath) {
          this.compressToDataUrl(tempPath);
        }
      },
    });
  },

  compressToDataUrl(filePath) {
    wx.compressImage({
      src: filePath,
      quality: 68,
      success: (res) => this.readAsDataUrl(res.tempFilePath),
      fail: () => this.readAsDataUrl(filePath),
    });
  },

  readAsDataUrl(filePath) {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: "base64",
      success: (res) => {
        const oldImage = this.data.draft.image;
        if (oldImage && !isDataUrl(oldImage)) {
          this._pendingImageDeletes.push(oldImage);
        }
        this.setData({ "draft.image": `data:${mimeForPath(filePath)};base64,${res.data}` });
      },
    });
  },

  removeImage() {
    const oldImage = this.data.draft.image;
    if (oldImage && !isDataUrl(oldImage)) {
      this._pendingImageDeletes.push(oldImage);
    }
    this.setData({ "draft.image": "" });
  },

  // ---- 食材 / 调味料 ----
  updateItem(e) {
    const { id, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const draft = this.data.draft;
    const ingredients = draft.ingredients.map((item) => (item.id === id ? { ...item, [field]: value } : item));
    this.setData({ "draft.ingredients": ingredients });
    this.refreshSections();
  },

  onUnitChange(e) {
    const { id } = e.currentTarget.dataset;
    const value = UNIT_VALUES[Number(e.detail.value)] || "";
    const draft = this.data.draft;
    const ingredients = draft.ingredients.map((item) => (item.id === id ? { ...item, unit: value } : item));
    this.setData({ "draft.ingredients": ingredients });
    this.refreshSections();
  },

  onCategoryChange(e) {
    const { id } = e.currentTarget.dataset;
    const value = CATEGORIES[Number(e.detail.value)] || "食材";
    const draft = this.data.draft;
    const ingredients = draft.ingredients.map((item) => (item.id === id ? { ...item, category: value } : item));
    this.setData({ "draft.ingredients": ingredients });
    this.refreshSections();
  },

  addItem(e) {
    const category = e.currentTarget.dataset.category || "食材";
    const draft = this.data.draft;
    const ingredients = [...draft.ingredients, createBlankItem(category)];
    this.setData({ "draft.ingredients": ingredients });
    this.refreshSections();
  },

  removeItem(e) {
    const { id } = e.currentTarget.dataset;
    const draft = this.data.draft;
    const ingredients = draft.ingredients.filter((item) => item.id !== id);
    this.setData({ "draft.ingredients": ingredients.length ? ingredients : [createBlankItem()] });
    this.refreshSections();
  },

  moveItem(e) {
    const { id, dir } = e.currentTarget.dataset;
    const direction = Number(dir);
    const draft = this.data.draft;
    const ingredients = [...draft.ingredients];
    const index = ingredients.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    const targetCategory = ingredients[index].category;
    let neighbor = -1;
    for (let i = index + direction; i >= 0 && i < ingredients.length; i += direction) {
      if (ingredients[i].category === targetCategory) {
        neighbor = i;
        break;
      }
    }
    if (neighbor === -1) {
      return;
    }
    [ingredients[index], ingredients[neighbor]] = [ingredients[neighbor], ingredients[index]];
    this.setData({ "draft.ingredients": ingredients });
    this.refreshSections();
  },

  // ---- 保存 / 取消 ----
  save() {
    const draft = this.data.draft;
    const title = (draft.title || "").trim();
    if (!title) {
      wx.showToast({ title: "请填写食谱名称", icon: "none" });
      return;
    }
    const normalized = {
      ...draft,
      title,
      category: (draft.category || "").trim(),
      ingredients: draft.ingredients.filter((item) => item.name.trim()),
      method: (draft.method || "").trim(),
      rawText: (draft.rawText || "").trim(),
      updatedAt: createTimestamp(),
    };
    const state = app.globalData.appState;
    const exists = state.recipes.some((item) => item.id === normalized.id);
    const recipes = exists
      ? state.recipes.map((item) => (item.id === normalized.id ? normalized : item))
      : [normalized, ...state.recipes];
    app.globalData.appState = { ...state, recipes };
    app.saveState();
    this.flushImageDeletes();
    wx.navigateBack();
  },

  flushImageDeletes() {
    (this._pendingImageDeletes || []).forEach((filePath) => deleteImageFile(filePath));
    this._pendingImageDeletes = [];
  },

  cancel() {
    wx.navigateBack();
  },
});
