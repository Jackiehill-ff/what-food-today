const app = getApp();
const { sortShoppingItems, maxShoppingOrder } = require("../../utils/domain/shopping");
const { createId } = require("../../utils/domain/ids");
const { CATEGORIES } = require("../../utils/domain/constants");

const UNIT_VALUES = ["", "g", "tsp"];

Page({
  data: {
    items: [],
    manualOpen: false,
    manual: { name: "", amount: "", unit: "", category: "食材" },
    editOpen: false,
    edit: { id: "", name: "", amount: "", unit: "", category: "食材" },
    unitValues: UNIT_VALUES,
    unitLabels: ["无", "克 (g)", "茶匙 (tsp)"],
    categories: CATEGORIES,
    statusMessage: "",
    // 拖动排序状态
    dragIndex: -1,
    dragOffset: 0,
    dragShifts: [],
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
    this.setData({ items, dragIndex: -1, dragOffset: 0, dragShifts: items.map(() => 0) });
  },

  showStatus(message) {
    this.setData({ statusMessage: message });
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => this.setData({ statusMessage: "" }), 2200);
  },

  // ===== 长按拖动排序（交互与菜单计划页一致） =====
  onItemLongPress(e) {
    const { index } = e.currentTarget.dataset;
    if (this.data.items.length < 2 || this.data.editOpen || this.data.manualOpen) {
      return;
    }
    const touch = e.touches && e.touches[0];
    if (!touch) {
      return;
    }
    wx.createSelectorQuery()
      .in(this)
      .selectAll(".shop-item")
      .boundingClientRect((rects) => {
        if (!rects || rects.length !== this.data.items.length) {
          return;
        }
        this._dragRects = rects;
        this._dragStartY = touch.clientY;
        this.setData({ dragIndex: index, dragOffset: 0, dragShifts: rects.map(() => 0) });
        wx.vibrateShort({ type: "medium", fail: () => {} });
      })
      .exec();
  },

  onItemTouchMove(e) {
    const dragIndex = this.data.dragIndex;
    if (dragIndex < 0 || !this._dragRects) {
      return;
    }
    const touch = e.touches && e.touches[0];
    if (!touch) {
      return;
    }
    const dy = touch.clientY - this._dragStartY;
    const rects = this._dragRects;
    const heights = rects.map((rect) => rect.height);
    const gaps = rects.slice(1).map((rect, i) => rect.top - (rects[i].top + heights[i]));
    const draggedCenter = rects[dragIndex].top + heights[dragIndex] / 2 + dy;
    // 计算拖动项当前落在哪个槽位
    let target = dragIndex;
    for (let i = 0; i < rects.length; i += 1) {
      const center = rects[i].top + heights[i] / 2;
      if (Math.abs(draggedCenter - center) < Math.abs(draggedCenter - (rects[target].top + heights[target] / 2))) {
        target = i;
      }
    }
    const step = (heights[dragIndex] + (gaps[0] || 0)) * (target > dragIndex ? 1 : -1);
    const dragShifts = rects.map((rect, i) => {
      if (dragIndex === target || i === dragIndex) {
        return 0;
      }
      if (target > dragIndex && i > dragIndex && i <= target) {
        return -step;
      }
      if (target < dragIndex && i >= target && i < dragIndex) {
        return step;
      }
      return 0;
    });
    // 把被挤开的位移补到拖动项上，让它贴着目标槽位
    let offset = dy;
    if (target > dragIndex) {
      for (let i = dragIndex; i < target; i += 1) {
        offset += heights[i] + (gaps[i] || 0);
      }
    } else if (target < dragIndex) {
      for (let i = target; i < dragIndex; i += 1) {
        offset -= heights[i] + (gaps[i] || 0);
      }
    }
    this._dragTarget = target;
    this.setData({ dragOffset: offset, dragShifts });
  },

  onItemTouchEnd() {
    const { dragIndex, items } = this.data;
    if (dragIndex < 0) {
      return;
    }
    const target = this._dragTarget;
    this._dragTarget = dragIndex;
    this.setData({ dragIndex: -1, dragOffset: 0, dragShifts: items.map(() => 0) });
    if (target === undefined || target === dragIndex) {
      return;
    }
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    // 落位后给全部可见项写入手动顺序号并持久化；未拖过的旧数据保持「分类 → 添加时间」
    const orderById = new Map();
    next.forEach((item, index) => orderById.set(item.id, index));
    const state = this.getState();
    this.persist({
      ...state,
      shoppingItems: state.shoppingItems.map((item) =>
        orderById.has(item.id) ? { ...item, order: orderById.get(item.id) } : item,
      ),
    });
    this.refresh();
    wx.vibrateShort({ type: "light", fail: () => {} });
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
      order: maxShoppingOrder(state.shoppingItems) + 1,
      checked: false,
    };
    this.persist({ ...state, shoppingItems: [...state.shoppingItems, item] });
    this.setData({ manualOpen: false, manual: { name: "", amount: "", unit: "", category: "食材" } });
    this.refresh();
  },

  // ===== 单项编辑 / 删除 =====
  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.getState().shoppingItems.find((entry) => entry.id === id);
    if (!item) {
      return;
    }
    this.setData({
      editOpen: true,
      edit: { id, name: item.name, amount: item.amount || "", unit: item.unit || "", category: item.category || "食材" },
    });
  },

  closeEdit() {
    this.setData({ editOpen: false });
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`edit.${field}`]: e.detail.value });
  },

  onEditUnit(e) {
    this.setData({ "edit.unit": UNIT_VALUES[Number(e.detail.value)] || "" });
  },

  onEditCategory(e) {
    this.setData({ "edit.category": CATEGORIES[Number(e.detail.value)] || "食材" });
  },

  saveEdit() {
    const edit = this.data.edit;
    const name = (edit.name || "").trim();
    if (!name) {
      return;
    }
    const state = this.getState();
    this.persist({
      ...state,
      shoppingItems: state.shoppingItems.map((item) =>
        item.id === edit.id
          ? { ...item, name, amount: (edit.amount || "").trim(), unit: (edit.unit || "").trim(), category: edit.category }
          : item,
      ),
    });
    this.setData({ editOpen: false });
    this.refresh();
  },

  deleteEdit() {
    const id = this.data.edit.id;
    wx.showModal({
      title: "删除采购项",
      content: `确定删除「${this.data.edit.name}」？`,
      success: (res) => {
        if (res.confirm) {
          const state = this.getState();
          this.persist({ ...state, shoppingItems: state.shoppingItems.filter((item) => item.id !== id) });
          this.setData({ editOpen: false });
          this.refresh();
        }
      },
    });
  },
});
