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
    // 分享菜单状态：select=勾选食谱，preview=画布预览
    shareStep: "",
    shareItems: [],
    sharePickCount: 0,
    shareCanvasH: 480,
    // 拖动排序状态
    dragIndex: -1,
    dragOffset: 0,
    dragShifts: [],
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
      dragIndex: -1,
      dragShifts: planned.map(() => 0),
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

  // ===== 长按拖动排序 =====
  onCardLongPress(e) {
    const { index } = e.currentTarget.dataset;
    if (this.data.planned.length < 2 || this.data.openMenuId) {
      return;
    }
    const touch = e.touches && e.touches[0];
    if (!touch) {
      return;
    }
    wx.createSelectorQuery()
      .in(this)
      .selectAll(".plan-card")
      .boundingClientRect((rects) => {
        if (!rects || rects.length !== this.data.planned.length) {
          return;
        }
        this._dragRects = rects;
        this._dragStartY = touch.clientY;
        this.setData({ dragIndex: index, dragOffset: 0, dragShifts: rects.map(() => 0) });
        wx.vibrateShort({ type: "medium", fail: () => {} });
      })
      .exec();
  },

  onCardTouchMove(e) {
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

  onCardTouchEnd() {
    const { dragIndex, planned } = this.data;
    if (dragIndex < 0) {
      return;
    }
    const target = this._dragTarget;
    this._dragTarget = dragIndex;
    this.setData({ dragIndex: -1, dragOffset: 0, dragShifts: planned.map(() => 0) });
    if (target === undefined || target === dragIndex) {
      return;
    }
    const next = [...planned];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    const state = this.getState();
    this.persist({
      ...state,
      mealPlan: reorderMealPlanEntries(state.mealPlan, this.data.planDate, next.map((recipe) => recipe.id)),
    });
    this.refresh();
    wx.vibrateShort({ type: "light", fail: () => {} });
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

  // ===== 分享菜单：先勾选当天食谱，再生成无图居中模板的分享图 =====
  shareMenu() {
    const { planned } = this.data;
    if (!planned.length) {
      this.showStatus("当天没有安排，先加一道菜吧");
      return;
    }
    this.setData({
      shareStep: "select",
      shareItems: planned.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        checked: true,
        // 主要食材信息：仅食材名称，顿号分隔
        summary: (recipe.ingredients || [])
          .filter((item) => item.category === "食材" && item.name.trim())
          .map((item) => item.name.trim())
          .join("、"),
      })),
      sharePickCount: planned.length,
    });
  },

  closeShare() {
    this.setData({ shareStep: "" });
  },

  toggleSharePick(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.shareItems[index];
    if (!item) {
      return;
    }
    const checked = !item.checked;
    const sharePickCount = this.data.shareItems.filter((entry) => (entry.id === item.id ? checked : entry.checked)).length;
    this.setData({ [`shareItems[${index}].checked`]: checked, sharePickCount });
  },

  noop() {},

  generateShare() {
    const items = this.data.shareItems.filter((item) => item.checked);
    if (!items.length) {
      return;
    }
    // 画布放在可见的预览弹窗内（离屏/负偏移画布在真机上不渲染，导出会失败）
    this.setData({ shareStep: "preview" }, () => {
      wx.createSelectorQuery()
        .in(this)
        .select("#share-canvas")
        .fields({ node: true, size: true })
        .exec((res) => {
          const info = res && res[0];
          if (!info || !info.node) {
            this.showStatus("画布加载失败，请重试");
            this.setData({ shareStep: "select" });
            return;
          }
          this._shareCanvas = info.node;
          this.renderShareCanvas(info.node, items, this.data.dayHeader);
        });
    });
  },

  // 食材行按最大宽度折行，超出 maxLines 时截断加省略号
  wrapShareText(ctx, text, maxWidth, maxLines) {
    const chars = Array.from(text || "");
    const lines = [];
    let current = "";
    for (let i = 0; i < chars.length; i += 1) {
      const candidate = current + chars[i];
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = chars[i];
      } else {
        current = candidate;
      }
    }
    if (current) {
      lines.push(current);
    }
    if (lines.length <= maxLines) {
      return lines;
    }
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = `${last}…`;
    return kept;
  },

  renderShareCanvas(canvas, items, dayHeader) {
    const W = 600;
    const dpr = 2;
    const ctx = canvas.getContext("2d");
    // 先用目标字号测量食材折行，据此算出画布总高
    ctx.font = "24px sans-serif";
    const wraps = items.map((item) => this.wrapShareText(ctx, item.summary || "食材待补充", 460, 2));
    const blockHeights = wraps.map((lines) => 76 + (lines.length - 1) * 34);
    const headerH = 150;
    const footerH = 120;
    const dividerGap = 30;
    const H = headerH + blockHeights.reduce((sum, h) => sum + h, 0) + (items.length - 1) * dividerGap + footerH;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    // 重设宽高会清空画布状态，scale 必须放在这之后
    ctx.scale(dpr, dpr);
    this.setData({ shareCanvasH: Math.round((486 * H) / W) });

    ctx.fillStyle = "#f6f2ec";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    // 头部：品牌名 + 日期 + 杏黄装饰条
    ctx.fillStyle = "#254139";
    ctx.font = "700 46px sans-serif";
    ctx.fillText("今天吃啥？", W / 2, 80);
    ctx.fillStyle = "#5c6d63";
    ctx.font = "26px sans-serif";
    ctx.fillText(dayHeader, W / 2, 120);
    ctx.fillStyle = "#f2b35c";
    ctx.fillRect(W / 2 - 36, 138, 72, 6);
    // 菜品：居中上下排列（菜名 + 主要食材）
    let top = headerH;
    items.forEach((item, index) => {
      const lines = wraps[index];
      ctx.fillStyle = "#1d2521";
      ctx.font = "600 32px sans-serif";
      ctx.fillText(item.title, W / 2, top + 40);
      ctx.fillStyle = "#5c6d63";
      ctx.font = "24px sans-serif";
      lines.forEach((line, lineIndex) => {
        ctx.fillText(line, W / 2, top + 76 + lineIndex * 34);
      });
      top += blockHeights[index];
      if (index < items.length - 1) {
        ctx.fillStyle = "#e5dfd3";
        ctx.fillRect(W / 2 - 220, top + dividerGap / 2 - 1, 440, 2);
        top += dividerGap;
      }
    });
    // 底部落款
    ctx.fillStyle = "#8a978e";
    ctx.font = "22px sans-serif";
    ctx.fillText(`共 ${items.length} 道菜 · 计划有饭`, W / 2, H - 52);
  },

  exportShareImage(done) {
    if (!this._shareCanvas) {
      return;
    }
    wx.canvasToTempFilePath({
      canvas: this._shareCanvas,
      success: (res) => done(res.tempFilePath),
      fail: () => this.showStatus("生成图片失败，请重试"),
    });
  },

  saveShareImage() {
    this.exportShareImage((filePath) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => this.showStatus("已保存到相册"),
        fail: (error) =>
          this.showStatus(error.errMsg && error.errMsg.includes("auth") ? "请在设置中允许保存图片" : "保存失败"),
      });
    });
  },

  sendShareImage() {
    this.exportShareImage((filePath) => {
      wx.showShareImageMenu({
        path: filePath,
        success: () => {},
        fail: () => this.showStatus("当前环境不支持，可保存图片后手动发送"),
      });
    });
  },
});
