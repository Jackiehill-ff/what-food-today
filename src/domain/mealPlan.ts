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
