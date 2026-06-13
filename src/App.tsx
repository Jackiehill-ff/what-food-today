import {
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Edit3,
  FileInput,
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
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Tab = "plan" | "import" | "recipes" | "shopping";

type Category = "蔬菜" | "豆类" | "谷类" | "调料" | "其他";

type RecipeType = "full" | "simple";

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
  checkedItems: Record<string, boolean>;
};

type ShoppingItem = {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: Category;
  recipeNames: string[];
};

const STORAGE_KEY = "meal-planner-app-v1";

const CATEGORIES: Category[] = ["蔬菜", "豆类", "谷类", "调料", "其他"];

const DEFAULT_STATE: AppState = {
  recipes: [],
  importRecords: [],
  mealSlots: [
    { id: "breakfast", name: "早餐" },
    { id: "lunch", name: "午餐" },
    { id: "dinner", name: "晚餐" },
  ],
  mealPlan: [],
  checkedItems: {},
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
    type: isRecipeType(recipe.type) ? recipe.type : "full",
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
      mealSlots: parsed.mealSlots?.length ? parsed.mealSlots : DEFAULT_STATE.mealSlots,
      mealPlan: parsed.mealPlan ?? [],
      checkedItems: parsed.checkedItems ?? {},
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

const formatAmount = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
};

const mergeAmounts = (amounts: string[]) => {
  const cleaned = amounts.map((amount) => amount.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return "";
  }
  const numbers = cleaned.map((amount) => Number(amount));
  if (numbers.every((amount) => Number.isFinite(amount))) {
    return formatAmount(numbers.reduce((sum, amount) => sum + amount, 0));
  }
  return Array.from(new Set(cleaned)).join(" + ");
};

const itemKey = (date: string, item: Pick<ShoppingItem, "name" | "unit" | "category">) =>
  `${date}|${item.category}|${item.name}|${item.unit}`;

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

