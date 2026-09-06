const { createId } = require("./domain/ids");

// 把弹窗里勾选的食材追加到采购清单，返回 { state, count }
const addSelectedToShopping = (state, items, title) => {
  const now = Date.now();
  const added = items.map((item, index) => ({
    id: createId(),
    date: "",
    name: item.name,
    amount: item.amount,
    unit: item.unit,
    category: item.category,
    sourceLabel: title,
    createdAt: now + index,
    checked: false,
  }));
  return {
    state: { ...state, shoppingItems: [...state.shoppingItems, ...added] },
    count: added.length,
  };
};

module.exports = { addSelectedToShopping };
