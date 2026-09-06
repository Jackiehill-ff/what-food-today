const app = getApp();
const { sortShoppingItems } = require("../../utils/domain/shopping");
const { createId } = require("../../utils/domain/ids");
const { CATEGORIES } = require("../../utils/domain/constants");

const UNIT_VALUES = ["", "g", "tsp"];

Page({
  data: {
    items: [],
    manualOpen: false,
    manual: { name: "", amount: "", unit: "", category: "食材" },
    unitValues: UNIT_VALUES,
    unitLabels: ["无", "克 (g)", "茶匙 (tsp)"],
    categories: CATEGORIES,
    statusMessage: "",
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
    const items = sortShoppingItems(state.shoppingItems).map((item) => ({
      ...item,
      amountLabel: [item.amount, item.unit].filter(Boolean).join("") || "适量",
    }));
    this.setData({ items });
  },

  showStatus(message) {
    this.setData({ statusMessage: message });
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this.setData({ statusMessage: "" }), 2200);
  },

  toggleItem(e) {
    const id = e.currentTarget.dataset.id;
    const state = this.getState();
    const shoppingItems = state.shoppingItems.map((item) =>
      item.id === id ? { ...item, checked: !item.checked, checkedAt: !item.checked ? Date.now() : undefined } : item,
    );
    this.persist({ ...state, shoppingItems });
    this.refresh();
  },

  batchDelete() {
    const state = this.getState();
    const count = state.shoppingItems.filter((item) => item.checked).length;
    if (!count) {
      this.showStatus("没有已勾选的采购项");
      return;
    }
    wx.showModal({
      title: "批量删除",
      content: `确定删除 ${count} 个已勾选的采购项？`,
      success: (res) => {
        if (res.confirm) {
          this.persist({ ...state, shoppingItems: state.shoppingItems.filter((item) => !item.checked) });
          this.showStatus(`已删除 ${count} 个已勾选项`);
          this.refresh();
        }
      },
    });
  },

  copyList() {
    const text = this.data.items
      .map((item) => {
        const amount = [item.amount, item.unit].filter(Boolean).join("");
        return `- ${item.name}${amount ? ` ${amount}` : ""}`;
      })
      .join("\n");
    if (!text) {
      this.showStatus("清单为空");
      return;
    }
    wx.setClipboardData({ data: text, success: () => this.showStatus("已复制采购清单") });
  },

  openManual() {
    this.setData({ manualOpen: true });
  },

  closeManual() {
    this.setData({ manualOpen: false });
  },

  noop() {},

  onManualInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`manual.${field}`]: e.detail.value });
  },

  onManualUnit(e) {
    this.setData({ "manual.unit": UNIT_VALUES[Number(e.detail.value)] || "" });
  },

  onManualCategory(e) {
    this.setData({ "manual.category": CATEGORIES[Number(e.detail.value)] || "食材" });
  },

  addManual() {
    const manual = this.data.manual;
    const name = (manual.name || "").trim();
    if (!name) {
      return;
    }
    const state = this.getState();
    const item = {
      id: createId(),
      date: "",
      name,
      amount: (manual.amount || "").trim(),
      unit: (manual.unit || "").trim(),
      category: manual.category,
      sourceLabel: "手动添加",
      createdAt: Date.now(),
      checked: false,
    };
    this.persist({ ...state, shoppingItems: [...state.shoppingItems, item] });
    this.setData({ manualOpen: false, manual: { name: "", amount: "", unit: "", category: "食材" } });
    this.refresh();
  },
});
