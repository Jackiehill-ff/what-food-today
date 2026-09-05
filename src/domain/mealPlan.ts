import type { MealPlanEntry, Recipe } from "./types";

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateLabel = (date: Date) =>
  `${date.getMonth() + 1}月${date.getDate()}日 ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]}`;

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  // 用中午时刻构造 Date，避免时区偏移导致日期错位
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const getTodayKey = () => toDateKey(new Date());

export const shiftDay = (dateKey: string, offset: number) => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
};

export const formatDayHeader = (dateKey: string) => formatDateLabel(parseDateKey(dateKey));

export const getPlannedRecipesForDate = (
  mealPlan: MealPlanEntry[],
  date: string,
  recipesById: Map<string, Recipe>,
): Recipe[] =>
  mealPlan
    .filter((entry) => entry.date === date)
    .flatMap((entry) => {
      const recipe = recipesById.get(entry.recipeId);
      return recipe ? [recipe] : [];
    });

// 只重排某一天内的菜谱顺序，其他日期条目保持原位
export const reorderMealPlanEntries = (mealPlan: MealPlanEntry[], date: string, orderedRecipeIds: string[]): MealPlanEntry[] => {
  const positions = mealPlan.reduce<number[]>((acc, entry, index) => {
    if (entry.date === date) {
      acc.push(index);
    }
    return acc;
  }, []);
  if (positions.length !== orderedRecipeIds.length) {
    return mealPlan;
  }
  const order = new Map(orderedRecipeIds.map((recipeId, index) => [recipeId, index]));
  const sorted = positions
    .map((position) => mealPlan[position])
    .sort((a, b) => (order.get(a.recipeId) ?? 0) - (order.get(b.recipeId) ?? 0));
  const next = [...mealPlan];
  positions.forEach((position, index) => {
    next[position] = sorted[index];
  });
  return next;
};

// 把某天的菜谱移到另一天；目标日期已有时不重复添加
export const moveMealPlanEntry = (mealPlan: MealPlanEntry[], fromDate: string, recipeId: string, toDate: string): MealPlanEntry[] => {
  if (fromDate === toDate) {
    return mealPlan;
  }
  const entry = mealPlan.find((item) => item.date === fromDate && item.recipeId === recipeId);
  if (!entry) {
    return mealPlan;
  }
  const withoutEntry = mealPlan.filter((item) => item !== entry);
  if (mealPlan.some((item) => item.date === toDate && item.recipeId === recipeId)) {
    return withoutEntry;
  }
  return [...withoutEntry, { date: toDate, recipeId }];
};
