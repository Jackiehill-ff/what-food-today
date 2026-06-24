import { DEFAULT_SLOT_TIMES } from "./constants";
import type { MealPlanEntry, MealSlot, NextMeal, Recipe, WeekDay } from "./types";

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateLabel = (date: Date) =>
  `${date.getMonth() + 1}月${date.getDate()}日 ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]}`;

export const getSlotTime = (slot: MealSlot) => {
  if (DEFAULT_SLOT_TIMES[slot.id]) {
    return DEFAULT_SLOT_TIMES[slot.id];
  }
  if (slot.name.includes("早")) {
    return DEFAULT_SLOT_TIMES.breakfast;
  }
  if (slot.name.includes("午")) {
    return DEFAULT_SLOT_TIMES.lunch;
  }
  if (slot.name.includes("晚")) {
    return DEFAULT_SLOT_TIMES.dinner;
  }
  return { hour: 23, minute: 59 };
};

export const getMealDateTime = (dateKey: string, slot: MealSlot) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const slotTime = getSlotTime(slot);
  return new Date(year, month - 1, day, slotTime.hour, slotTime.minute, 0, 0);
};

export const findNextMeal = (
  mealPlan: MealPlanEntry[],
  mealSlots: MealSlot[],
  recipesById: Map<string, Recipe>,
  now = new Date(),
): NextMeal | null => {
  const slotsById = new Map(mealSlots.map((slot) => [slot.id, slot]));

  return (
    mealPlan
      .map((entry) => {
        const slot = slotsById.get(entry.slotId);
        const recipe = recipesById.get(entry.recipeId);
        if (!slot || !recipe) {
          return null;
        }
        return {
          entry,
          dateTime: getMealDateTime(entry.date, slot),
          slotName: slot.name || "未命名",
          recipe,
        };
      })
      .filter((meal): meal is NextMeal => meal !== null)
      .filter((meal) => meal.dateTime > now)
      .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())[0] ?? null
  );
};

export const getWeekStart = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const getWeekDays = (weekStart: Date): WeekDay[] =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      key: toDateKey(date),
      dayName: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index],
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });

export const shiftWeek = (weekStart: Date, offset: number) => {
  const next = new Date(weekStart);
  next.setDate(next.getDate() + offset * 7);
  return next;
};
