import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Edit3,
  FileInput,
  GripVertical,
  Home,
  ListPlus,
  Plus,
  Save,
  Search,
  ShoppingBasket,
  Soup,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, DragEvent, ReactNode, SetStateAction } from "react";

type Tab = "home" | "plan" | "import" | "recipes" | "shopping";

type Category = "蔬菜" | "豆类" | "谷类" | "调料" | "其他";

type RecipeType = "full" | "simple";
type RecipeSection = "ingredients" | "seasonings";

type Ingredient = {
  id: string;
  name: string;
  category: Category;
  amount: string;
  unit: string;
};

type Recipe = {
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

type ImportRecord = {
  id: string;
  sourceType: "flomo" | "image" | "manual";
  sourceId?: string;
  rawText?: string;
  importedRecipeIds: string[];
  createdAt: string;
};

type ImportDraft = Recipe & {
  rawText: string;
  parseFailed: boolean;
};

type MealSlot = {
  id: string;
  name: string;
};

type MealPlanEntry = {
  date: string;
  slotId: string;
  recipeId: string;
};

type AppState = {
  recipes: Recipe[];
  importRecords: ImportRecord[];
  mealSlots: MealSlot[];
  mealPlan: MealPlanEntry[];
  shoppingItems: ShoppingListItem[];
};

type ShoppingCandidate = {
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

type ShoppingListItem = {
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

type NextMeal = {
  entry: MealPlanEntry;
  dateTime: Date;
  slotName: string;
  recipe: Recipe;
};

const STORAGE_KEY = "meal-planner-app-v1";
const RECIPE_ITEM_DRAG_TYPE = "application/x-recipe-item";

const CATEGORIES: Category[] = ["蔬菜", "豆类", "谷类", "调料", "其他"];

const DEFAULT_SLOT_TIMES: Record<string, { hour: number; minute: number }> = {
  breakfast: { hour: 8, minute: 0 },
  lunch: { hour: 12, minute: 0 },
  dinner: { hour: 18, minute: 0 },
};

const FIXED_MEAL_SLOTS: MealSlot[] = [
  { id: "breakfast", name: "早餐" },
  { id: "lunch", name: "午餐" },
  { id: "dinner", name: "晚餐" },
];

const DEFAULT_STATE: AppState = {
  recipes: [],
  importRecords: [],
  mealSlots: FIXED_MEAL_SLOTS,
  mealPlan: [],
  shoppingItems: [],
};

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createTimestamp = () => new Date().toISOString();

const isCategory = (value: string): value is Category => CATEGORIES.includes(value as Category);

const normalizeCategory = (value: unknown): Category => (typeof value === "string" && isCategory(value) ? value : "其他");

const createBlankItem = (category: Category = "蔬菜"): Ingredient => ({
  id: createId(),
  name: "",
  amount: "",
  unit: "",
  category,
});

const createBlankRecipe = (): Recipe => ({
  id: createId(),
  title: "",
  type: "full",
  category: "",
  ingredients: [createBlankItem()],
  method: "",
  rawText: "",
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
});

const normalizeIngredient = (item: Partial<Ingredient>): Ingredient => ({
  id: item.id || createId(),
  name: item.name?.trim() ?? "",
  category: normalizeCategory(item.category),
  amount: item.amount?.trim() ?? "",
  unit: item.unit?.trim() ?? "",
});

const isRecipeType = (value: unknown): value is RecipeType => value === "full" || value === "simple";

const migrateRecipe = (recipe: Partial<Recipe> & {
  kind?: RecipeType;
  name?: string;
  seasonings?: Partial<Ingredient>[];
  steps?: string;
  notes?: string;
}): Recipe => {
  const now = createTimestamp();
  const ingredients = [
    ...(Array.isArray(recipe.ingredients) ? recipe.ingredients : []),
    ...(Array.isArray(recipe.seasonings) ? recipe.seasonings : []),
  ].map(normalizeIngredient);

  return {
    id: recipe.id || createId(),
    title: (recipe.title ?? recipe.name ?? "").trim(),
    type: isRecipeType(recipe.type) ? recipe.type : isRecipeType(recipe.kind) ? recipe.kind : "full",
    category: recipe.category?.trim() ?? "",
    ingredients,
    method: (recipe.method ?? recipe.steps ?? "").trim(),
    rawText: (recipe.rawText ?? recipe.notes ?? "").trim(),
    createdAt: recipe.createdAt || now,
    updatedAt: recipe.updatedAt || now,
  };
};

const migrateImportRecord = (record: Partial<ImportRecord>): ImportRecord => ({
  id: record.id || createId(),
  sourceType: record.sourceType === "flomo" || record.sourceType === "image" || record.sourceType === "manual" ? record.sourceType : "manual",
  sourceId: record.sourceId,
  rawText: record.rawText,
  importedRecipeIds: Array.isArray(record.importedRecipeIds) ? record.importedRecipeIds : [],
  createdAt: record.createdAt || createTimestamp(),
});

const createImportDraft = (recipe: Partial<Recipe> & { rawText: string; parseFailed?: boolean }): ImportDraft => ({
  id: createId(),
  title: recipe.title ?? "",
  type: "full",
  category: "",
  ingredients: recipe.ingredients?.length ? recipe.ingredients : [createBlankItem("其他")],
  method: recipe.method ?? "",
  rawText: recipe.rawText,
  createdAt: createTimestamp(),
  updatedAt: createTimestamp(),
  parseFailed: Boolean(recipe.parseFailed),
});

const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(stored) as Partial<AppState>;
    const recipes = Array.isArray(parsed.recipes) ? parsed.recipes.map(migrateRecipe).filter((recipe) => recipe.title) : [];
    return {
      recipes,
      importRecords: Array.isArray(parsed.importRecords) ? parsed.importRecords.map(migrateImportRecord) : [],
      mealSlots: FIXED_MEAL_SLOTS,
      mealPlan: (parsed.mealPlan ?? []).filter((entry) => FIXED_MEAL_SLOTS.some((slot) => slot.id === entry.slotId)),
      shoppingItems: parsed.shoppingItems ?? [],
    };
  } catch {
    return DEFAULT_STATE;
  }
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: Date) =>
  `${date.getMonth() + 1}月${date.getDate()}日 ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]}`;

const getSlotTime = (slot: MealSlot) => {
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

const getMealDateTime = (dateKey: string, slot: MealSlot) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const slotTime = getSlotTime(slot);
  return new Date(year, month - 1, day, slotTime.hour, slotTime.minute, 0, 0);
};

const findNextMeal = (
  mealPlan: MealPlanEntry[],
  mealSlots: MealSlot[],
  recipesById: Map<string, Recipe>,
  now = new Date(),
): NextMeal | null => {
  const slotsById = new Map(mealSlots.map((slot) => [slot.id, slot]));

  return mealPlan
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
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime())[0] ?? null;
};

