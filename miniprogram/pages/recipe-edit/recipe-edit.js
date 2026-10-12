const app = getApp();
const { createTimestamp } = require("../../utils/domain/ids");
const { createBlankItem } = require("../../utils/domain/recipes");
const { isDataUrl, deleteImageFile } = require("../../utils/images");
const { createPageShare } = require("../../utils/share");

const CATEGORIES = ["食材", "调味料"];

const mimeForPath = (filePath) => {
  const ext = (String(filePath || "").split(".").pop() || "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
};

Page({
  // 编辑页分享落地到首页（别人打开编辑页无数据）
  ...createPageShare({ title: "计划有饭 · 今天吃啥？" }),

  data: {
    editingId: "",
    draft: null,
    food: [],
    seasoning: [],
    categories: CATEGORIES,
    // 逐项编辑弹窗：{ section: 'food'|'seasoning', id, name, amount, isNew }
    editing: null,
    // 列表长按拖动排序状态（dragSection: 'food'|'seasoning' 为拖动来源分区，两分区各存一份让位偏移）
    dragSection: "",
    dragIndex: -1,
    dragOffset: 0,
    foodShifts: [],
    seasoningShifts: [],
  },

  onLoad(options) {
    this._pendingImageDeletes = [];
    const id = options && options.id;
    if (id) {
      const recipe = app.globalData.appState.recipes.find((item) => item.id === id);
      if (recipe) {
        this.setData({
          draft: { ...recipe, ingredients: recipe.ingredients.map((item) => ({ ...item })) },
          editingId: id,
        });
        this.refreshSections();
        return;
      }
    }
    // 新增食谱统一走导入流程（粘贴文本 / 图片识别），本页仅用于编辑已有食谱
    wx.redirectTo({ url: "/pages/import/import" });
  },

  // 列表只展示已有信息：数量/单位为空就不显示（不显示「无」）
  refreshSections() {
    const draft = this.data.draft;
    const decorate = (item) => ({ ...item, amountText: [item.amount, item.unit].filter(Boolean).join("") });
    const hasContent = (item) => item.name.trim() || (item.amount || "").trim();
    this.setData({
      food: draft.ingredients.filter((item) => item.category === "食材" && hasContent(item)).map(decorate),
      seasoning: draft.ingredients.filter((item) => item.category === "调味料" && hasContent(item)).map(decorate),
    });
  },

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`draft.${field}`]: e.detail.value });
  },

  noop() {},

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

  // ---- 食材 / 调味料：列表 + 逐项编辑弹窗 ----
  findItem(id) {
    return this.data.draft.ingredients.filter((item) => item.id === id)[0];
  },

  setIngredients(ingredients) {
    this.setData({ "draft.ingredients": ingredients });
    this.refreshSections();
  },

  addItem(e) {
    const category = e.currentTarget.dataset.category || "食材";
    const draft = this.data.draft;
    const ingredients = [...draft.ingredients];
    const blank = createBlankItem(category);
    // 新行插到该类别最上面（而不是追加到列表末尾）
    const firstIndex = ingredients.findIndex((item) => item.category === category);
    if (firstIndex === -1) {
      // 该类别还没有条目：食材放整表最前，调味料排在食材之后
      if (category === "食材") {
        ingredients.unshift(blank);
      } else {
        ingredients.push(blank);
      }
    } else {
      ingredients.splice(firstIndex, 0, blank);
    }
    this.setIngredients(ingredients);
    // 新行立即弹出编辑框，直接填写
    this.openEditor(category === "调味料" ? "seasoning" : "food", blank.id, true);
  },

  openEditor(section, id, isNew) {
    const item = this.findItem(id);
    if (!item) {
      return;
    }
    // 所在分区即分类（食材区/调味料区），弹窗内不再提供分类切换
    this.setData({
      editing: {
        section,
        id,
        isNew: Boolean(isNew),
        name: item.name,
        amount: item.amount,
      },
    });
  },

  openItemEditor(e) {
    const { section, id } = e.currentTarget.dataset;
    this.openEditor(section, id, false);
  },

  onEditField(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editing.${field}`]: e.detail.value });
  },

  saveEditing() {
    const editing = this.data.editing;
    if (!editing) {
      return;
    }
    const ingredients = this.data.draft.ingredients.map((item) =>
      item.id === editing.id ? { ...item, name: editing.name, amount: editing.amount } : item,
    );
    this.setData({ editing: null });
    this.setIngredients(ingredients);
  },

  cancelEditing() {
    const editing = this.data.editing;
    this.setData({ editing: null });
    // 新加又没填内容的行：取消时移除，避免列表残留空行
    if (editing && editing.isNew) {
      const item = this.findItem(editing.id);
      if (item && !item.name.trim() && !(item.amount || "").trim()) {
        this.setIngredients(this.data.draft.ingredients.filter((entry) => entry.id !== editing.id));
      }
    }
  },

  deleteEditingItem() {
    const editing = this.data.editing;
    if (!editing) {
      return;
    }
    const ingredients = this.data.draft.ingredients.filter((item) => item.id !== editing.id);
    this.setData({ editing: null });
    this.setIngredients(ingredients);
  },

  // ---- 列表长按拖动排序（同分区排序 + 跨分区拖动改分类，交互与菜单计划/采购清单一致） ----
  onRowLongPress(e) {
    const { section, index } = e.currentTarget.dataset;
    const rows = this.data[section];
    const other = section === "food" ? "seasoning" : "food";
    if (!rows || !rows.length || this.data.editing) {
      return;
    }
    // 本分区只有一行且另一分区也没有行时，拖动不可能产生任何变化
    if (rows.length + (this.data[other] || []).length < 2) {
      return;
    }
    const touch = e.touches && e.touches[0];
    if (!touch) {
      return;
    }
    // 两分区的行 + 分区容器都量下来：行用于算槽位，容器用于判断拖到哪个分区（空分区也能承接）
    wx.createSelectorQuery()
      .in(this)
      .selectAll(".food-row")
      .boundingClientRect()
      .selectAll(".seasoning-row")
      .boundingClientRect()
      .select(".section-food")
      .boundingClientRect()
      .select(".section-seasoning")
      .boundingClientRect()
      .exec((res) => {
        const foodRects = res[0];
        const seasoningRects = res[1];
        const foodSection = res[2];
        const seasoningSection = res[3];
        if (
          !foodRects ||
          !seasoningRects ||
          !foodSection ||
          !seasoningSection ||
          foodRects.length !== this.data.food.length ||
          seasoningRects.length !== this.data.seasoning.length
        ) {
          return;
        }
        this._dragRects = { food: foodRects, seasoning: seasoningRects };
        this._dragSections = { food: foodSection, seasoning: seasoningSection };
        this._dragStartY = touch.clientY;
        this._dragTarget = undefined;
        this._dragHover = section;
        this.setData({
          dragSection: section,
          dragIndex: index,
          dragOffset: 0,
          foodShifts: foodRects.map(() => 0),
          seasoningShifts: seasoningRects.map(() => 0),
        });
        wx.vibrateShort({ type: "medium", fail: () => {} });
      });
  },

  // y 到矩形纵向范围的距离（落在范围内为 0）
  distanceToRect(rect, y) {
    if (y < rect.top) {
      return rect.top - y;
    }
    if (y > rect.bottom) {
      return y - rect.bottom;
    }
    return 0;
  },

  onRowTouchMove(e) {
    const dragSection = this.data.dragSection;
    const dragIndex = this.data.dragIndex;
    if (!dragSection || dragIndex < 0 || !this._dragRects) {
      return;
    }
    const touch = e.touches && e.touches[0];
    if (!touch) {
      return;
    }
    const dy = touch.clientY - this._dragStartY;
    const rects = this._dragRects;
    const own = rects[dragSection];
    const draggedHeight = own[dragIndex].height;
    const draggedCenter = own[dragIndex].top + draggedHeight / 2 + dy;

    // 悬停分区：按两分区容器的纵向范围就近判断，拖进另一分区范围即切换目标
    const other = dragSection === "food" ? "seasoning" : "food";
    const sections = this._dragSections;
    const targetSection =
      this.distanceToRect(sections[other], draggedCenter) < this.distanceToRect(sections[dragSection], draggedCenter)
        ? other
        : dragSection;

    let targetIndex;
    let foodShifts;
    let seasoningShifts;
    if (targetSection === dragSection) {
      // 同分区：拖动项 1:1 跟手，兄弟项按拖动项占位高度让位
      targetIndex = this.nearestSlot(own, draggedCenter, dragIndex);
      const shifts = this.sameSectionShifts(own, dragIndex, targetIndex);
      foodShifts = dragSection === "food" ? shifts : rects.food.map(() => 0);
      seasoningShifts = dragSection === "seasoning" ? shifts : rects.seasoning.map(() => 0);
    } else {
      // 跨分区：原分区收拢拖动项空出的位置，目标分区从插入点起整体让位
      targetIndex = this.insertSlotAt(rects[targetSection], draggedCenter);
      const shifts = this.crossSectionShifts(own, dragIndex, rects[targetSection], targetIndex);
      foodShifts = dragSection === "food" ? shifts.source : shifts.target;
      seasoningShifts = dragSection === "seasoning" ? shifts.source : shifts.target;
    }
    this._dragTarget = { section: targetSection, index: targetIndex };
    if (targetSection !== this._dragHover) {
      this._dragHover = targetSection;
      wx.vibrateShort({ type: "light", fail: () => {} });
    }
    this.setData({ dragOffset: dy, foodShifts, seasoningShifts });
  },

  // 同分区：拖动项中心最靠近的槽位
  nearestSlot(rects, draggedCenter, dragIndex) {
    let target = dragIndex;
    for (let i = 0; i < rects.length; i += 1) {
      const center = rects[i].top + rects[i].height / 2;
      if (Math.abs(draggedCenter - center) < Math.abs(draggedCenter - (rects[target].top + rects[target].height / 2))) {
        target = i;
      }
    }
    return target;
  },

  // 同分区让位：兄弟项按拖动项自身占位高度（高度+相邻间隙）整体平移
  sameSectionShifts(rects, dragIndex, target) {
    const heights = rects.map((rect) => rect.height);
    const gaps = rects.slice(1).map((rect, i) => rect.top - (rects[i].top + heights[i]));
    const gapAfter = gaps[dragIndex] != null ? gaps[dragIndex] : gaps[dragIndex - 1] || 0;
    const span = heights[dragIndex] + gapAfter;
    return rects.map((rect, i) => {
      if (i === dragIndex) {
        return 0;
      }
      if (target > dragIndex && i > dragIndex && i <= target) {
        return -span;
      }
      if (target < dragIndex && i >= target && i < dragIndex) {
        return span;
      }
      return 0;
    });
  },

  // 跨分区插入点：中心落在目标分区第几个行中心之前，就插到第几个位置
  insertSlotAt(rects, draggedCenter) {
    let count = 0;
    rects.forEach((rect) => {
      if (rect.top + rect.height / 2 < draggedCenter) {
        count += 1;
      }
    });
    return count;
  },

  // 跨分区让位：原分区收拢空位（上移），目标分区自插入点起下移让位；行样式两分区一致，占位高度沿用拖动行的
  crossSectionShifts(sourceRects, dragIndex, targetRects, insertIndex) {
    const heights = sourceRects.map((rect) => rect.height);
    const gaps = sourceRects.slice(1).map((rect, i) => rect.top - (sourceRects[i].top + heights[i]));
    const gapAfter = gaps[dragIndex] != null ? gaps[dragIndex] : gaps[dragIndex - 1] || 0;
    const span = heights[dragIndex] + gapAfter;
    return {
      source: sourceRects.map((rect, i) => (i > dragIndex ? -span : 0)),
      target: targetRects.map((rect, i) => (i >= insertIndex ? span : 0)),
    };
  },

  onRowTouchEnd() {
    const { dragSection, dragIndex } = this.data;
    if (!dragSection || dragIndex < 0) {
      return;
    }
    const target = this._dragTarget;
    this._dragTarget = undefined;
    this._dragHover = undefined;
    this.setData({ dragSection: "", dragIndex: -1, dragOffset: 0, foodShifts: [], seasoningShifts: [] });
    if (!target || (target.section === dragSection && target.index === dragIndex)) {
      return;
    }
    if (target.section === dragSection) {
      this.reorderSection(dragSection, dragIndex, target.index);
    } else {
      this.moveItemAcrossSections(dragSection, dragIndex, target.section, target.index);
    }
    wx.vibrateShort({ type: "light", fail: () => {} });
  },

  // 把该类别的可见项按新顺序写回 ingredients（其他类别与其他项位置不动）
  reorderSection(section, from, to) {
    const category = section === "food" ? "食材" : "调味料";
    const draft = this.data.draft;
    const ids = this.data[section].map((item) => item.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    let k = 0;
    const ingredients = draft.ingredients.map((item) => {
      if (item.category !== category) {
        return item;
      }
      const nextId = ids[k];
      k += 1;
      if (!nextId) {
        return item;
      }
      return draft.ingredients.filter((entry) => entry.id === nextId)[0] || item;
    });
    this.setIngredients(ingredients);
  },

  // 跨分区拖动落位：分类随之切换，插到目标分区第 to 个可见项的位置
  moveItemAcrossSections(sourceSection, from, targetSection, to) {
    const targetCategory = targetSection === "food" ? "食材" : "调味料";
    const draft = this.data.draft;
    const movedId = this.data[sourceSection][from].id;
    const current = this.findItem(movedId);
    if (!current) {
      return;
    }
    const moved = { ...current, category: targetCategory };
    const ingredients = draft.ingredients.filter((item) => item.id !== movedId);
    const anchorId = this.data[targetSection].map((item) => item.id)[to];
    let insertAt = -1;
    if (anchorId) {
      insertAt = ingredients.findIndex((item) => item.id === anchorId);
    } else {
      // 目标分区末尾：插到该类别最后一项之后；该类别为空时按「食材在前、调味料在后」落位
      let lastIdx = -1;
      ingredients.forEach((item, i) => {
        if (item.category === targetCategory) {
          lastIdx = i;
        }
      });
      insertAt = lastIdx === -1 ? (targetCategory === "食材" ? 0 : ingredients.length) : lastIdx + 1;
    }
    if (insertAt < 0) {
      insertAt = ingredients.length;
    }
    ingredients.splice(insertAt, 0, moved);
    this.setIngredients(ingredients);
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
