Component({
  properties: {
    visible: { type: Boolean, value: false },
    // { title: string, items: [{ id, name, amount, unit, category }] }
    recipe: { type: Object, value: { title: "", items: [] } },
  },

  data: {
    items: [],
    selectedCount: 0,
    allChecked: false,
  },

  observers: {
    "visible, recipe": function (visible, recipe) {
      if (visible) {
        const items = (recipe.items || []).map((item) => ({ ...item, checked: false }));
        this.setData(this.decorate(items));
      }
    },
  },

  decorate(items) {
    const selectedCount = items.filter((item) => item.checked).length;
    const allChecked = items.length > 0 && items.every((item) => item.checked);
    return { items, selectedCount, allChecked };
  },

  methods: {
    noop() {},

    onClose() {
      this.triggerEvent("close");
    },

    toggleItem(e) {
      const id = e.currentTarget.dataset.id;
      const items = this.data.items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item));
      this.setData(this.decorate(items));
    },

    toggleAll() {
      const allChecked = this.data.items.length > 0 && this.data.items.every((item) => item.checked);
      const items = this.data.items.map((item) => ({ ...item, checked: !allChecked }));
      this.setData(this.decorate(items));
    },

    onConfirm() {
      const selected = this.data.items
        .filter((item) => item.checked)
        .map((item) => ({ name: item.name, amount: item.amount, unit: item.unit, category: item.category }));
      if (!selected.length) {
        return;
      }
      this.triggerEvent("add", { items: selected, title: this.data.recipe.title });
    },
  },
});
