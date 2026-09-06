const app = getApp();
const { getTodayKey, shiftDay } = require("../../utils/domain/mealPlan");
const { splitKeywords, matchesAllKeywords } = require("../../utils/domain/search");
const { getItemsForRecipe } = require("../../utils/domain/recipes");
const { addSelectedToShopping } = require("../../utils/shoppingOps");
const { decorateRecipe } = require("../../utils/presenter");

Page({
  data: {
    recipeSearch: "",
    recipeCategory: "",
    categories: [],
    filtered: [],
    expandedId: "",
    menuPickerId: "",
    statusMessage: "",
    todayKey: "",
    tomorrowKey: "",
    popupVisible: false,
    popupRecipe: { title: "", items: [] },
  },

  onShow() {
    this.refresh();
  },

  onUnload() {
    clearTimeout(this._statusTimer);
  },

  getState() {
    return app.globalData.appState;
  },

  persist(nextState) {
    app.globalData.appState = nextState;
    app.saveState();
  },

  refresh() {
    const state = this.getState();
    const categories = Array.from(new Set(state.recipes.map((recipe) => (recipe.category || "").trim()).filter(Boolean))).sort();
    let recipeCategory = this.data.recipeCategory;
    if (recipeCategory && !categories.includes(recipeCategory)) {
      recipeCategory = "";
    }
    this.setData({
      categories,
      recipeCategory,
      todayKey: getTodayKey(),
      tomorrowKey: shiftDay(getTodayKey(), 1),
      filtered: this.computeFiltered(state, this.data.recipeSearch, recipeCategory),
    });
  },

  computeFiltered(state, query, category) {
    const keywords = splitKeywords(query);
    return state.recipes
      .filter((recipe) => {
        if (category && recipe.category !== category) {
          return false;
        }
        if (!keywords.length) {
          return true;
        }
        const itemText = getItemsForRecipe(recipe)
          .map((item) => `${item.name} ${item.category}`)
          .join(" ");
        const text = [recipe.title, recipe.category, recipe.method, recipe.rawText, itemText].join(" ").toLowerCase();
        return matchesAllKeywords(text, keywords);
      })
      .map(decorateRecipe);
  },

  showStatus(message) {
    this.setData({ statusMessage: message });
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this.setData({ statusMessage: "" }), 2200);
  },

  onSearchInput(e) {
    const recipeSearch = e.detail.value;
    this.setData({
      recipeSearch,
      filtered: this.computeFiltered(this.getState(), recipeSearch, this.data.recipeCategory),
    });
  },

  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      recipeCategory: category,
      filtered: this.computeFiltered(this.getState(), this.data.recipeSearch, category),
    });
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedId: this.data.expandedId === id ? "" : id });
  },

  toggleMenuPicker(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ menuPickerId: this.data.menuPickerId === id ? "" : id });
  },

  startNew() {
    wx.navigateTo({ url: "/pages/recipe-edit/recipe-edit" });
  },

  editRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/recipe-edit/recipe-edit?id=${id}` });
  },

  deleteRecipe(e) {
    const id = e.currentTarget.dataset.id;
    const state = this.getState();
    const recipe = state.recipes.find((item) => item.id === id);
    wx.showModal({
      title: "删除食谱",
      content: `确定删除「${recipe ? recipe.title : ""}」？将同时从菜单计划移除。`,
      success: (res) => {
        if (res.confirm) {
          this.persist({
            ...state,
            recipes: state.recipes.filter((item) => item.id !== id),
            mealPlan: state.mealPlan.filter((entry) => entry.recipeId !== id),
          });
          this.setData({ expandedId: "", menuPickerId: "" });
          this.refresh();
        }
      },
    });
  },

  addToDate(e) {
    const { id, date } = e.currentTarget.dataset;
    const state = this.getState();
    const recipe = state.recipes.find((item) => item.id === id);
    if (!recipe) {
      return;
    }
    const exists = state.mealPlan.some((entry) => entry.date === date && entry.recipeId === id);
    if (!exists) {
      this.persist({ ...state, mealPlan: [...state.mealPlan, { date, recipeId: id }] });
    }
    this.setData({ menuPickerId: "" });
    this.openPopup(recipe);
  },

  openPopup(recipe) {
    const items = getItemsForRecipe(recipe).map((item) => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      category: item.category,
    }));
    this.setData({ popupVisible: true, popupRecipe: { title: recipe.title, items } });
  },

  onPopupClose() {
    this.setData({ popupVisible: false });
  },

  onPopupAdd(e) {
    const { items, title } = e.detail;
    if (!items || !items.length) {
      return;
    }
    const { state, count } = addSelectedToShopping(this.getState(), items, title);
    this.persist(state);
    this.setData({ popupVisible: false });
    this.showStatus(`已加入 ${count} 项到采购清单`);
  },
});