const getWeekStart = (date: Date) => {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getWeekDays = (weekStart: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      key: toDateKey(date),
      dayName: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][index],
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    };
  });

const getItemsForRecipe = (recipe: Recipe) => recipe.ingredients.filter((item) => item.name.trim());

const getRecipeSeasonings = (recipe: Recipe) => recipe.ingredients.filter((item) => item.category === "调料");

const getRecipeFoodIngredients = (recipe: Recipe) => recipe.ingredients.filter((item) => item.category !== "调料");

const FIELD_PATTERN = /^(食材|做法)\s*[:：]/;

const isValidTitleLine = (line: string) => {
  const trimmed = line.trim();
  return Boolean(trimmed) && !trimmed.startsWith("#") && !FIELD_PATTERN.test(trimmed);
};

const textAfterField = (line: string, field: "食材" | "做法") =>
  line.replace(new RegExp(`^${field}\\s*[:：]\\s*`), "").trim();

const parseRecipeImportText = (text: string): ImportDraft[] => {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const ingredientLineIndexes = lines.reduce<number[]>((indexes, line, index) => {
    if (/^食材\s*[:：]/.test(line)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  if (!text.trim() || ingredientLineIndexes.length === 0) {
    return [createImportDraft({ rawText: text, parseFailed: true })];
  }

  return ingredientLineIndexes.map((ingredientLineIndex, recipeIndex) => {
    const nextIngredientLineIndex = ingredientLineIndexes[recipeIndex + 1] ?? lines.length;
    const titleLineIndex = findPreviousIndex(lines, ingredientLineIndex - 1, isValidTitleLine);
    const title = titleLineIndex >= 0 ? lines[titleLineIndex] : "";
    const nextTitleLineIndex =
      recipeIndex + 1 < ingredientLineIndexes.length
        ? findPreviousIndex(lines, ingredientLineIndexes[recipeIndex + 1] - 1, isValidTitleLine)
        : -1;
    const methodLineIndex = findNextIndex(lines, ingredientLineIndex + 1, nextIngredientLineIndex, (line) =>
      /^做法\s*[:：]/.test(line),
    );
    const methodEndIndex =
      nextTitleLineIndex > methodLineIndex && methodLineIndex >= 0 ? nextTitleLineIndex : nextIngredientLineIndex;
    const method =
      methodLineIndex >= 0
        ? [textAfterField(lines[methodLineIndex], "做法"), ...lines.slice(methodLineIndex + 1, methodEndIndex)]
            .filter(Boolean)
            .join("\n")
        : "";
    const ingredients = textAfterField(lines[ingredientLineIndex], "食材")
      .split(/[、，,]/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({
        ...createBlankItem("其他"),
        name,
        amount: "",
        unit: "",
      }));
    const rawStartIndex = titleLineIndex >= 0 ? titleLineIndex : ingredientLineIndex;
    const rawEndIndex = methodEndIndex > rawStartIndex ? methodEndIndex : nextIngredientLineIndex;

    return createImportDraft({
      title,
      ingredients,
      method,
      rawText: lines.slice(rawStartIndex, rawEndIndex).join("\n"),
      parseFailed: !title || !method,
    });
  });
};

const findPreviousIndex = (lines: string[], startIndex: number, predicate: (line: string) => boolean) => {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (predicate(lines[index])) {
      return index;
    }
  }
  return -1;
};

const findNextIndex = (
  lines: string[],
  startIndex: number,
  endIndex: number,
  predicate: (line: string) => boolean,
) => {
  for (let index = startIndex; index < endIndex; index += 1) {
    if (predicate(lines[index])) {
      return index;
    }
  }
  return -1;
};

const compareShoppingItems = (a: ShoppingListItem, b: ShoppingListItem) => {
  if (!a.date && b.date) {
    return 1;
  }
  if (a.date && !b.date) {
    return -1;
  }
  return a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
};

const groupShoppingItems = (items: ShoppingListItem[]) => {
  const groups: { key: string; label: string; items: ShoppingListItem[] }[] = [];
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

function App() {
  const [appState, setAppState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [recipeDraft, setRecipeDraft] = useState<Recipe>(() => createBlankRecipe());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Record<string, boolean>>({});
  const [manualItem, setManualItem] = useState({
    date: "",
    name: "",
    amount: "",
    unit: "",
    category: "蔬菜" as Category,
  });
  const [copyStatus, setCopyStatus] = useState("");
  const [importText, setImportText] = useState("");
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const recipesById = useMemo(() => {
    return new Map(appState.recipes.map((recipe) => [recipe.id, recipe]));
  }, [appState.recipes]);

  const recipeCategories = useMemo(
    () => Array.from(new Set(appState.recipes.map((recipe) => recipe.category.trim()).filter(Boolean))).sort(),
    [appState.recipes],
  );

  useEffect(() => {
    if (recipeCategory && !recipeCategories.includes(recipeCategory)) {
      setRecipeCategory("");
    }
  }, [recipeCategories, recipeCategory]);

  const filteredRecipes = useMemo(() => {
    const keyword = recipeSearch.trim().toLowerCase();
    return appState.recipes.filter((recipe) => {
      if (recipeCategory && recipe.category !== recipeCategory) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const itemText = getItemsForRecipe(recipe)
        .map((item) => `${item.name} ${item.category}`)
        .join(" ");
      return [recipe.title, recipe.category, recipe.method, recipe.rawText, itemText].join(" ").toLowerCase().includes(keyword);
    });
  }, [appState.recipes, recipeCategory, recipeSearch]);

  const shoppingCandidates = useMemo(() => {
    return weekDays.flatMap((day) =>
      FIXED_MEAL_SLOTS.flatMap((slot) => {
        return appState.mealPlan
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
  }, [appState.mealPlan, recipesById, weekDays]);

  const addedCandidateIds = useMemo(
    () => new Set(appState.shoppingItems.flatMap((item) => (item.sourceCandidateId ? [item.sourceCandidateId] : []))),
    [appState.shoppingItems],
  );

  const shoppingGroups = useMemo(() => groupShoppingItems(appState.shoppingItems), [appState.shoppingItems]);

  const nextMeal = useMemo(
    () => findNextMeal(appState.mealPlan, FIXED_MEAL_SLOTS, recipesById),
    [appState.mealPlan, recipesById],
  );

  const selectedCount = appState.mealPlan.filter((entry) => weekDays.some((day) => day.key === entry.date)).length;
  const selectedCandidateCount = shoppingCandidates.filter((candidate) => selectedCandidateIds[candidate.id] && !addedCandidateIds.has(candidate.id)).length;
  const shoppingCount = appState.shoppingItems.length;

  const updateState = (updater: (state: AppState) => AppState) => {
    setAppState((current) => updater(current));
  };

  const saveRecipe = () => {
    const now = createTimestamp();
    const normalized: Recipe = {
      ...recipeDraft,
      title: recipeDraft.title.trim(),
      category: recipeDraft.category.trim(),
      ingredients: recipeDraft.ingredients.filter((item) => item.name.trim()),
      method: recipeDraft.method.trim(),
      rawText: recipeDraft.rawText?.trim(),
      updatedAt: now,
    };

    if (!normalized.title) {
      return;
    }

    updateState((state) => {
      const exists = state.recipes.some((recipe) => recipe.id === normalized.id);
      return {
        ...state,
        recipes: exists
          ? state.recipes.map((recipe) => (recipe.id === normalized.id ? normalized : recipe))
          : [normalized, ...state.recipes],
      };
    });
    setRecipeDraft(createBlankRecipe());
    setEditingRecipeId(null);
  };

  const editRecipe = (recipe: Recipe) => {
    setRecipeDraft({
      ...recipe,
      ingredients: recipe.ingredients.length ? recipe.ingredients : [createBlankItem()],
    });
    setEditingRecipeId(recipe.id);
    setActiveTab("recipes");
  };

  const deleteRecipe = (recipeId: string) => {
    updateState((state) => ({
      ...state,
      recipes: state.recipes.filter((recipe) => recipe.id !== recipeId),
      mealPlan: state.mealPlan.filter((entry) => entry.recipeId !== recipeId),
    }));
    if (editingRecipeId === recipeId) {
      setEditingRecipeId(null);
      setRecipeDraft(createBlankRecipe());
    }
  };

  const parseImportText = () => {
    const drafts = parseRecipeImportText(importText);
    setImportDrafts(drafts);
    setImportStatus(drafts.some((draft) => !draft.title.trim() || !draft.method.trim()) ? "有内容需要手动补全" : "");
  };

  const updateImportDraft = (draftId: string, field: "title" | "method" | "rawText", value: string) => {
    setImportDrafts((current) => current.map((draft) => (draft.id === draftId ? { ...draft, [field]: value } : draft)));
  };

  const updateImportIngredient = (draftId: string, itemId: string, name: string) => {
    setImportDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ingredients: draft.ingredients.map((item) => (item.id === itemId ? { ...item, name } : item)),
            }
          : draft,
      ),
    );
  };

  const addImportIngredient = (draftId: string) => {
    setImportDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId ? { ...draft, ingredients: [...draft.ingredients, createBlankItem("其他")] } : draft,
      ),
    );
  };

  const removeImportIngredient = (draftId: string, itemId: string) => {
    setImportDrafts((current) =>
      current.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ingredients:
                draft.ingredients.length === 1 ? draft.ingredients : draft.ingredients.filter((item) => item.id !== itemId),
            }
          : draft,
      ),
    );
  };

  const saveImportedRecipes = () => {
    const recipes = importDrafts
      .map<Recipe>((draft) => ({
        id: draft.id,
        title: draft.title.trim(),
        type: "full",
        category: "",
        ingredients: draft.ingredients
          .map((item) => ({ ...item, name: item.name.trim(), amount: "", unit: "", category: item.category || "其他" }))
          .filter((item) => item.name),
        method: draft.method.trim(),
        rawText: draft.rawText.trim(),
        createdAt: draft.createdAt,
        updatedAt: createTimestamp(),
      }))
      .filter((recipe) => recipe.title);

    if (!recipes.length) {
      setImportStatus("至少需要一个标题");
      return;
    }

    updateState((state) => ({
      ...state,
      recipes: [...recipes, ...state.recipes],
    }));
    setImportDrafts([]);
    setImportText("");
    setImportStatus(`已保存 ${recipes.length} 个食谱`);
    setActiveTab("recipes");
  };

  const updateRecipeItem = (section: RecipeSection, itemId: string, field: keyof Ingredient, value: string) => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((item) =>
        item.id === itemId ? { ...item, [field]: field === "category" ? (value as Category) : value } : item,
      ),
    }));
  };

  const addRecipeItem = (section: RecipeSection) => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: [...current.ingredients, createBlankItem(section === "seasonings" ? "调料" : "蔬菜")],
    }));
  };

  const removeRecipeItem = (section: RecipeSection, itemId: string) => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients:
        current.ingredients.filter((item) => (section === "seasonings" ? item.category === "调料" : item.category !== "调料")).length === 1
          ? current.ingredients
          : current.ingredients.filter((item) => item.id !== itemId),
    }));
  };

  const moveRecipeItem = (source: RecipeSection, target: RecipeSection, itemId: string) => {
    if (source === target) {
      return;
    }
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((item) =>
        item.id === itemId ? { ...item, category: target === "seasonings" ? "调料" : "蔬菜" } : item,
      ),
    }));
  };

  const togglePlanRecipe = (date: string, slotId: string, recipeId: string) => {
    updateState((state) => {
      const exists = state.mealPlan.some(
        (entry) => entry.date === date && entry.slotId === slotId && entry.recipeId === recipeId,
      );
      if (exists) {
        return {
          ...state,
          mealPlan: state.mealPlan.filter(
            (entry) => !(entry.date === date && entry.slotId === slotId && entry.recipeId === recipeId),
          ),
        };
      }
      return {
        ...state,
        mealPlan: [...state.mealPlan, { date, slotId, recipeId }],
      };
    });
  };

  const getPlannedRecipeIds = (date: string, slotId: string) =>
    appState.mealPlan
      .filter((entry) => entry.date === date && entry.slotId === slotId)
      .map((entry) => entry.recipeId);

  const toggleCandidate = (id: string) => {
    setSelectedCandidateIds((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const addSelectedCandidates = () => {
    const candidatesToAdd = shoppingCandidates.filter((candidate) => selectedCandidateIds[candidate.id] && !addedCandidateIds.has(candidate.id));
    if (!candidatesToAdd.length) {
      return;
    }
    const now = Date.now();
    updateState((state) => ({
      ...state,
      shoppingItems: [
        ...state.shoppingItems,
        ...candidatesToAdd.map((candidate, index) => ({
          id: createId(),
          date: candidate.date,
          name: candidate.name,
          amount: candidate.amount,
          unit: candidate.unit,
          category: candidate.category,
          sourceLabel: `${candidate.dayName} ${candidate.slotName} · ${candidate.recipeName}`,
          sourceCandidateId: candidate.id,
          createdAt: now + index,
          checked: false,
        })),
      ],
    }));
    setSelectedCandidateIds((current) => {
      const next = { ...current };
      candidatesToAdd.forEach((candidate) => {
        delete next[candidate.id];
      });
      return next;
    });
  };

  const addManualShoppingItem = () => {
    const name = manualItem.name.trim();
    if (!name) {
      return;
    }
    updateState((state) => ({
      ...state,
      shoppingItems: [
        ...state.shoppingItems,
        {
          id: createId(),
          date: manualItem.date,
          name,
          amount: manualItem.amount.trim(),
          unit: manualItem.unit.trim(),
          category: manualItem.category,
          sourceLabel: "手动添加",
          createdAt: Date.now(),
          checked: false,
        },
      ],
    }));
    setManualItem((current) => ({
      ...current,
      name: "",
      amount: "",
      unit: "",
    }));
  };

  const toggleShoppingItem = (id: string) => {
    updateState((state) => ({
      ...state,
      shoppingItems: state.shoppingItems.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    }));
  };

  const buildShoppingText = () => {
    return shoppingGroups
      .map((day) => {
        const lines = day.items.map((item) => {
          const amount = [item.amount, item.unit].filter(Boolean).join("");
          return `- ${item.checked ? "[x]" : "[ ]"} ${item.name}${amount ? ` ${amount}` : ""} (${item.category})`;
        });
        return `${day.label}\n${lines.join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");
  };

  const copyShoppingText = async () => {
    const text = buildShoppingText();
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopyStatus("已复制采购清单");
    window.setTimeout(() => setCopyStatus(""), 1800);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Soup size={26} />
          </div>
          <div>
            <h1>今天吃啥？</h1>
            <p>周计划和采购清单</p>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="主导航">
          <button className={activeTab === "home" ? "active" : ""} onClick={() => setActiveTab("home")}>
            <Home size={18} />
            首页
          </button>
          <button className={activeTab === "plan" ? "active" : ""} onClick={() => setActiveTab("plan")}>
            <CalendarDays size={18} />
            周计划
          </button>
          <button className={activeTab === "import" ? "active" : ""} onClick={() => setActiveTab("import")}>
            <FileInput size={18} />
            导入中心
          </button>
          <button className={activeTab === "recipes" ? "active" : ""} onClick={() => setActiveTab("recipes")}>
            <Utensils size={18} />
            食谱库
          </button>
          <button className={activeTab === "shopping" ? "active" : ""} onClick={() => setActiveTab("shopping")}>
            <ShoppingBasket size={18} />
            采购清单
          </button>
        </nav>

        <div className="sidebar-stats">
          <div>
            <strong>{appState.recipes.length}</strong>
            <span>食谱</span>
          </div>
          <div>
            <strong>{selectedCount}</strong>
            <span>本周安排</span>
          </div>
          <div>
            <strong>{shoppingCount}</strong>
            <span>采购项</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === "home" && (
          <section className="workspace home-workspace">
            <SectionHeader icon={<Home size={22} />} title="最近一餐" />
            <NextMealCard
              nextMeal={nextMeal}
              onOpenRecipe={(recipe) => editRecipe(recipe)}
              onOpenPlan={() => setActiveTab("plan")}
              onOpenShopping={() => setActiveTab("shopping")}
            />
          </section>
        )}

        {activeTab === "plan" && (
          <section className="workspace">
            <SectionHeader
              icon={<CalendarDays size={22} />}
              title="周计划"
              action={
                <div className="week-controls">
                  <button className="icon-button" onClick={() => setWeekStart(getWeekStart(new Date()))} title="回到本周">
                    <Check size={17} />
                  </button>
                  <button className="ghost-button" onClick={() => setWeekStart(shiftWeek(weekStart, -1))}>
                    上一周
                  </button>
                  <button className="ghost-button" onClick={() => setWeekStart(shiftWeek(weekStart, 1))}>
                    下一周
                  </button>
                </div>
              }
            />

            <div className="plan-grid" style={{ gridTemplateColumns: `minmax(92px, 0.7fr) repeat(${weekDays.length}, minmax(150px, 1fr))` }}>
              <div className="grid-head">餐次</div>
              {weekDays.map((day) => (
                <div className="grid-head" key={day.key}>
                  <strong>{day.dayName}</strong>
                  <span>{day.label}</span>
                </div>
              ))}
              {FIXED_MEAL_SLOTS.map((slot) => (
                <PlanRow
                  key={slot.id}
                  slot={slot}
                  weekDays={weekDays}
                  recipes={appState.recipes}
                  getPlannedRecipeIds={getPlannedRecipeIds}
                  togglePlanRecipe={togglePlanRecipe}
                />
              ))}
            </div>
          </section>
        )}

        {activeTab === "recipes" && (
          <section className="workspace">
            <SectionHeader icon={<Utensils size={22} />} title="食谱库" />
            <div className="recipe-layout">
              <RecipeForm
                draft={recipeDraft}
                editingRecipeId={editingRecipeId}
                setDraft={setRecipeDraft}
                saveRecipe={saveRecipe}
                cancelEdit={() => {
                  setRecipeDraft(createBlankRecipe());
                  setEditingRecipeId(null);
                }}
                updateRecipeItem={updateRecipeItem}
                addRecipeItem={addRecipeItem}
                removeRecipeItem={removeRecipeItem}
                moveRecipeItem={moveRecipeItem}
              />

              <div className="recipe-list-panel">
                <div className="search-box">
                  <Search size={17} />
                  <input value={recipeSearch} onChange={(event) => setRecipeSearch(event.target.value)} placeholder="搜索标题、分类、食材" />
                </div>
                {recipeCategories.length > 0 && (
                  <div className="category-filters">
                    <button className={recipeCategory === "" ? "active" : ""} onClick={() => setRecipeCategory("")}>
                      全部
                    </button>
                    {recipeCategories.map((category) => (
                      <button
                        className={recipeCategory === category ? "active" : ""}
                        key={category}
                        onClick={() => setRecipeCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
                <div className="recipe-list">
                  {filteredRecipes.length === 0 ? (
                    <EmptyState title="还没有食谱" text="先新增一道常做菜，再把它安排到周计划里。" />
                  ) : (
                    filteredRecipes.map((recipe) => (
                      <article className="recipe-card" key={recipe.id}>
                        <div>
                          <div className="recipe-card-title">
                            <h3>{recipe.title}</h3>
                          </div>
                          <p>{recipe.category || "未分类"}</p>
                          <RecipeMeta recipe={recipe} />
                        </div>
                        <div className="card-actions">
                          <button className="icon-button" onClick={() => editRecipe(recipe)} title="编辑">
                            <Edit3 size={16} />
                          </button>
                          <button className="icon-button danger" onClick={() => deleteRecipe(recipe.id)} title="删除">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "import" && (
          <section className="workspace">
            <SectionHeader
              icon={<FileInput size={22} />}
              title="导入中心"
              action={
                <button className="primary-button" onClick={saveImportedRecipes} disabled={!importDrafts.length}>
                  <Save size={16} />
                  保存到食谱库
                </button>
              }
            />
            {importStatus && <div className="status-note">{importStatus}</div>}
            <div className="import-layout">
              <div className="editor-panel">
                <label>
                  粘贴文本
                  <textarea
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder="#03Resource/植物领先/分类食谱/蔬菜&#10;干煸青椒苦瓜&#10;食材：青椒、苦瓜、姜、蒜、盐、酱油、白糖、植物油&#10;做法：锅中不放油..."
                    rows={14}
                  />
                </label>
                <div className="form-actions">
                  <button className="primary-button" onClick={parseImportText} disabled={!importText.trim()}>
                    <FileInput size={16} />
                    解析
                  </button>
                </div>
              </div>

              <ImportPreview
                drafts={importDrafts}
                updateDraft={updateImportDraft}
                updateIngredient={updateImportIngredient}
                addIngredient={addImportIngredient}
                removeIngredient={removeImportIngredient}
              />
            </div>
          </section>
        )}

        {activeTab === "shopping" && (
          <section className="workspace">
            <SectionHeader
              icon={<ClipboardList size={22} />}
              title="采购清单"
              action={
                <button className="primary-button" onClick={() => copyShoppingText()}>
                  <Copy size={16} />
                  复制整周
                </button>
              }
            />
            {copyStatus && <div className="status-note">{copyStatus}</div>}
            <ShoppingCandidatePanel
              candidates={shoppingCandidates}
              selectedCandidateIds={selectedCandidateIds}
              addedCandidateIds={addedCandidateIds}
              selectedCandidateCount={selectedCandidateCount}
              toggleCandidate={toggleCandidate}
              addSelectedCandidates={addSelectedCandidates}
            />
            <ManualShoppingForm manualItem={manualItem} weekDays={weekDays} setManualItem={setManualItem} addManualShoppingItem={addManualShoppingItem} />
            <div className="shopping-days">
              {shoppingGroups.length === 0 ? (
                <EmptyState title="暂无采购项" text="从候选食材中勾选，或手动添加其他采购项目。" />
              ) : (
                shoppingGroups.map((group) => (
                  <ShoppingDay key={group.key} group={group} toggleShoppingItem={toggleShoppingItem} />
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const shiftWeek = (weekStart: Date, offset: number) => {
  const next = new Date(weekStart);
  next.setDate(next.getDate() + offset * 7);
  return next;
};

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="section-header">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      {action}
    </header>
  );
}

function RecipeMeta({ recipe }: { recipe: Recipe }) {
  const parts = [
    getRecipeFoodIngredients(recipe).length ? `${getRecipeFoodIngredients(recipe).length} 食材` : "",
    getRecipeSeasonings(recipe).length ? `${getRecipeSeasonings(recipe).length} 调味料` : "",
  ].filter(Boolean);

  if (!parts.length) {
    return null;
  }

  return <span>{parts.join(" · ")}</span>;
}

function NextMealCard({
  nextMeal,
  onOpenRecipe,
  onOpenPlan,
  onOpenShopping,
}: {
  nextMeal: NextMeal | null;
  onOpenRecipe: (recipe: Recipe) => void;
  onOpenPlan: () => void;
  onOpenShopping: () => void;
}) {
  if (!nextMeal) {
    return (
      <div className="next-meal-empty">
        <EmptyState title="还没有未来计划" text="去周计划里安排下一餐，首页会自动显示最近要做的菜。" />
        <button className="primary-button" onClick={onOpenPlan}>
          <CalendarDays size={16} />
          去周计划添加
        </button>
      </div>
    );
  }

  const items = getItemsForRecipe(nextMeal.recipe);
  const steps = nextMeal.recipe.method
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);

  return (
    <article className="next-meal-card">
      <div className="next-meal-main">
        <div className="next-meal-meta">
          <span>{formatDateLabel(nextMeal.dateTime)}</span>
          <span>{nextMeal.slotName}</span>
        </div>
        <h2>{nextMeal.recipe.title}</h2>
        {nextMeal.recipe.category && <p>{nextMeal.recipe.category}</p>}
      </div>

      {items.length > 0 && (
        <section className="next-meal-section">
          <h3>食材</h3>
          <div className="next-meal-items">
            {items.map((item) => (
              <span key={item.id}>
                {item.name}
                {[item.amount, item.unit].filter(Boolean).join("") && ` ${[item.amount, item.unit].filter(Boolean).join("")}`}
              </span>
            ))}
          </div>
        </section>
      )}

      {steps.length > 0 && (
        <section className="next-meal-section">
          <h3>做法</h3>
          <ol className="next-meal-steps">
            {steps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      <div className="next-meal-actions">
        <button className="ghost-button" onClick={() => onOpenRecipe(nextMeal.recipe)}>
          <Utensils size={16} />
          查看食谱
        </button>
        <button className="primary-button" onClick={onOpenShopping}>
          查看采购候选
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}

function PlanRow({
  slot,
  weekDays,
  recipes,
  getPlannedRecipeIds,
  togglePlanRecipe,
}: {
  slot: MealSlot;
  weekDays: ReturnType<typeof getWeekDays>;
  recipes: Recipe[];
  getPlannedRecipeIds: (date: string, slotId: string) => string[];
  togglePlanRecipe: (date: string, slotId: string, recipeId: string) => void;
}) {
  return (
    <>
      <div className="slot-label">{slot.name || "未命名"}</div>
      {weekDays.map((day) => (
        <div className="plan-cell" key={`${day.key}-${slot.id}`}>
          <PlanRecipePicker
            values={getPlannedRecipeIds(day.key, slot.id)}
            recipes={recipes}
            toggleRecipe={(recipeId) => togglePlanRecipe(day.key, slot.id, recipeId)}
          />
        </div>
      ))}
    </>
  );
}

function PlanRecipePicker({
  values,
  recipes,
  toggleRecipe,
}: {
  values: string[];
  recipes: Recipe[];
  toggleRecipe: (recipeId: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const selectedRecipes = values.flatMap((value) => {
    const recipe = recipes.find((candidate) => candidate.id === value);
    return recipe ? [recipe] : [];
  });
  const filteredRecipes = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return recipes
      .filter(
        (recipe) =>
          !values.includes(recipe.id) &&
          [recipe.title, recipe.category, recipe.method, recipe.rawText].join(" ").toLowerCase().includes(normalized),
      )
      .slice(0, 6);
  }, [keyword, recipes, values]);

  return (
    <div className="plan-picker">
      {selectedRecipes.length > 0 ? (
        <div className="plan-picker-selected">
          {selectedRecipes.map((recipe) => (
            <span className="plan-recipe-chip" key={recipe.id}>
              {recipe.title}
              <button onClick={() => toggleRecipe(recipe.id)} title={`移除${recipe.title}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="plan-picker-empty">不安排</div>
      )}
      <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索食谱" />
      {keyword.trim() && filteredRecipes.length > 0 && (
        <div className="plan-picker-results">
          {filteredRecipes.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => {
                toggleRecipe(recipe.id);
                setKeyword("");
              }}
            >
              {recipe.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RecipeForm({
  draft,
  editingRecipeId,
  setDraft,
  saveRecipe,
  cancelEdit,
  updateRecipeItem,
  addRecipeItem,
  removeRecipeItem,
  moveRecipeItem,
}: {
  draft: Recipe;
  editingRecipeId: string | null;
  setDraft: Dispatch<SetStateAction<Recipe>>;
  saveRecipe: () => void;
  cancelEdit: () => void;
  updateRecipeItem: (section: RecipeSection, itemId: string, field: keyof Ingredient, value: string) => void;
  addRecipeItem: (section: RecipeSection) => void;
  removeRecipeItem: (section: RecipeSection, itemId: string) => void;
  moveRecipeItem: (source: RecipeSection, target: RecipeSection, itemId: string) => void;
}) {
  return (
    <div className="editor-panel">
      <div className="form-grid two">
        <label>
          食谱名称
          <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="番茄炒蛋" />
        </label>
        <label>
          分类
          <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="家常菜" />
        </label>
      </div>

      <ItemEditor
        title="食材"
        items={getRecipeFoodIngredients(draft)}
        section="ingredients"
        updateRecipeItem={updateRecipeItem}
        addRecipeItem={addRecipeItem}
        removeRecipeItem={removeRecipeItem}
        moveRecipeItem={moveRecipeItem}
      />

      <ItemEditor
        title="调味料"
        items={getRecipeSeasonings(draft)}
        section="seasonings"
        updateRecipeItem={updateRecipeItem}
        addRecipeItem={addRecipeItem}
        removeRecipeItem={removeRecipeItem}
        moveRecipeItem={moveRecipeItem}
      />

      <label>
        做法步骤
        <textarea
          value={draft.method}
          onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}
          placeholder="每行写一步，实际做饭时更容易扫读。"
          rows={5}
        />
      </label>

      <label>
        原始文本 / 备注
        <textarea
          value={draft.rawText ?? ""}
          onChange={(event) => setDraft((current) => ({ ...current, rawText: event.target.value }))}
          placeholder="口味、替换食材、提前准备事项"
          rows={3}
        />
      </label>

      <div className="form-actions">
        <button className="primary-button" onClick={saveRecipe} disabled={!draft.title.trim()}>
          <Save size={16} />
          {editingRecipeId ? "保存修改" : "保存食谱"}
        </button>
        {editingRecipeId && (
          <button className="ghost-button" onClick={cancelEdit}>
            取消
          </button>
        )}
      </div>
    </div>
  );
}

function ItemEditor({
  title,
  items,
  section,
  updateRecipeItem,
  addRecipeItem,
  removeRecipeItem,
  moveRecipeItem,
}: {
  title: string;
  items: Ingredient[];
  section: RecipeSection;
  updateRecipeItem: (section: RecipeSection, itemId: string, field: keyof Ingredient, value: string) => void;
  addRecipeItem: (section: RecipeSection) => void;
  removeRecipeItem: (section: RecipeSection, itemId: string) => void;
  moveRecipeItem: (source: RecipeSection, target: RecipeSection, itemId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const [source, itemId] = event.dataTransfer.getData(RECIPE_ITEM_DRAG_TYPE).split("|");
    if ((source === "ingredients" || source === "seasonings") && itemId) {
      moveRecipeItem(source, section, itemId);
    }
  };

  return (
    <div
      className={`item-editor ${isDragOver ? "drag-over" : ""}`}
      onDragEnter={() => setIsDragOver(true)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragOver(false);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="subsection-title">
        <h3>{title}</h3>
        <button className="ghost-button" onClick={() => addRecipeItem(section)}>
          <Plus size={15} />
          添加
        </button>
      </div>
      <div className="item-table">
        {items.map((item) => (
          <div className="item-row" key={item.id}>
            <button
              className="drag-handle"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(RECIPE_ITEM_DRAG_TYPE, `${section}|${item.id}`);
              }}
              title={`拖动到${section === "ingredients" ? "调味料" : "食材"}`}
              type="button"
            >
              <GripVertical size={17} />
            </button>
            <input value={item.name} onChange={(event) => updateRecipeItem(section, item.id, "name", event.target.value)} placeholder="名称" />
            <input value={item.amount} onChange={(event) => updateRecipeItem(section, item.id, "amount", event.target.value)} placeholder="数量" />
            <input value={item.unit} onChange={(event) => updateRecipeItem(section, item.id, "unit", event.target.value)} placeholder="单位" />
            <select value={item.category} onChange={(event) => updateRecipeItem(section, item.id, "category", event.target.value)}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button className="icon-button" onClick={() => removeRecipeItem(section, item.id)} title="删除">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportPreview({
  drafts,
  updateDraft,
  updateIngredient,
  addIngredient,
  removeIngredient,
}: {
  drafts: ImportDraft[];
  updateDraft: (draftId: string, field: "title" | "method" | "rawText", value: string) => void;
  updateIngredient: (draftId: string, itemId: string, name: string) => void;
  addIngredient: (draftId: string) => void;
  removeIngredient: (draftId: string, itemId: string) => void;
}) {
  return (
    <div className="import-preview-panel">
      {drafts.length === 0 ? (
        <EmptyState title="等待解析" text="粘贴 flomo 或其他文本后，先解析再保存。" />
      ) : (
        drafts.map((draft, index) => (
          <article className="import-card" key={draft.id}>
            <div className="subsection-title">
              <h3>预览 {index + 1}</h3>
              {draft.parseFailed && <span className="warning-pill">需补全</span>}
            </div>
            <label>
              标题
              <input value={draft.title} onChange={(event) => updateDraft(draft.id, "title", event.target.value)} placeholder="菜名" />
            </label>
            <div className="item-editor">
              <div className="subsection-title">
                <h3>食材</h3>
                <button className="ghost-button" onClick={() => addIngredient(draft.id)}>
                  <Plus size={15} />
                  添加
                </button>
              </div>
              <div className="import-ingredient-list">
                {draft.ingredients.map((item) => (
                  <div className="import-ingredient-row" key={item.id}>
                    <input value={item.name} onChange={(event) => updateIngredient(draft.id, item.id, event.target.value)} placeholder="名称" />
                    <button className="icon-button" onClick={() => removeIngredient(draft.id, item.id)} title="删除">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <label>
              做法
              <textarea value={draft.method} onChange={(event) => updateDraft(draft.id, "method", event.target.value)} rows={5} />
            </label>
            {draft.rawText && draft.parseFailed && (
              <label>
                rawText
                <textarea value={draft.rawText} onChange={(event) => updateDraft(draft.id, "rawText", event.target.value)} rows={4} />
              </label>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function ShoppingCandidatePanel({
  candidates,
  selectedCandidateIds,
  addedCandidateIds,
  selectedCandidateCount,
  toggleCandidate,
  addSelectedCandidates,
}: {
  candidates: ShoppingCandidate[];
  selectedCandidateIds: Record<string, boolean>;
  addedCandidateIds: Set<string>;
  selectedCandidateCount: number;
  toggleCandidate: (id: string) => void;
  addSelectedCandidates: () => void;
}) {
  const groups = candidates.reduce<{ key: string; label: string; items: ShoppingCandidate[] }[]>((result, candidate) => {
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

  return (
    <section className="shopping-panel">
      <header>
        <div>
          <h3>采购候选</h3>
          <p>从周计划中的食谱生成，默认不加入正式清单。</p>
        </div>
        <button className="primary-button" onClick={addSelectedCandidates} disabled={selectedCandidateCount === 0}>
          <ListPlus size={16} />
          加入已选 {selectedCandidateCount ? `(${selectedCandidateCount})` : ""}
        </button>
      </header>
      {groups.length === 0 ? (
        <EmptyState title="暂无候选食材" text="在周计划里安排带食材的食谱后，这里会生成候选项。" compact />
      ) : (
        <div className="candidate-groups">
          {groups.map((group) => (
            <div className="candidate-group" key={group.key}>
              <h4>{group.label}</h4>
              <div className="shopping-list">
                {group.items.map((item) => {
                  const added = addedCandidateIds.has(item.id);
                  return (
                    <label className={`shopping-item ${added ? "checked" : ""}`} key={item.id}>
                      <input
                        type="checkbox"
                        checked={Boolean(selectedCandidateIds[item.id])}
                        disabled={added}
                        onChange={() => toggleCandidate(item.id)}
                      />
                      <span className="category-dot">{item.category}</span>
                      <strong>{item.name}</strong>
                      <span>{[item.amount, item.unit].filter(Boolean).join("") || "适量"}</span>
                      <small>{added ? "已加入清单" : item.recipeName}</small>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ManualShoppingForm({
  manualItem,
  weekDays,
  setManualItem,
  addManualShoppingItem,
}: {
  manualItem: { date: string; name: string; amount: string; unit: string; category: Category };
  weekDays: ReturnType<typeof getWeekDays>;
  setManualItem: Dispatch<SetStateAction<{ date: string; name: string; amount: string; unit: string; category: Category }>>;
  addManualShoppingItem: () => void;
}) {
  return (
    <section className="shopping-panel manual-shopping">
      <header>
        <div>
          <h3>手动添加</h3>
          <p>不选日期会进入未指定。</p>
        </div>
        <button className="primary-button" onClick={addManualShoppingItem} disabled={!manualItem.name.trim()}>
          <Plus size={16} />
          添加
        </button>
      </header>
      <div className="manual-shopping-grid">
        <select value={manualItem.date} onChange={(event) => setManualItem((current) => ({ ...current, date: event.target.value }))}>
          <option value="">未指定</option>
          {weekDays.map((day) => (
            <option key={day.key} value={day.key}>
              {day.dayName} {day.label}
            </option>
          ))}
        </select>
        <input value={manualItem.name} onChange={(event) => setManualItem((current) => ({ ...current, name: event.target.value }))} placeholder="采购项" />
        <input value={manualItem.amount} onChange={(event) => setManualItem((current) => ({ ...current, amount: event.target.value }))} placeholder="数量" />
        <input value={manualItem.unit} onChange={(event) => setManualItem((current) => ({ ...current, unit: event.target.value }))} placeholder="单位" />
        <select value={manualItem.category} onChange={(event) => setManualItem((current) => ({ ...current, category: event.target.value as Category }))}>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function ShoppingDay({
  group,
  toggleShoppingItem,
}: {
  group: { key: string; label: string; items: ShoppingListItem[] };
  toggleShoppingItem: (id: string) => void;
}) {
  return (
    <article className="shopping-day">
      <header>
        <div>
          <h3>{group.label}</h3>
          <p>{group.items.length} 项</p>
        </div>
      </header>
      <div className="shopping-list">
        {group.items.map((item) => (
          <label className={`shopping-item ${item.checked ? "checked" : ""}`} key={item.id}>
            <input type="checkbox" checked={item.checked} onChange={() => toggleShoppingItem(item.id)} />
            <span className="category-dot">{item.category}</span>
            <strong>{item.name}</strong>
            <span>{[item.amount, item.unit].filter(Boolean).join("") || "适量"}</span>
            <small>{item.sourceLabel}</small>
          </label>
        ))}
      </div>
    </article>
  );
}

function EmptyState({ title, text, compact = false }: { title: string; text: string; compact?: boolean }) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <p>{title}</p>
      <span>{text}</span>
    </div>
  );
}

export default App;
