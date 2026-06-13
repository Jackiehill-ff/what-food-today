import {
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Edit3,
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
import type { Dispatch, ReactNode, SetStateAction } from "react";

type Tab = "plan" | "recipes" | "shopping";

type Category = "蔬菜" | "豆类" | "谷类" | "调料" | "其他";

type RecipeItem = {
  id: string;
  name: string;
  amount: string;
  unit: string;
  category: Category;
};

type Recipe = {
  id: string;
  name: string;
  category: string;
  ingredients: RecipeItem[];
  seasonings: RecipeItem[];
  steps: string;
  notes: string;
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

const STORAGE_KEY = "meal-planner-app-v1";

const CATEGORIES: Category[] = ["蔬菜", "豆类", "谷类", "调料", "其他"];

const DEFAULT_STATE: AppState = {
  recipes: [],
  mealSlots: [
    { id: "breakfast", name: "早餐" },
    { id: "lunch", name: "午餐" },
    { id: "dinner", name: "晚餐" },
  ],
  mealPlan: [],
  shoppingItems: [],
};

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createBlankItem = (category: Category = "蔬菜"): RecipeItem => ({
  id: createId(),
  name: "",
  amount: "",
  unit: "",
  category,
});

const createBlankRecipe = (): Recipe => ({
  id: createId(),
  name: "",
  category: "",
  ingredients: [createBlankItem()],
  seasonings: [createBlankItem("调料")],
  steps: "",
  notes: "",
});

const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(stored) as Partial<AppState>;
    return {
      recipes: parsed.recipes ?? [],
      mealSlots: parsed.mealSlots?.length ? parsed.mealSlots : DEFAULT_STATE.mealSlots,
      mealPlan: parsed.mealPlan ?? [],
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

const getItemsForRecipe = (recipe: Recipe) =>
  [...recipe.ingredients, ...recipe.seasonings].filter((item) => item.name.trim());

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
  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [recipeDraft, setRecipeDraft] = useState<Recipe>(() => createBlankRecipe());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [slotName, setSlotName] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Record<string, boolean>>({});
  const [manualItem, setManualItem] = useState({
    date: "",
    name: "",
    amount: "",
    unit: "",
    category: "蔬菜" as Category,
  });
  const [copyStatus, setCopyStatus] = useState("");

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
      [recipe.name, recipe.category, recipe.notes].join(" ").toLowerCase().includes(keyword),
    );
  }, [appState.recipes, recipeSearch]);

  const shoppingCandidates = useMemo(() => {
    return weekDays.flatMap((day) =>
      appState.mealSlots.flatMap((slot) => {
        const entry = appState.mealPlan.find((planEntry) => planEntry.date === day.key && planEntry.slotId === slot.id);
        const recipe = entry ? recipesById.get(entry.recipeId) : undefined;
        if (!entry || !recipe) {
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
          recipeName: recipe.name,
          name: sourceItem.name.trim(),
          amount: sourceItem.amount.trim(),
          unit: sourceItem.unit.trim(),
          category: sourceItem.category,
        }));
      }),
    );
  }, [appState.mealPlan, appState.mealSlots, recipesById, weekDays]);

  const addedCandidateIds = useMemo(
    () => new Set(appState.shoppingItems.flatMap((item) => (item.sourceCandidateId ? [item.sourceCandidateId] : []))),
    [appState.shoppingItems],
  );

  const shoppingGroups = useMemo(() => groupShoppingItems(appState.shoppingItems), [appState.shoppingItems]);

  const selectedCount = appState.mealPlan.filter((entry) => weekDays.some((day) => day.key === entry.date)).length;
  const selectedCandidateCount = shoppingCandidates.filter((candidate) => selectedCandidateIds[candidate.id] && !addedCandidateIds.has(candidate.id)).length;
  const shoppingCount = appState.shoppingItems.length;

  const updateState = (updater: (state: AppState) => AppState) => {
    setAppState((current) => updater(current));
  };

  const saveRecipe = () => {
    const normalized: Recipe = {
      ...recipeDraft,
      name: recipeDraft.name.trim(),
      category: recipeDraft.category.trim(),
      ingredients: recipeDraft.ingredients.filter((item) => item.name.trim()),
      seasonings: recipeDraft.seasonings.filter((item) => item.name.trim()),
      steps: recipeDraft.steps.trim(),
      notes: recipeDraft.notes.trim(),
    };

    if (!normalized.name) {
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
      seasonings: recipe.seasonings.length ? recipe.seasonings : [createBlankItem("调料")],
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

  const updateRecipeItem = (
    section: "ingredients" | "seasonings",
    itemId: string,
    field: keyof RecipeItem,
    value: string,
  ) => {
    setRecipeDraft((current) => ({
      ...current,
      [section]: current[section].map((item) =>
        item.id === itemId ? { ...item, [field]: field === "category" ? (value as Category) : value } : item,
      ),
    }));
  };

  const addRecipeItem = (section: "ingredients" | "seasonings") => {
    setRecipeDraft((current) => ({
      ...current,
      [section]: [...current[section], createBlankItem(section === "seasonings" ? "调料" : "蔬菜")],
    }));
  };

  const removeRecipeItem = (section: "ingredients" | "seasonings", itemId: string) => {
    setRecipeDraft((current) => ({
      ...current,
      [section]: current[section].length === 1 ? current[section] : current[section].filter((item) => item.id !== itemId),
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
          <button className={activeTab === "plan" ? "active" : ""} onClick={() => setActiveTab("plan")}>
            <CalendarDays size={18} />
            周计划
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
                          <h3>{recipe.name}</h3>
                          <p>{recipe.category || "未分类"}</p>
                          <span>
                            {recipe.ingredients.length} 食材 · {recipe.seasonings.length} 调味料
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
          <PlanRecipePicker
            value={getPlannedRecipeId(day.key, slot.id)}
            recipes={recipes}
            setPlanRecipe={(recipeId) => setPlanRecipe(day.key, slot.id, recipeId)}
          />
        </div>
      ))}
    </>
  );
}

function PlanRecipePicker({
  value,
  recipes,
  setPlanRecipe,
}: {
  value: string;
  recipes: Recipe[];
  setPlanRecipe: (recipeId: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const selectedRecipe = recipes.find((recipe) => recipe.id === value);
  const filteredRecipes = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return recipes.slice(0, 5);
    }
    return recipes
      .filter((recipe) => [recipe.name, recipe.category, recipe.notes].join(" ").toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [keyword, recipes]);

  return (
    <div className="plan-picker">
      <div className="plan-picker-current">
        <strong>{selectedRecipe?.name ?? "不安排"}</strong>
        {value && (
          <button className="icon-button" onClick={() => setPlanRecipe("")} title="取消安排">
            <X size={14} />
          </button>
        )}
      </div>
      <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索食谱" />
      {filteredRecipes.length > 0 && (
        <div className="plan-picker-results">
          {filteredRecipes.map((recipe) => (
            <button
              className={recipe.id === value ? "active" : ""}
              key={recipe.id}
              onClick={() => {
                setPlanRecipe(recipe.id);
                setKeyword("");
              }}
            >
              {recipe.name}
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
}: {
  draft: Recipe;
  editingRecipeId: string | null;
  setDraft: Dispatch<SetStateAction<Recipe>>;
  saveRecipe: () => void;
  cancelEdit: () => void;
  updateRecipeItem: (section: "ingredients" | "seasonings", itemId: string, field: keyof RecipeItem, value: string) => void;
  addRecipeItem: (section: "ingredients" | "seasonings") => void;
  removeRecipeItem: (section: "ingredients" | "seasonings", itemId: string) => void;
}) {
  return (
    <div className="editor-panel">
      <div className="form-grid two">
        <label>
          食谱名称
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="番茄炒蛋" />
        </label>
        <label>
          分类
          <input value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="家常菜" />
        </label>
      </div>

      <ItemEditor
        title="食材"
        items={draft.ingredients}
        section="ingredients"
        updateRecipeItem={updateRecipeItem}
        addRecipeItem={addRecipeItem}
        removeRecipeItem={removeRecipeItem}
      />

      <ItemEditor
        title="调味料"
        items={draft.seasonings}
        section="seasonings"
        updateRecipeItem={updateRecipeItem}
        addRecipeItem={addRecipeItem}
        removeRecipeItem={removeRecipeItem}
      />

      <label>
        做法步骤
        <textarea
          value={draft.steps}
          onChange={(event) => setDraft((current) => ({ ...current, steps: event.target.value }))}
          placeholder="每行写一步，实际做饭时更容易扫读。"
          rows={5}
        />
      </label>

      <label>
        备注
        <textarea
          value={draft.notes}
          onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
          placeholder="口味、替换食材、提前准备事项"
          rows={3}
        />
      </label>

      <div className="form-actions">
        <button className="primary-button" onClick={saveRecipe} disabled={!draft.name.trim()}>
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
  items: RecipeItem[];
  section: "ingredients" | "seasonings";
  updateRecipeItem: (section: "ingredients" | "seasonings", itemId: string, field: keyof RecipeItem, value: string) => void;
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
