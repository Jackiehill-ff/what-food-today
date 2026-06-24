import { FIXED_MEAL_SLOTS } from "./constants";
import { getItemsForRecipe } from "./recipes";
import type {
  MealPlanEntry,
  Recipe,
  ShoppingCandidate,
  ShoppingCandidateGroup,
  ShoppingGroup,
  ShoppingListItem,
  WeekDay,
} from "./types";

export const buildShoppingCandidates = (
  weekDays: WeekDay[],
  mealPlan: MealPlanEntry[],
  recipesById: Map<string, Recipe>,
): ShoppingCandidate[] =>
  weekDays.flatMap((day) =>
    FIXED_MEAL_SLOTS.flatMap((slot) => {
      return mealPlan
        .filter((entry) => entry.date === day.key && entry.slotId === slot.id)
        .flatMap((entry) => {
          const recipe = recipesById.get(entry.recipeId);
          if (!recipe) {
            return [];
          }
          return getItemsForRecipe(recipe).map((sourceItem) => ({
            id: `${day.key}|${slot.id}|${recipe.id}|${sourceItem.id}`,
            date: day.key,
            dayName: day.dayName,
            dayLabel: day.label,
            slotId: slot.id,
            slotName: slot.name || "未命名",
            recipeId: recipe.id,
            recipeName: recipe.title,
            name: sourceItem.name.trim(),
            amount: sourceItem.amount.trim(),
            unit: sourceItem.unit.trim(),
            category: sourceItem.category,
          }));
        });
    }),
  );

const compareShoppingItems = (a: ShoppingListItem, b: ShoppingListItem) => {
  if (!a.date && b.date) {
    return 1;
  }
  if (a.date && !b.date) {
    return -1;
  }
  return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
};

export const groupShoppingItems = (items: ShoppingListItem[]): ShoppingGroup[] => {
  const groups: ShoppingGroup[] = [];
  [...items].sort(compareShoppingItems).forEach((item) => {
    const key = item.date || "unspecified";
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.items.push(item);
      return;
    }
    groups.push({
      key,
      label: item.date || "未指定",
      items: [item],
    });
  });
  return groups;
};

export const groupShoppingCandidates = (candidates: ShoppingCandidate[]): ShoppingCandidateGroup[] =>
  candidates.reduce<ShoppingCandidateGroup[]>((result, candidate) => {
    const key = `${candidate.date}|${candidate.slotId}|${candidate.recipeId}`;
    const existing = result.find((group) => group.key === key);
    if (existing) {
      existing.items.push(candidate);
      return result;
    }
    result.push({
      key,
      label: `${candidate.dayName} ${candidate.dayLabel} · ${candidate.slotName} · ${candidate.recipeName}`,
      items: [candidate],
    });
    return result;
  }, []);
