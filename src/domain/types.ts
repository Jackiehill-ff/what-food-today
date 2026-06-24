export type Tab = "home" | "plan" | "import" | "recipes" | "shopping";

export type Category = "蔬菜" | "豆类" | "谷类" | "调料" | "其他";

export type RecipeType = "full" | "simple";
export type RecipeSection = "ingredients" | "seasonings";

export type Ingredient = {
  id: string;
  name: string;
  category: Category;
  amount: string;
  unit: string;
};

export type Recipe = {
  id: string;
  title: string;
  type: RecipeType;
  category: string;
  ingredients: Ingredient[];
  method: string;
  rawText?: string;
  createdAt: string;
  updatedAt: string;
};

export type ImportRecord = {
  id: string;
  sourceType: "flomo" | "image" | "manual";
  sourceId?: string;
  rawText?: string;
  importedRecipeIds: string[];
  createdAt: string;
};

export type ImportDraft = Recipe & {
  rawText: string;
  parseFailed: boolean;
};

export type MealSlot = {
  id: string;
  name: string;
};

export type MealPlanEntry = {
  date: string;
  slotId: string;
  recipeId: string;
};

export type AppState = {
  recipes: Recipe[];
  importRecords: ImportRecord[];
  mealSlots: MealSlot[];
  mealPlan: MealPlanEntry[];
  shoppingItems: ShoppingListItem[];
};

export type ShoppingCandidate = {
  id: string;
  date: string;
  dayName: string;
  dayLabel: string;
  slotId: string;
  slotName: string;
  recipeId: string;
  recipeName: string;
  name: string;
  amount: string;
  unit: string;
  category: Category;
};

export type ShoppingListItem = {
  id: string;
  date: string;
  name: string;
  amount: string;
  unit: string;
  category: Category;
  sourceLabel: string;
  sourceCandidateId?: string;
  createdAt: number;
  checked: boolean;
};

export type NextMeal = {
  entry: MealPlanEntry;
  dateTime: Date;
  slotName: string;
  recipe: Recipe;
};

export type WeekDay = {
  key: string;
  dayName: string;
  label: string;
};

export type ShoppingGroup = {
  key: string;
  label: string;
  items: ShoppingListItem[];
};

export type ShoppingCandidateGroup = {
  key: string;
  label: string;
  items: ShoppingCandidate[];
};
