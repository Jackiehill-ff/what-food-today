import { CATEGORIES } from "./constants";
import type { ShoppingListItem } from "./types";

const categoryIndex = (category: ShoppingListItem["category"]) => {
  const index = CATEGORIES.indexOf(category);
  return index === -1 ? CATEGORIES.length : index;
};

// 统一采购清单：不按日期分类，按 分类 → 未勾选优先 → 添加时间 排序。
export const sortShoppingItems = (items: ShoppingListItem[]): ShoppingListItem[] =>
  [...items].sort(
    (a, b) =>
      categoryIndex(a.category) - categoryIndex(b.category) ||
      Number(a.checked) - Number(b.checked) ||
      a.createdAt - b.createdAt,
  );
