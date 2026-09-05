export type Tab = "plan" | "import" | "recipes" | "shopping" | "me";

export type Category = "食材" | "调味料";

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
  // 成品图，存压缩后的 data URL，保证离线可用
  image?: string;
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

export type MealPlanEntry = {
  date: string;
  recipeId: string;
};

export type AppState = {
  recipes: Recipe[];
  importRecords: ImportRecord[];
  mealPlan: MealPlanEntry[];
  shoppingItems: ShoppingListItem[];
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
  // 最近一次勾选时间；排序时最新勾选的排最后
  checkedAt?: number;
};
