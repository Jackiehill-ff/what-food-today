import { CATEGORIES } from "./constants";
import type { ShoppingListItem } from "./types";

const categoryIndex = (category: ShoppingListItem["category"]) => {
  const index = CATEGORIES.indexOf(category);
  return index === -1 ? CATEGORIES.length : index;
};

// 手动顺序号：拖动落位后写入（0..n-1）；旧数据没有 order 字段，回退 null
const manualOrderOf = (item: ShoppingListItem) => (typeof item.order === "number" ? item.order : null);

// 清单里当前最大的手动顺序号，新采购项接在后面（无手动顺序时返回 -1）
export const maxShoppingOrder = (items: ShoppingListItem[]): number =>
  items.reduce((max, item) => {
    const order = manualOrderOf(item);
    return order === null ? max : Math.max(max, order);
  }, -1);

// 统一采购清单：已勾选在后并按勾选时间排（最新勾选的一直排在清单最后）；
// 未勾选的：拖动排过序的按手动顺序排在前，从未拖动过的保持「分类 → 添加时间」
export const sortShoppingItems = (items: ShoppingListItem[]): ShoppingListItem[] =>
  [...items].sort((a, b) => {
    if (a.checked !== b.checked) {
      return Number(a.checked) - Number(b.checked);
    }
    if (a.checked) {
      return (a.checkedAt ?? a.createdAt) - (b.checkedAt ?? a.createdAt);
    }
    const aOrder = manualOrderOf(a);
    const bOrder = manualOrderOf(b);
    if (aOrder !== null && bOrder !== null) {
      return aOrder - bOrder;
    }
    if (aOrder !== null) {
      return -1;
    }
    if (bOrder !== null) {
      return 1;
    }
    return categoryIndex(a.category) - categoryIndex(b.category) || a.createdAt - b.createdAt;
  });
