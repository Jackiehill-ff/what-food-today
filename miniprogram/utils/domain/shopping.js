const { CATEGORIES } = require("./constants");

const categoryIndex = (category) => {
  const index = CATEGORIES.indexOf(category);
  return index === -1 ? CATEGORIES.length : index;
};

// 统一采购清单：未勾选在前（按分类 → 添加时间），已勾选在后并按勾选时间排，
// 最新勾选的一直排在清单最后。
const sortShoppingItems = (items) =>
  [...items].sort((a, b) => {
    if (a.checked !== b.checked) {
      return Number(a.checked) - Number(b.checked);
    }
    if (a.checked) {
      return (a.checkedAt ?? a.createdAt) - (b.checkedAt ?? b.createdAt);
    }
    return categoryIndex(a.category) - categoryIndex(b.category) || a.createdAt - b.createdAt;
  });

module.exports = { sortShoppingItems };
