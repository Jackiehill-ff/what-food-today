const { createId } = require("./domain/ids");
const { maxShoppingOrder } = require("./domain/shopping");

// 把弹窗里勾选的食材追加到采购清单，返回 { state, count }
const addSelectedToShopping = (state, items, title) => {
  const now = Date.now();
  // 新采购项带手动顺序号，接在现有清单最后（排序规则见 utils/domain/shopping.js）
  const baseOrder = maxShoppingOrder(state.shoppingItems) + 1;
  const added = items.map((item, index) => ({
    id: createId(),
    date: "",
    name: item.name,
    amount: item.amount,
    unit: item.unit,
    category: item.category,
    sourceLabel: title,
    createdAt: now + index,
    order: baseOrder + index,
    checked: false,
  }));
  return {
    state: { ...state, shoppingItems: [...state.shoppingItems, ...added] },
    count: added.length,
  };
};

module.exports = { addSelectedToShopping };
