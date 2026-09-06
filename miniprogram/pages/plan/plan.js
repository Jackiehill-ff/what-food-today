const app = getApp();
const {
  getTodayKey,
  shiftDay,
  formatDayHeader,
  getPlannedRecipesForDate,
  reorderMealPlanEntries,
  moveMealPlanEntry,
} = require("../../utils/domain/mealPlan");
const { splitKeywords, matchesAllKeywords } = require("../../utils/domain/search");
const { getItemsForRecipe } = require("../../utils/domain/recipes");
const { addSelectedToShopping } = require("../../utils/shoppingOps");
const { decorateRecipe } = require("../../utils/presenter");

Page({
  data: {
    planDate: "",
    dayHeader: "",
    isToday: true,
    planned: [],
    planSearch: "",
    hasQuery: false,
    searchResults: [],
    openMenuId: "",
    statusMessage: "",
    popupVisible: false,
    popupRecipe: { title: "", items: [] },
  },

  onLoad() {
    this.setData({ planDate: getTodayKey() });
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

  recipesById() {
    const map = new Map();
    this.getState().recipes.forEach((recipe) => map.set(recipe.id, recipe));
    return map;
  },

  persist(nextState) {
    app.globalData.appState = nextState;
    app.saveState();
  },

  refresh() {
    const state = this.getState();
    const planDate = this.data.planDate || getTodayKey();
    const planned = getPlannedRecipesForDate(state.mealPlan, planDate, this.recipesById()).map(decorateRecipe);
    this.setData({
      planDate,
      dayHeader: formatDayHeader(planDate),
      isToday: planDate === getTodayKey(),
      planned,
      openMenuId: "",
    });
  },

  showStatus(message) {
    this.setData({ statusMessage: message });
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this.setData({ statusMessage: "" }), 2200);
  },

  prevDay() {
    this.setData({ planDate: shiftDay(this.data.planDate, -1) }, () => this.refresh());
  },

  nextDay() {
    this.setData({ planDate: shiftDay(this.data.planDate, 1) }, () => this.refresh());
  },

  goToday() {
    this.setData({ planDate: getTodayKey() }, () => this.refresh());
  },

  onSearchInput(e) {
    const query = e.detail.value;
    this.setData({
      planSearch: query,
      hasQuery: Boolean(query.trim()),
      searchResults: this.computeSearchResults(query),
    });
  },

  computeSearchResults(query) {
    const keywords = splitKeywords(query);
    if (!keywords.length) {
      return [];
    }
    const state = this.getState();
    const plannedIds = new Set(this.data.planned.map((recipe) => recipe.id));
    return state.recipes
      .filter((recipe) => !plannedIds.has(recipe.id))
      .filter((recipe) => {
        const itemText = getItemsForRecipe(recipe)
          .map((item) => item.name)
          .join(" ");
        const text = [recipe.title, recipe.category, recipe.method, recipe.rawText, itemText].join(" ").toLowerCase();
        return matchesAllKeywords(text, keywords);
      })
      .slice(0, 8)
      .map(decorateRecipe);
  },

  addRecipe(e) {
    const recipeId = e.currentTarget.dataset.id;
    const state = this.getState();
    const recipe = state.recipes.find((item) => item.id === recipeId);
    if (!recipe) {
      return;
    }
    const planDate = this.data.planDate;
    const exists = state.mealPlan.some((entry) => entry.date === planDate && entry.recipeId === recipeId);
    if (!exists) {
      this.persist({ ...state, mealPlan: [...state.mealPlan, { date: planDate, recipeId }] });
    }
    this.setData({ planSearch: "", hasQuery: false, searchResults: [] });
    this.refresh();
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

  toggleMenu(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ openMenuId: this.data.openMenuId === id ? "" : id });
  },

  moveRecipe(e) {
    const { id, dir } = e.currentTarget.dataset;
    const direction = Number(dir);
    const state = this.getState();
    const planDate = this.data.planDate;
    const ids = state.mealPlan.filter((entry) => entry.date === planDate).map((entry) => entry.recipeId);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ids.length) {
      return;
    }
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.persist({ ...state, mealPlan: reorderMealPlanEntries(state.mealPlan, planDate, ids) });
    this.refresh();
  },

  onMenuChangeDate(e) {
    const recipeId = e.currentTarget.dataset.id;
    const toDate = e.detail.value;
    if (!toDate || toDate === this.data.planDate) {
      return;
    }
    const state = this.getState();
    this.persist({ ...state, mealPlan: moveMealPlanEntry(state.mealPlan, this.data.planDate, recipeId, toDate) });
    this.setData({ openMenuId: "" });
    this.showStatus(`已改到 ${formatDayHeader(toDate)}`);
    this.refresh();
  },

  removeRecipe(e) {
    const recipeId = e.currentTarget.dataset.id;
    const state = this.getState();
    const planDate = this.data.planDate;
    this.persist({
      ...state,
      mealPlan: state.mealPlan.filter((entry) => !(entry.date === planDate && entry.recipeId === recipeId)),
    });
    this.setData({ openMenuId: "" });
    this.refresh();
  },
});