function App() {
  const [appState, setAppState] = useState<AppState>(() => loadState());
  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [recipeDraft, setRecipeDraft] = useState<Recipe>(() => createBlankRecipe());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [slotName, setSlotName] = useState("");
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

  const filteredRecipes = useMemo(() => {
    const keyword = recipeSearch.trim().toLowerCase();
    if (!keyword) {
      return appState.recipes;
    }
    return appState.recipes.filter((recipe) =>
      [recipe.title, recipe.category, recipe.method, recipe.rawText].join(" ").toLowerCase().includes(keyword),
    );
  }, [appState.recipes, recipeSearch]);

  const shoppingByDate = useMemo(() => {
    const result: Record<string, ShoppingItem[]> = {};

    weekDays.forEach((day) => {
      const grouped = new Map<string, { item: ShoppingItem; amounts: string[] }>();
      appState.mealPlan
        .filter((entry) => entry.date === day.key)
        .forEach((entry) => {
          const recipe = recipesById.get(entry.recipeId);
          if (!recipe) {
            return;
          }
          getItemsForRecipe(recipe).forEach((sourceItem) => {
            const key = itemKey(day.key, sourceItem);
            const existing = grouped.get(key);
            if (existing) {
              existing.amounts.push(sourceItem.amount);
              if (!existing.item.recipeNames.includes(recipe.title)) {
                existing.item.recipeNames.push(recipe.title);
              }
              return;
            }
            grouped.set(key, {
              item: {
                id: key,
                name: sourceItem.name.trim(),
                amount: "",
                unit: sourceItem.unit.trim(),
                category: sourceItem.category,
                recipeNames: [recipe.title],
              },
              amounts: [sourceItem.amount],
            });
          });
        });

      result[day.key] = Array.from(grouped.values())
        .map(({ item, amounts }) => ({ ...item, amount: mergeAmounts(amounts) }))
        .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));
    });

    return result;
  }, [appState.mealPlan, recipesById, weekDays]);

  const selectedCount = appState.mealPlan.filter((entry) => weekDays.some((day) => day.key === entry.date)).length;
  const shoppingCount = Object.values(shoppingByDate).flat().length;

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

  const updateRecipeItem = (
    section: "ingredients" | "seasonings",
    itemId: string,
    field: keyof Ingredient,
    value: string,
  ) => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((item) =>
        item.id === itemId ? { ...item, [field]: field === "category" ? (value as Category) : value } : item,
      ),
    }));
  };

  const addRecipeItem = (section: "ingredients" | "seasonings") => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: [...current.ingredients, createBlankItem(section === "seasonings" ? "调料" : "蔬菜")],
    }));
  };

  const removeRecipeItem = (section: "ingredients" | "seasonings", itemId: string) => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients:
        current.ingredients.filter((item) => (section === "seasonings" ? item.category === "调料" : item.category !== "调料")).length === 1
          ? current.ingredients
          : current.ingredients.filter((item) => item.id !== itemId),
    }));
  };

  const setPlanRecipe = (date: string, slotId: string, recipeId: string) => {
    updateState((state) => {
      const nextPlan = state.mealPlan.filter((entry) => !(entry.date === date && entry.slotId === slotId));
      if (recipeId) {
        nextPlan.push({ date, slotId, recipeId });
      }
      return { ...state, mealPlan: nextPlan };
    });
  };

  const getPlannedRecipeId = (date: string, slotId: string) =>
    appState.mealPlan.find((entry) => entry.date === date && entry.slotId === slotId)?.recipeId ?? "";

  const addMealSlot = () => {
    const name = slotName.trim();
    if (!name) {
      return;
    }
    updateState((state) => ({
      ...state,
      mealSlots: [...state.mealSlots, { id: createId(), name }],
    }));
    setSlotName("");
  };

  const renameMealSlot = (slotId: string, name: string) => {
    updateState((state) => ({
      ...state,
      mealSlots: state.mealSlots.map((slot) => (slot.id === slotId ? { ...slot, name } : slot)),
    }));
  };

  const deleteMealSlot = (slotId: string) => {
    updateState((state) => ({
      ...state,
      mealSlots: state.mealSlots.filter((slot) => slot.id !== slotId),
      mealPlan: state.mealPlan.filter((entry) => entry.slotId !== slotId),
    }));
  };

  const toggleShoppingItem = (id: string) => {
    updateState((state) => ({
      ...state,
      checkedItems: {
        ...state.checkedItems,
        [id]: !state.checkedItems[id],
      },
    }));
  };

  const buildShoppingText = (dateKey?: string) => {
    const days = dateKey ? weekDays.filter((day) => day.key === dateKey) : weekDays;
    return days
      .map((day) => {
        const items = shoppingByDate[day.key] ?? [];
        if (!items.length) {
          return "";
        }
        const lines = items.map((item) => {
          const amount = [item.amount, item.unit].filter(Boolean).join("");
          return `- ${item.name}${amount ? ` ${amount}` : ""} (${item.category})`;
        });
        return `${day.dayName} ${day.label}\n${lines.join("\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");
  };

  const copyShoppingText = async (dateKey?: string) => {
    const text = buildShoppingText(dateKey);
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopyStatus(dateKey ? "已复制当天清单" : "已复制整周清单");
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

            <div className="slot-manager">
              <div className="slot-list">
                {appState.mealSlots.map((slot) => (
                  <div className="slot-chip" key={slot.id}>
                    <input value={slot.name} onChange={(event) => renameMealSlot(slot.id, event.target.value)} />
                    <button onClick={() => deleteMealSlot(slot.id)} title="删除餐次">
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="add-inline">
                <input value={slotName} onChange={(event) => setSlotName(event.target.value)} placeholder="新增餐次" />
                <button onClick={addMealSlot}>
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>

            <div className="plan-grid" style={{ gridTemplateColumns: `minmax(92px, 0.7fr) repeat(${weekDays.length}, minmax(150px, 1fr))` }}>
              <div className="grid-head">餐次</div>
              {weekDays.map((day) => (
                <div className="grid-head" key={day.key}>
                  <strong>{day.dayName}</strong>
                  <span>{day.label}</span>
                </div>
              ))}
              {appState.mealSlots.map((slot) => (
                <PlanRow
                  key={slot.id}
                  slot={slot}
                  weekDays={weekDays}
                  recipes={appState.recipes}
                  getPlannedRecipeId={getPlannedRecipeId}
                  setPlanRecipe={setPlanRecipe}
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
              />

              <div className="recipe-list-panel">
                <div className="search-box">
                  <Search size={17} />
                  <input value={recipeSearch} onChange={(event) => setRecipeSearch(event.target.value)} placeholder="搜索食谱" />
                </div>
                <div className="recipe-list">
                  {filteredRecipes.length === 0 ? (
                    <EmptyState title="还没有食谱" text="先新增一道常做菜，再把它安排到周计划里。" />
                  ) : (
                    filteredRecipes.map((recipe) => (
                      <article className="recipe-card" key={recipe.id}>
                        <div>
                          <h3>{recipe.title}</h3>
                          <p>{recipe.category || "未分类"}</p>
                          <span>
                            {getRecipeFoodIngredients(recipe).length} 食材 · {getRecipeSeasonings(recipe).length} 调味料 ·{" "}
                            {recipe.type === "simple" ? "简易" : "完整"}
                          </span>
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
            <div className="shopping-days">
              {weekDays.map((day) => (
                <ShoppingDay
                  key={day.key}
                  day={day}
                  items={shoppingByDate[day.key] ?? []}
                  checkedItems={appState.checkedItems}
                  toggleShoppingItem={toggleShoppingItem}
                  copyDay={() => copyShoppingText(day.key)}
                />
              ))}
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

function PlanRow({
  slot,
  weekDays,
  recipes,
  getPlannedRecipeId,
  setPlanRecipe,
}: {
  slot: MealSlot;
  weekDays: ReturnType<typeof getWeekDays>;
  recipes: Recipe[];
  getPlannedRecipeId: (date: string, slotId: string) => string;
  setPlanRecipe: (date: string, slotId: string, recipeId: string) => void;
}) {
  return (
    <>
      <div className="slot-label">{slot.name || "未命名"}</div>
      {weekDays.map((day) => (
        <div className="plan-cell" key={`${day.key}-${slot.id}`}>
          <select value={getPlannedRecipeId(day.key, slot.id)} onChange={(event) => setPlanRecipe(day.key, slot.id, event.target.value)}>
            <option value="">不安排</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
        </div>
      ))}
    </>
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
}: {
  draft: Recipe;
  editingRecipeId: string | null;
  setDraft: Dispatch<SetStateAction<Recipe>>;
  saveRecipe: () => void;
  cancelEdit: () => void;
  updateRecipeItem: (section: "ingredients" | "seasonings", itemId: string, field: keyof Ingredient, value: string) => void;
  addRecipeItem: (section: "ingredients" | "seasonings") => void;
  removeRecipeItem: (section: "ingredients" | "seasonings", itemId: string) => void;
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
      <label>
        食谱类型
        <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as RecipeType }))}>
          <option value="full">完整食谱</option>
          <option value="simple">简易食谱</option>
        </select>
      </label>

      <ItemEditor
        title="食材"
        items={getRecipeFoodIngredients(draft)}
        section="ingredients"
        updateRecipeItem={updateRecipeItem}
        addRecipeItem={addRecipeItem}
        removeRecipeItem={removeRecipeItem}
      />

      <ItemEditor
        title="调味料"
        items={getRecipeSeasonings(draft)}
        section="seasonings"
        updateRecipeItem={updateRecipeItem}
        addRecipeItem={addRecipeItem}
        removeRecipeItem={removeRecipeItem}
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
}: {
  title: string;
  items: Ingredient[];
  section: "ingredients" | "seasonings";
  updateRecipeItem: (section: "ingredients" | "seasonings", itemId: string, field: keyof Ingredient, value: string) => void;
  addRecipeItem: (section: "ingredients" | "seasonings") => void;
  removeRecipeItem: (section: "ingredients" | "seasonings", itemId: string) => void;
}) {
  return (
    <div className="item-editor">
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

function ShoppingDay({
  day,
  items,
  checkedItems,
  toggleShoppingItem,
  copyDay,
}: {
  day: ReturnType<typeof getWeekDays>[number];
  items: ShoppingItem[];
  checkedItems: Record<string, boolean>;
  toggleShoppingItem: (id: string) => void;
  copyDay: () => void;
}) {
  return (
    <article className="shopping-day">
      <header>
        <div>
          <h3>{day.dayName}</h3>
          <p>{day.label}</p>
        </div>
        <button className="icon-button" onClick={copyDay} disabled={!items.length} title="复制当天">
          <Copy size={16} />
        </button>
      </header>
      {items.length === 0 ? (
        <EmptyState title="暂无采购项" text="在周计划里安排食谱后自动生成。" compact />
      ) : (
        <div className="shopping-list">
          {items.map((item) => {
            const checked = Boolean(checkedItems[item.id]);
            return (
              <label className={`shopping-item ${checked ? "checked" : ""}`} key={item.id}>
                <input type="checkbox" checked={checked} onChange={() => toggleShoppingItem(item.id)} />
                <span className="category-dot">{item.category}</span>
                <strong>{item.name}</strong>
                <span>
                  {[item.amount, item.unit].filter(Boolean).join("") || "适量"}
                </span>
                <small>{item.recipeNames.join("、")}</small>
              </label>
            );
          })}
        </div>
      )}
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
