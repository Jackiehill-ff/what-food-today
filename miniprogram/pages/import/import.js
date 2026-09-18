const app = getApp();
const { parseRecipeImportText } = require("../../utils/domain/importParser");
const { createBlankItem } = require("../../utils/domain/recipes");
const { createTimestamp } = require("../../utils/domain/ids");

Page({
  data: {
    importText: "",
    drafts: [],
    importStatus: "",
  },

  onInput(e) {
    this.setData({ importText: e.detail.value });
  },

  parse() {
    const drafts = parseRecipeImportText(this.data.importText);
    const needsFix = drafts.some((draft) => !draft.title.trim() || !draft.method.trim());
    this.setData({ drafts, importStatus: needsFix ? "有内容需要手动补全" : "" });
  },

  updateDraft(e) {
    const { id, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      drafts: this.data.drafts.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)),
    });
  },

  updateIngredient(e) {
    const { draftId, itemId } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      drafts: this.data.drafts.map((draft) =>
        draft.id === draftId
          ? { ...draft, ingredients: draft.ingredients.map((item) => (item.id === itemId ? { ...item, name: value } : item)) }
          : draft,
      ),
    });
  },

  addIngredient(e) {
    const { draftId, category } = e.currentTarget.dataset;
    const itemCategory = category === "调味料" ? "调味料" : "食材";
    this.setData({
      drafts: this.data.drafts.map((draft) => {
        if (draft.id !== draftId) {
          return draft;
        }
        // 新行插到对应类别的最上面（该类别还没有条目时：食材放最前，调味料排在食材后）
        const ingredients = [...draft.ingredients];
        const firstIndex = ingredients.findIndex((item) => item.category === itemCategory);
        if (firstIndex === -1) {
          if (itemCategory === "食材") {
            ingredients.unshift(createBlankItem(itemCategory));
          } else {
            ingredients.push(createBlankItem(itemCategory));
          }
        } else {
          ingredients.splice(firstIndex, 0, createBlankItem(itemCategory));
        }
        return { ...draft, ingredients };
      }),
    });
  },

  removeIngredient(e) {
    const { draftId, itemId } = e.currentTarget.dataset;
    this.setData({
      drafts: this.data.drafts.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ingredients: draft.ingredients.length === 1 ? draft.ingredients : draft.ingredients.filter((item) => item.id !== itemId),
            }
          : draft,
      ),
    });
  },

  save() {
    const recipes = this.data.drafts
      .map((draft) => ({
        id: draft.id,
        title: draft.title.trim(),
        type: "full",
        category: "",
        ingredients: draft.ingredients
          .map((item) => ({
            ...item,
            name: item.name.trim(),
            amount: (item.amount || "").trim(),
            unit: (item.unit || "").trim(),
            category: item.category || "食材",
          }))
          .filter((item) => item.name),
        method: draft.method.trim(),
        rawText: draft.rawText.trim(),
        createdAt: draft.createdAt,
        updatedAt: createTimestamp(),
      }))
      .filter((recipe) => recipe.title);

    if (!recipes.length) {
      this.setData({ importStatus: "至少需要一个标题" });
      return;
    }

    const state = app.globalData.appState;
    app.globalData.appState = { ...state, recipes: [...recipes, ...state.recipes] };
    app.saveState();
    this.setData({ drafts: [], importText: "", importStatus: `已保存 ${recipes.length} 个食谱` });
    wx.navigateBack();
  },
});
