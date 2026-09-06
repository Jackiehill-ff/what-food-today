const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date) =>
  `${date.getMonth() + 1}月${date.getDate()}日 ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]}`;

const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  // 用中午时刻构造 Date，避免时区偏移导致日期错位
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getTodayKey = () => toDateKey(new Date());

const shiftDay = (dateKey, offset) => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
};

const formatDayHeader = (dateKey) => formatDateLabel(parseDateKey(dateKey));

const getPlannedRecipesForDate = (mealPlan, date, recipesById) =>
  mealPlan
    .filter((entry) => entry.date === date)
    .map((entry) => recipesById.get(entry.recipeId))
    .filter(Boolean);

// 只重排某一天内的菜谱顺序，其他日期条目保持原位
const reorderMealPlanEntries = (mealPlan, date, orderedRecipeIds) => {
  const positions = [];
  mealPlan.forEach((entry, index) => {
    if (entry.date === date) {
      positions.push(index);
    }
  });
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
const moveMealPlanEntry = (mealPlan, fromDate, recipeId, toDate) => {
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

module.exports = {
  toDateKey,
  formatDateLabel,
  getTodayKey,
  shiftDay,
  formatDayHeader,
  getPlannedRecipesForDate,
  reorderMealPlanEntries,
  moveMealPlanEntry,
};
