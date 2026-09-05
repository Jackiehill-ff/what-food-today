import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileInput,
  GripVertical,
  ImagePlus,
  ImageUp,
  ListPlus,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  MoreVertical,
  Plus,
  Save,
  Search,
  ShoppingBasket,
  Soup,
  Trash2,
  Upload,
  UserRound,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, DragEvent, FormEvent, PointerEvent as ReactPointerEvent, ReactNode, SetStateAction } from "react";

import { useAuthSession } from "./auth/useAuthSession";
import { localAppStateRepository, migrateAppState } from "./data/appStateRepository";
import { createAppStateBackup, loadSyncMetadata, saveSyncMetadata } from "./data/syncStorage";
import { CATEGORIES, RECIPE_ITEM_DRAG_TYPE, UNIT_LABELS, UNIT_OPTIONS } from "./domain/constants";
import { createId, createTimestamp } from "./domain/ids";
import { readImageAsRecipeDataUrl } from "./domain/images";
import { parseRecipeImportText } from "./domain/importParser";
import {
  formatDayHeader,
  getPlannedRecipesForDate,
  getTodayKey,
  moveMealPlanEntry,
  reorderMealPlanEntries,
  shiftDay,
} from "./domain/mealPlan";
import {
  createBlankItem,
  createBlankRecipe,
  getItemsForRecipe,
  getRecipeFoodIngredients,
  getRecipeIngredientSummary,
  getRecipeSeasonings,
  getRecipeSeasoningSummary,
} from "./domain/recipes";
import { matchesAllKeywords, splitKeywords } from "./domain/search";
import { sortShoppingItems } from "./domain/shopping";
import type {
  AppState,
  Category,
  ImportDraft,
  Ingredient,
  Recipe,
  RecipeSection,
  Tab,
} from "./domain/types";
import type { SyncStatus } from "./domain/sync";

function App() {
  const auth = useAuthSession();
  const [appState, setAppState] = useState<AppState>(() => localAppStateRepository.load());
  const [syncMetadata, setSyncMetadata] = useState(() => loadSyncMetadata());
  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [planDate, setPlanDate] = useState(() => getTodayKey());
  const [recipeDraft, setRecipeDraft] = useState<Recipe>(() => createBlankRecipe());
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("");
  const [manualItem, setManualItem] = useState({
    name: "",
    amount: "",
    unit: "",
    category: "食材" as Category,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [importText, setImportText] = useState("");
  const [importDrafts, setImportDrafts] = useState<ImportDraft[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [dataStatus, setDataStatus] = useState("");
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [planSearch, setPlanSearch] = useState("");
  const [popup, setPopup] = useState<{ recipe: Recipe; selected: Record<string, boolean> } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recipeView, setRecipeView] = useState<"feed" | "edit">("feed");
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [manualShoppingOpen, setManualShoppingOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [menuPickerRecipeId, setMenuPickerRecipeId] = useState<string | null>(null);
  const [planCardMenuRecipeId, setPlanCardMenuRecipeId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localAppStateRepository.save(appState);
  }, [appState]);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const userId = auth.session?.user.id;
    setSyncMetadata((current) => {
      const syncStatus: SyncStatus = userId ? (current.syncStatus === "local-only" ? "pending" : current.syncStatus) : "local-only";
      const next = {
        ...current,
        userId,
        syncStatus,
      };
      saveSyncMetadata(next);
      return next;
    });
  }, [auth.session?.user.id]);

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
    const keywords = splitKeywords(recipeSearch);
    return appState.recipes.filter((recipe) => {
      if (recipeCategory && recipe.category !== recipeCategory) {
        return false;
      }
      if (!keywords.length) {
        return true;
      }
      const itemText = getItemsForRecipe(recipe)
        .map((item) => `${item.name} ${item.category}`)
        .join(" ");
      const searchText = [recipe.title, recipe.category, recipe.method, recipe.rawText, itemText].join(" ").toLowerCase();
      return matchesAllKeywords(searchText, keywords);
    });
  }, [appState.recipes, recipeCategory, recipeSearch]);

  const plannedRecipes = useMemo(
    () => getPlannedRecipesForDate(appState.mealPlan, planDate, recipesById),
    [appState.mealPlan, planDate, recipesById],
  );

  const sortedShoppingItems = useMemo(() => sortShoppingItems(appState.shoppingItems), [appState.shoppingItems]);

  const plannedRecipeIds = useMemo(() => new Set(plannedRecipes.map((recipe) => recipe.id)), [plannedRecipes]);

  const planSearchResults = useMemo(() => {
    const keywords = splitKeywords(planSearch);
    if (!keywords.length) {
      return [];
    }
    return appState.recipes
      .filter((recipe) => !plannedRecipeIds.has(recipe.id))
      .filter((recipe) => {
        const itemText = getItemsForRecipe(recipe)
          .map((item) => item.name)
          .join(" ");
        const searchText = [recipe.title, recipe.category, recipe.method, recipe.rawText, itemText].join(" ").toLowerCase();
        return matchesAllKeywords(searchText, keywords);
      })
      .slice(0, 8);
  }, [planSearch, appState.recipes, plannedRecipeIds]);

  const plannedCount = appState.mealPlan.length;
  const shoppingCount = appState.shoppingItems.length;

  const updateState = (updater: (state: AppState) => AppState) => {
    setAppState((current) => updater(current));
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
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
    setRecipeView("feed");
    setExpandedRecipeId(null);
  };

  const editRecipe = (recipe: Recipe) => {
    setRecipeDraft({
      ...recipe,
      ingredients: recipe.ingredients.length ? recipe.ingredients : [createBlankItem()],
    });
    setEditingRecipeId(recipe.id);
    setRecipeView("edit");
    setExpandedRecipeId(null);
    setActiveTab("recipes");
  };

  const startNewRecipe = () => {
    setRecipeDraft(createBlankRecipe());
    setEditingRecipeId(null);
    setRecipeView("edit");
    setActiveTab("recipes");
  };

  const backToRecipeFeed = () => {
    setRecipeDraft(createBlankRecipe());
    setEditingRecipeId(null);
    setRecipeView("feed");
    setExpandedRecipeId(null);
  };

  const deleteRecipe = (recipeId: string) => {
    updateState((state) => ({
      ...state,
      recipes: state.recipes.filter((recipe) => recipe.id !== recipeId),
      mealPlan: state.mealPlan.filter((entry) => entry.recipeId !== recipeId),
    }));
    if (expandedRecipeId === recipeId) {
      setExpandedRecipeId(null);
    }
    if (editingRecipeId === recipeId) {
      setEditingRecipeId(null);
      setRecipeDraft(createBlankRecipe());
      setRecipeView("feed");
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
        draft.id === draftId ? { ...draft, ingredients: [...draft.ingredients, createBlankItem("食材")] } : draft,
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
          .map((item) => ({ ...item, name: item.name.trim(), amount: "", unit: "", category: item.category || "食材" }))
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
      ingredients: [...current.ingredients, createBlankItem(section === "seasonings" ? "调味料" : "食材")],
    }));
  };

  const removeRecipeItem = (section: RecipeSection, itemId: string) => {
    setRecipeDraft((current) => ({
      ...current,
      ingredients:
        current.ingredients.filter((item) => (section === "seasonings" ? item.category === "调味料" : item.category !== "调味料")).length === 1
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
        item.id === itemId ? { ...item, category: target === "seasonings" ? "调味料" : "食材" } : item,
      ),
    }));
  };

  const reorderRecipeItem = (section: RecipeSection, itemId: string, direction: -1 | 1) => {
    setRecipeDraft((current) => {
      const ingredients = [...current.ingredients];
      const index = ingredients.findIndex((item) => item.id === itemId);
      if (index === -1) {
        return current;
      }
      const targetCategory: Category = section === "seasonings" ? "调味料" : "食材";
      let neighborIndex = -1;
      for (let i = index + direction; i >= 0 && i < ingredients.length; i += direction) {
        if (ingredients[i].category === targetCategory) {
          neighborIndex = i;
          break;
        }
      }
      if (neighborIndex === -1) {
        return current;
      }
      const next = [...current.ingredients];
      [next[index], next[neighborIndex]] = [next[neighborIndex], next[index]];
      return { ...current, ingredients: next };
    });
  };

  const addRecipeToDateKey = (recipe: Recipe, dateKey: string) => {
    updateState((state) => {
      const exists = state.mealPlan.some((entry) => entry.date === dateKey && entry.recipeId === recipe.id);
      if (exists) {
        return state;
      }
      return {
        ...state,
        mealPlan: [...state.mealPlan, { date: dateKey, recipeId: recipe.id }],
      };
    });
  };

  const addRecipeToDate = (recipe: Recipe) => {
    addRecipeToDateKey(recipe, planDate);
    setPlanSearch("");
    setPopup({ recipe, selected: {} });
  };

  // 食谱库卡片快捷加入今天/明天菜单，加入后同样弹出食材勾选
  const addRecipeFromFeed = (recipe: Recipe, dateKey: string) => {
    addRecipeToDateKey(recipe, dateKey);
    setMenuPickerRecipeId(null);
    setStatusMessage(`已把「${recipe.title}」加入${dateKey === getTodayKey() ? "今天" : "明天"}的菜单`);
    window.setTimeout(() => setStatusMessage(""), 2200);
    setPopup({ recipe, selected: {} });
  };

  const removeRecipeFromDate = (recipeId: string) => {
    updateState((state) => ({
      ...state,
      mealPlan: state.mealPlan.filter((entry) => !(entry.date === planDate && entry.recipeId === recipeId)),
    }));
    setPlanCardMenuRecipeId(null);
  };

  const moveRecipeToDate = (recipeId: string, toDate: string) => {
    if (!toDate || toDate === planDate) {
      return;
    }
    updateState((state) => ({
      ...state,
      mealPlan: moveMealPlanEntry(state.mealPlan, planDate, recipeId, toDate),
    }));
    setPlanCardMenuRecipeId(null);
    setStatusMessage(`已改到 ${formatDayHeader(toDate)}`);
    window.setTimeout(() => setStatusMessage(""), 2200);
  };

  const reorderPlannedRecipes = (orderedRecipeIds: string[]) => {
    updateState((state) => ({
      ...state,
      mealPlan: reorderMealPlanEntries(state.mealPlan, planDate, orderedRecipeIds),
    }));
  };

  const togglePopupItem = (itemId: string) => {
    setPopup((current) =>
      current ? { ...current, selected: { ...current.selected, [itemId]: !current.selected[itemId] } } : current,
    );
  };

  const togglePopupAll = () => {
    setPopup((current) => {
      if (!current) {
        return current;
      }
      const items = getItemsForRecipe(current.recipe);
      const allSelected = items.length > 0 && items.every((item) => current.selected[item.id]);
      if (allSelected) {
        return { ...current, selected: {} };
      }
      const next: Record<string, boolean> = {};
      items.forEach((item) => {
        next[item.id] = true;
      });
      return { ...current, selected: next };
    });
  };

  const addPopupItems = () => {
    if (!popup) {
      return;
    }
    const items = getItemsForRecipe(popup.recipe).filter((item) => popup.selected[item.id]);
    if (!items.length) {
      return;
    }
    const now = Date.now();
    updateState((state) => ({
      ...state,
      shoppingItems: [
        ...state.shoppingItems,
        ...items.map((item, index) => ({
          id: createId(),
          date: "",
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          category: item.category,
          sourceLabel: popup.recipe.title,
          createdAt: now + index,
          checked: false,
        })),
      ],
    }));
    setStatusMessage(`已加入 ${items.length} 项到采购清单`);
    window.setTimeout(() => setStatusMessage(""), 2200);
    setPopup(null);
  };

  const toggleShoppingItem = (id: string) => {
    updateState((state) => ({
      ...state,
      shoppingItems: state.shoppingItems.map((item) =>
        item.id === id
          ? { ...item, checked: !item.checked, checkedAt: !item.checked ? Date.now() : undefined }
          : item,
      ),
    }));
  };

  const deleteCheckedShoppingItems = () => {
    const count = appState.shoppingItems.filter((item) => item.checked).length;
    if (!count || !window.confirm(`确定删除 ${count} 个已勾选的采购项？`)) {
      return;
    }
    updateState((state) => ({
      ...state,
      shoppingItems: state.shoppingItems.filter((item) => !item.checked),
    }));
    setStatusMessage(`已删除 ${count} 个已勾选项`);
    window.setTimeout(() => setStatusMessage(""), 2200);
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
          date: "",
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

  const addManualShoppingItemAndClose = () => {
    if (!manualItem.name.trim()) {
      return;
    }
    addManualShoppingItem();
    setManualShoppingOpen(false);
  };

  const buildShoppingText = () => {
    const lines = sortedShoppingItems.map((item) => {
      const amount = [item.amount, item.unit].filter(Boolean).join("");
      return `- ${item.name}${amount ? ` ${amount}` : ""}`;
    });
    return lines.join("\n");
  };

  const copyShoppingText = async () => {
    const text = buildShoppingText();
    if (!text) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setStatusMessage("已复制采购清单");
    window.setTimeout(() => setStatusMessage(""), 1800);
  };

  const createLocalBackup = () => {
    const backupKey = createAppStateBackup();
    if (!backupKey) {
      setBackupStatus("暂无本地数据可备份");
      return;
    }

    setSyncMetadata((current) => {
      const next = { ...current, migrationStatus: "backup-created" as const };
      saveSyncMetadata(next);
      return next;
    });
    setBackupStatus("已创建本地备份");
  };

  const exportData = async () => {
    const json = JSON.stringify(appState, null, 2);
    const fileName = `what-food-today-${getTodayKey()}.json`;
    const isNative = Boolean((window as { Capacitor?: unknown }).Capacitor);
    if (isNative) {
      try {
        const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const result = await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        await Share.share({ title: "今天吃啥 数据备份", url: result.uri, dialogTitle: "保存或分享数据备份" });
        setDataStatus("已生成数据备份文件");
      } catch {
        setDataStatus("导出失败，请重试");
      }
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setDataStatus("已导出数据文件");
    }
    window.setTimeout(() => setDataStatus(""), 2600);
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const migrated = migrateAppState(JSON.parse(text) as Partial<AppState>);
      if (!migrated.recipes.length && !migrated.mealPlan.length && !migrated.shoppingItems.length) {
        setDataStatus("导入失败：文件里没有有效数据");
        return;
      }
      if (!window.confirm("导入将替换当前全部数据（食谱、菜单计划、采购清单），确定继续？")) {
        return;
      }
      setAppState(migrated);
      setDataStatus(`已导入 ${migrated.recipes.length} 个食谱`);
      window.setTimeout(() => setDataStatus(""), 2600);
    } catch {
      setDataStatus("导入失败：文件格式不正确");
      window.setTimeout(() => setDataStatus(""), 2600);
    }
  };

  const recognizeImageText = async (file: File) => {
    setOcrBusy(true);
    setImportStatus("");
    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(file, "chi_sim+eng");
      const text = (data.text || "").trim();
      if (!text) {
        setImportStatus("未识别到文字，请换一张更清晰的图片");
      } else {
        setImportText((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
        setImportStatus("已识别文字，请检查后点击「解析」");
      }
    } catch {
      setImportStatus("识别失败：请确认网络可用后重试（首次识别需下载语言包）");
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${drawerOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Soup size={26} />
          </div>
          <div className="brand-text">
            <h1>今天吃啥？</h1>
            <p>菜单计划和采购清单</p>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? "展开导航" : "收起导航"}
          >
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>

        <nav className="nav-tabs" aria-label="主导航">
          <NavTabs activeTab={activeTab} onChange={handleTabChange} />
        </nav>

        <AccountPanel
          auth={auth}
          email={accountEmail}
          setEmail={setAccountEmail}
          syncStatus={getSyncStatusLabel(auth.isConfigured, auth.session?.user.id, syncMetadata.syncStatus, isOnline)}
          backupStatus={backupStatus}
          createLocalBackup={createLocalBackup}
        />

        <DataPanel
          dataStatus={dataStatus}
          onExport={exportData}
          onImport={importData}
        />

        <div className="sidebar-stats">
          <div>
            <strong>{appState.recipes.length}</strong>
            <span>食谱</span>
          </div>
          <div>
            <strong>{plannedCount}</strong>
            <span>已安排</span>
          </div>
          <div>
            <strong>{shoppingCount}</strong>
            <span>采购项</span>
          </div>
        </div>
      </aside>

      <div
        className={`sidebar-backdrop ${drawerOpen ? "visible" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <main className="main-content">
        <div className="mobile-topbar">
          <button className="icon-button" onClick={() => setDrawerOpen(true)} title="打开导航" aria-label="打开导航">
            <Menu size={20} />
          </button>
          <span>今天吃啥？</span>
        </div>

        {activeTab === "plan" && (
          <section className="workspace">
            <SectionHeader
              icon={<CalendarDays size={22} />}
              title="菜单计划"
              action={
                <div className="day-controls">
                  <button className="icon-button" onClick={() => setPlanDate(getTodayKey())} title="回到今天">
                    <Check size={17} />
                  </button>
                  <button className="ghost-button" onClick={() => setPlanDate((date) => shiftDay(date, -1))}>
                    前一天
                  </button>
                  <button className="ghost-button" onClick={() => setPlanDate((date) => shiftDay(date, 1))}>
                    后一天
                  </button>
                </div>
              }
            />
            {statusMessage && <div className="status-note">{statusMessage}</div>}
            <div className="day-header">{formatDayHeader(planDate)}</div>

            <DayMenuList
              recipes={plannedRecipes}
              planDate={planDate}
              openMenuRecipeId={planCardMenuRecipeId}
              onToggleMenu={(recipeId) =>
                setPlanCardMenuRecipeId((current) => (current === recipeId ? null : recipeId))
              }
              onMoveDate={moveRecipeToDate}
              onRemove={removeRecipeFromDate}
              onReorder={reorderPlannedRecipes}
            />

            <div className="plan-picker">
              <input value={planSearch} onChange={(event) => setPlanSearch(event.target.value)} placeholder="想吃什么就告诉我，别客气！" />
              {planSearch.trim() &&
                (planSearchResults.length === 0 ? (
                  <div className="plan-picker-empty">没有匹配的食谱</div>
                ) : (
                  <div className="plan-picker-results">
                    {planSearchResults.map((recipe) => (
                      <button key={recipe.id} onClick={() => addRecipeToDate(recipe)}>
                        {recipe.title}
                      </button>
                    ))}
                  </div>
                ))}
            </div>
          </section>
        )}

        {activeTab === "recipes" && (
          <section className="workspace">
            {recipeView === "edit" ? (
              <>
                <div className="recipe-edit-header">
                  <button className="icon-button" onClick={backToRecipeFeed} title="返回食谱信息流" aria-label="返回食谱信息流">
                    <ArrowLeft size={18} />
                  </button>
                  <h2>{editingRecipeId ? "编辑食谱" : "新增食谱"}</h2>
                </div>
                <RecipeForm
                  draft={recipeDraft}
                  editingRecipeId={editingRecipeId}
                  setDraft={setRecipeDraft}
                  saveRecipe={saveRecipe}
                  cancelEdit={backToRecipeFeed}
                  updateRecipeItem={updateRecipeItem}
                  addRecipeItem={addRecipeItem}
                  removeRecipeItem={removeRecipeItem}
                  moveRecipeItem={moveRecipeItem}
                  reorderRecipeItem={reorderRecipeItem}
                />
              </>
            ) : (
              <>
                <SectionHeader
                  icon={<Utensils size={22} />}
                  title="食谱库"
                  action={
                    <button className="primary-button" onClick={startNewRecipe}>
                      <Plus size={16} />
                      新增食谱
                    </button>
                  }
                />
                <div className="recipe-feed-panel">
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
                      <EmptyState title="还没有食谱" text="点右上角「新增食谱」创建一道常做菜，或到导入中心导入。" />
                    ) : (
                      filteredRecipes.map((recipe) => (
                        <RecipeFeedCard
                          key={recipe.id}
                          recipe={recipe}
                          expanded={expandedRecipeId === recipe.id}
                          onToggle={() => setExpandedRecipeId((current) => (current === recipe.id ? null : recipe.id))}
                          onEdit={() => editRecipe(recipe)}
                          onDelete={() => deleteRecipe(recipe.id)}
                          menuPickerOpen={menuPickerRecipeId === recipe.id}
                          onToggleMenuPicker={() =>
                            setMenuPickerRecipeId((current) => (current === recipe.id ? null : recipe.id))
                          }
                          onAddToDate={(dateKey) => addRecipeFromFeed(recipe, dateKey)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
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
                  <button className="ghost-button" onClick={() => imageInputRef.current?.click()} disabled={ocrBusy}>
                    <ImageUp size={16} />
                    {ocrBusy ? "识别中…" : "上传图片识别文字"}
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        recognizeImageText(file);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
                <p className="import-hint">
                  可上传食谱截图自动识别文字填入上方文本框（本地识别，首次需联网下载中文语言包）；粘贴网址抓取因浏览器跨域限制暂不支持。
                </p>
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
                <div className="header-actions">
                  <button className="ghost-button" onClick={() => setManualShoppingOpen(true)}>
                    <Plus size={16} />
                    手动添加
                  </button>
                  <button
                    className="ghost-button danger"
                    onClick={deleteCheckedShoppingItems}
                    disabled={!appState.shoppingItems.some((item) => item.checked)}
                    title="删除所有已勾选的采购项"
                  >
                    <Trash2 size={16} />
                    批量删除
                  </button>
                  <button className="primary-button" onClick={() => copyShoppingText()}>
                    <Copy size={16} />
                    复制清单
                  </button>
                </div>
              }
            />
            {statusMessage && <div className="status-note">{statusMessage}</div>}
            <div className="shopping-list">
              {sortedShoppingItems.length === 0 ? (
                <EmptyState title="暂无采购项" text="安排食谱时通过弹窗勾选缺少的食材，或手动添加采购项。" />
              ) : (
                sortedShoppingItems.map((item) => (
                  <label className={`shopping-item ${item.checked ? "checked" : ""}`} key={item.id}>
                    <input type="checkbox" checked={item.checked} onChange={() => toggleShoppingItem(item.id)} />
                    <span className="category-dot">{item.category}</span>
                    <span className="shopping-item-main">
                      <strong>{item.name}</strong>
                      <span className="shopping-item-amount">{[item.amount, item.unit].filter(Boolean).join("") || "适量"}</span>
                    </span>
                    <small>{item.sourceLabel}</small>
                  </label>
                ))
              )}
            </div>
            {manualShoppingOpen && (
              <div className="modal-overlay" onClick={() => setManualShoppingOpen(false)}>
                <div className="modal" onClick={(event) => event.stopPropagation()}>
                  <header className="modal-header">
                    <div>
                      <h3>手动添加</h3>
                      <p>加入统一的采购清单</p>
                    </div>
                    <button className="icon-button" onClick={() => setManualShoppingOpen(false)} title="关闭">
                      <X size={16} />
                    </button>
                  </header>
                  <div className="manual-shopping-grid">
                    <label>
                      采购项
                      <input
                        value={manualItem.name}
                        onChange={(event) => setManualItem((current) => ({ ...current, name: event.target.value }))}
                        placeholder="例如 番茄"
                      />
                    </label>
                    <label>
                      数量
                      <input
                        value={manualItem.amount}
                        onChange={(event) => setManualItem((current) => ({ ...current, amount: event.target.value }))}
                        placeholder="数量"
                      />
                    </label>
                    <label>
                      单位
                      <input
                        value={manualItem.unit}
                        onChange={(event) => setManualItem((current) => ({ ...current, unit: event.target.value }))}
                        placeholder="单位"
                      />
                    </label>
                    <label>
                      分类
                      <select
                        value={manualItem.category}
                        onChange={(event) => setManualItem((current) => ({ ...current, category: event.target.value as Category }))}
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <footer className="modal-footer">
                    <button className="primary-button" onClick={addManualShoppingItemAndClose} disabled={!manualItem.name.trim()}>
                      <Plus size={16} />
                      添加
                    </button>
                  </footer>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "me" && (
          <section className="workspace me-workspace">
            <SectionHeader icon={<UserRound size={22} />} title="我的" />
            <div className="me-card">
              <div className="brand">
                <div className="brand-mark">
                  <Soup size={26} />
                </div>
                <div>
                  <h1>今天吃啥？</h1>
                  <p>菜单计划和采购清单</p>
                </div>
              </div>
              <AccountPanel
                auth={auth}
                email={accountEmail}
                setEmail={setAccountEmail}
                syncStatus={getSyncStatusLabel(auth.isConfigured, auth.session?.user.id, syncMetadata.syncStatus, isOnline)}
                backupStatus={backupStatus}
                createLocalBackup={createLocalBackup}
              />
              <DataPanel dataStatus={dataStatus} onExport={exportData} onImport={importData} />
              <FeedbackPanel />
            </div>
          </section>
        )}
      </main>

      {popup && (
        <IngredientPopup
          recipe={popup.recipe}
          selected={popup.selected}
          onToggleItem={togglePopupItem}
          onToggleAll={togglePopupAll}
          onAdd={addPopupItems}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

function NavTabs({ activeTab, onChange }: { activeTab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <>
      <button className={activeTab === "plan" ? "active" : ""} onClick={() => onChange("plan")}>
        <CalendarDays size={18} />
        <span>菜单计划</span>
      </button>
      <button className={activeTab === "import" ? "active" : ""} onClick={() => onChange("import")}>
        <FileInput size={18} />
        <span>导入中心</span>
      </button>
      <button className={activeTab === "recipes" ? "active" : ""} onClick={() => onChange("recipes")}>
        <Utensils size={18} />
        <span>食谱库</span>
      </button>
      <button className={activeTab === "shopping" ? "active" : ""} onClick={() => onChange("shopping")}>
        <ShoppingBasket size={18} />
        <span>采购清单</span>
      </button>
      <button className={activeTab === "me" ? "active" : ""} onClick={() => onChange("me")}>
        <UserRound size={18} />
        <span>我的</span>
      </button>
    </>
  );
}

const getSyncStatusLabel = (isConfigured: boolean, userId: string | undefined, syncStatus: string, isOnline: boolean) => {
  if (!isConfigured) {
    return "本地模式";
  }
  if (!userId) {
    return "未登录";
  }
  if (!isOnline) {
    return "离线";
  }
  if (syncStatus === "synced") {
    return "已同步";
  }
  if (syncStatus === "failed") {
    return "同步失败";
  }
  return "待同步";
};

function AccountPanel({
  auth,
  email,
  setEmail,
  syncStatus,
  backupStatus,
  createLocalBackup,
}: {
  auth: ReturnType<typeof useAuthSession>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  syncStatus: string;
  backupStatus: string;
  createLocalBackup: () => void;
}) {
  const userEmail = auth.session?.user.email ?? "";

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    auth.signInWithEmail(email);
  };

  return (
    <section className="account-panel">
      <div className="account-heading">
        <UserRound size={17} />
        <span>账号</span>
        <strong>{syncStatus}</strong>
      </div>

      {!auth.isConfigured ? (
        <p>未配置云端，当前继续使用本地数据。</p>
      ) : userEmail ? (
        <>
          <p>{userEmail}</p>
          <div className="account-actions">
            <button className="ghost-button" onClick={createLocalBackup}>
              创建备份
            </button>
            <button className="ghost-button" onClick={auth.signOut}>
              <LogOut size={15} />
              退出
            </button>
          </div>
        </>
      ) : (
        <form className="account-form" onSubmit={submitEmail}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="邮箱 Magic Link" type="email" />
          <button className="primary-button" disabled={!email.trim() || auth.isLoading}>
            <LogIn size={15} />
            发送
          </button>
        </form>
      )}

      {(auth.message || backupStatus) && <p className="account-message">{backupStatus || auth.message}</p>}
    </section>
  );
}

function DataPanel({
  dataStatus,
  onExport,
  onImport,
}: {
  dataStatus: string;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="account-panel">
      <div className="account-heading">
        <Download size={17} />
        <span>数据</span>
      </div>
      <p>导出 JSON 备份文件，或从备份文件恢复数据。</p>
      <div className="account-actions">
        <button className="ghost-button" onClick={onExport}>
          <Download size={15} />
          导出
        </button>
        <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
          <Upload size={15} />
          导入
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onImport(file);
          }
          event.target.value = "";
        }}
      />
      {dataStatus && <p className="account-message">{dataStatus}</p>}
    </section>
  );
}

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

// 菜单计划卡片列表：支持按住手柄拖动排序（鼠标 + 触屏），
// 每张卡片的「更改日期 / 删除」收纳在更多菜单里。
function DayMenuList({
  recipes,
  planDate,
  openMenuRecipeId,
  onToggleMenu,
  onMoveDate,
  onRemove,
  onReorder,
}: {
  recipes: Recipe[];
  planDate: string;
  openMenuRecipeId: string | null;
  onToggleMenu: (recipeId: string) => void;
  onMoveDate: (recipeId: string, toDate: string) => void;
  onRemove: (recipeId: string) => void;
  onReorder: (orderedRecipeIds: string[]) => void;
}) {
  const [order, setOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const orderedRecipes = useMemo(() => {
    if (!order) {
      return recipes;
    }
    const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const ordered = order.flatMap((id) => {
      const recipe = byId.get(id);
      return recipe ? [recipe] : [];
    });
    recipes.forEach((recipe) => {
      if (!order.includes(recipe.id)) {
        ordered.push(recipe);
      }
    });
    return ordered;
  }, [recipes, order]);

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, recipeId: string) => {
    if (event.button !== 0) {
      return;
    }
    dragIdRef.current = recipeId;
    setDraggingId(recipeId);
    setOrder(recipes.map((recipe) => recipe.id));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragId = dragIdRef.current;
    if (!dragId) {
      return;
    }
    const overCard = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-plan-card-id]");
    const overId = overCard?.dataset.planCardId;
    if (!overId || overId === dragId) {
      return;
    }
    setOrder((current) => {
      if (!current) {
        return current;
      }
      const from = current.indexOf(dragId);
      const to = current.indexOf(overId);
      if (from === -1 || to === -1) {
        return current;
      }
      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
    dragIdRef.current = overId;
    setDraggingId(overId);
  };

  const endDrag = () => {
    if (!dragIdRef.current) {
      return;
    }
    const finalOrder = order;
    dragIdRef.current = null;
    setDraggingId(null);
    setOrder(null);
    if (finalOrder && finalOrder.some((id, index) => id !== recipes[index]?.id)) {
      onReorder(finalOrder);
    }
  };

  return (
    <div
      className="day-menu"
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      {orderedRecipes.length === 0 ? (
        <EmptyState title="这一天还没有安排" text="在下方搜索食谱，选择后会弹出食材勾选，可直接加入采购清单。" />
      ) : (
        orderedRecipes.map((recipe) => (
          <article
            className={`recipe-card plan-card ${draggingId === recipe.id ? "dragging" : ""}`}
            key={recipe.id}
            data-plan-card-id={recipe.id}
          >
            <button
              className="drag-handle plan-drag-handle"
              onPointerDown={(event) => beginDrag(event, recipe.id)}
              title="拖动排序"
              type="button"
              aria-label={`拖动排序 ${recipe.title}`}
            >
              <GripVertical size={17} />
            </button>
            <RecipeThumb recipe={recipe} size="sm" />
            <div className="plan-card-main">
              <div className="recipe-card-title">
                <h3>{recipe.title}</h3>
              </div>
              <p className="plan-card-ingredients">{getRecipeIngredientSummary(recipe) || "暂无食材"}</p>
              {getRecipeSeasoningSummary(recipe) && (
                <p className="plan-card-seasonings">调味：{getRecipeSeasoningSummary(recipe)}</p>
              )}
            </div>
            <button
              className="icon-button plan-card-more"
              onClick={() => onToggleMenu(recipe.id)}
              title="更多操作"
              aria-label={`更多操作 ${recipe.title}`}
            >
              <MoreVertical size={16} />
            </button>
            {openMenuRecipeId === recipe.id && (
              <div className="plan-card-menu">
                <label className="plan-card-date">
                  改到
                  <input
                    type="date"
                    value={planDate}
                    onChange={(event) => onMoveDate(recipe.id, event.target.value)}
                  />
                </label>
                <button className="icon-button danger" onClick={() => onRemove(recipe.id)} title="删除" aria-label="删除">
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function RecipeThumb({ recipe, size = "lg" }: { recipe: Recipe; size?: "lg" | "sm" }) {
  if (recipe.image) {
    return (
      <img
        className={`recipe-thumb ${size}`}
        src={recipe.image}
        alt={`${recipe.title}成品图`}
        loading="lazy"
        draggable={false}
      />
    );
  }
  return (
    <div className={`recipe-thumb placeholder ${size}`} aria-hidden="true">
      <Soup size={size === "lg" ? 24 : 18} />
    </div>
  );
}

function RecipeFeedCard({
  recipe,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  menuPickerOpen,
  onToggleMenuPicker,
  onAddToDate,
}: {
  recipe: Recipe;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  menuPickerOpen: boolean;
  onToggleMenuPicker: () => void;
  onAddToDate: (dateKey: string) => void;
}) {
  return (
    <article className={`recipe-card feed-card ${expanded ? "expanded" : ""}`}>
      <div className="feed-card-row">
        <button className="feed-card-main" onClick={onToggle} type="button" aria-expanded={expanded}>
          <RecipeThumb recipe={recipe} />
          <div className="feed-card-text">
            <div className="recipe-card-title">
              <h3>{recipe.title}</h3>
            </div>
            <p>{getRecipeIngredientSummary(recipe) || "暂无食材"}</p>
          </div>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <div className="feed-card-actions">
          <div className="menu-add">
            <button className="icon-button" onClick={onToggleMenuPicker} title="添加到菜单" aria-label="添加到菜单">
              <CalendarPlus size={16} />
            </button>
            {menuPickerOpen && (
              <div className="menu-add-options">
                <button type="button" onClick={() => onAddToDate(getTodayKey())}>
                  今天
                </button>
                <button type="button" onClick={() => onAddToDate(shiftDay(getTodayKey(), 1))}>
                  明天
                </button>
              </div>
            )}
          </div>
          <button className="icon-button" onClick={onEdit} title="编辑" aria-label="编辑">
            <Edit3 size={16} />
          </button>
          <button className="icon-button danger" onClick={onDelete} title="删除" aria-label="删除">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="feed-card-detail">
          <div className="feed-card-method">
            <h4>做法</h4>
            {recipe.method ? <p>{recipe.method}</p> : <p className="muted">暂无做法</p>}
          </div>
        </div>
      )}
    </article>
  );
}

function RecipeImageEditor({ draft, setDraft }: { draft: Recipe; setDraft: Dispatch<SetStateAction<Recipe>> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const dataUrl = await readImageAsRecipeDataUrl(file);
      setDraft((current) => ({ ...current, image: dataUrl }));
    } catch {
      setError("图片读取失败，请换一张试试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="recipe-image-editor">
      {draft.image ? (
        <>
          <img className="recipe-image-preview" src={draft.image} alt={`${draft.title || "食谱"}成品图`} />
          <div className="recipe-image-actions">
            <button className="ghost-button" onClick={() => fileInputRef.current?.click()} disabled={busy} type="button">
              <ImageUp size={15} />
              换一张
            </button>
            <button
              className="ghost-button danger"
              onClick={() => setDraft((current) => ({ ...current, image: "" }))}
              disabled={busy}
              type="button"
            >
              <Trash2 size={15} />
              移除图片
            </button>
          </div>
        </>
      ) : (
        <button className="recipe-image-upload" onClick={() => fileInputRef.current?.click()} disabled={busy} type="button">
          <ImagePlus size={20} />
          <span>{busy ? "处理中…" : "上传成品图"}</span>
        </button>
      )}
      {error && <p className="recipe-image-error">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          void handleFile(file);
          event.target.value = "";
        }}
      />
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
  reorderRecipeItem,
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
  reorderRecipeItem: (section: RecipeSection, itemId: string, direction: -1 | 1) => void;
}) {
  return (
    <div className="editor-panel">
      <RecipeImageEditor draft={draft} setDraft={setDraft} />

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
        reorderRecipeItem={reorderRecipeItem}
      />

      <ItemEditor
        title="调味料"
        items={getRecipeSeasonings(draft)}
        section="seasonings"
        updateRecipeItem={updateRecipeItem}
        addRecipeItem={addRecipeItem}
        removeRecipeItem={removeRecipeItem}
        moveRecipeItem={moveRecipeItem}
        reorderRecipeItem={reorderRecipeItem}
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
  reorderRecipeItem,
}: {
  title: string;
  items: Ingredient[];
  section: RecipeSection;
  updateRecipeItem: (section: RecipeSection, itemId: string, field: keyof Ingredient, value: string) => void;
  addRecipeItem: (section: RecipeSection) => void;
  removeRecipeItem: (section: RecipeSection, itemId: string) => void;
  moveRecipeItem: (source: RecipeSection, target: RecipeSection, itemId: string) => void;
  reorderRecipeItem: (section: RecipeSection, itemId: string, direction: -1 | 1) => void;
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
        {items.map((item, index) => (
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
            <select value={item.unit} onChange={(event) => updateRecipeItem(section, item.id, "unit", event.target.value)}>
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {UNIT_LABELS[unit]}
                </option>
              ))}
            </select>
            <select value={item.category} onChange={(event) => updateRecipeItem(section, item.id, "category", event.target.value)}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="item-reorder" role="group" aria-label="调整顺序">
              <button
                className="reorder-button"
                onClick={() => reorderRecipeItem(section, item.id, -1)}
                disabled={index === 0}
                title="上移"
                type="button"
              >
                <ArrowUp size={14} />
              </button>
              <button
                className="reorder-button"
                onClick={() => reorderRecipeItem(section, item.id, 1)}
                disabled={index === items.length - 1}
                title="下移"
                type="button"
              >
                <ArrowDown size={14} />
              </button>
            </div>
            <button className="icon-button item-delete" onClick={() => removeRecipeItem(section, item.id)} title="删除">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IngredientPopup({
  recipe,
  selected,
  onToggleItem,
  onToggleAll,
  onAdd,
  onClose,
}: {
  recipe: Recipe;
  selected: Record<string, boolean>;
  onToggleItem: (itemId: string) => void;
  onToggleAll: () => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  const items = getItemsForRecipe(recipe);
  const selectedCount = items.filter((item) => selected[item.id]).length;
  const allSelected = items.length > 0 && items.every((item) => selected[item.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h3>{recipe.title}</h3>
            <p>勾选缺少的食材，加入采购清单</p>
          </div>
          <button className="icon-button" onClick={onClose} title="关闭">
            <X size={16} />
          </button>
        </header>

        <div className="shopping-list modal-ingredient-list">
          {items.length === 0 ? (
            <EmptyState title="这个食谱还没有食材" text="可以先加入菜单，之后在食谱库补全食材。" compact />
          ) : (
            items.map((item) => (
              <label className={`shopping-item ${selected[item.id] ? "selected" : ""}`} key={item.id}>
                <input type="checkbox" checked={Boolean(selected[item.id])} onChange={() => onToggleItem(item.id)} />
                <span className="category-dot">{item.category}</span>
                <span className="shopping-item-main">
                  <strong>{item.name}</strong>
                  <span className="shopping-item-amount">{[item.amount, item.unit].filter(Boolean).join("") || "适量"}</span>
                </span>
              </label>
            ))
          )}
        </div>

        <footer className="modal-footer">
          <label className="select-all">
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            全选
          </label>
          <button className="primary-button" onClick={onAdd} disabled={selectedCount === 0}>
            <ListPlus size={16} />
            加入已选{selectedCount ? ` (${selectedCount})` : ""}
          </button>
        </footer>
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

function FeedbackPanel() {
  const [feedbackText, setFeedbackText] = useState("");
  const [copied, setCopied] = useState(false);
  const feedbackBody = feedbackText.trim();

  const openGitHubIssue = () => {
    const title = "App 反馈";
    const body = feedbackBody || "（请在此描述你的建议或遇到的问题）";
    const url = `https://github.com/Jackiehill-ff/What-food-today/issues/new?title=${encodeURIComponent(
      title,
    )}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyFeedback = async () => {
    if (!feedbackBody) {
      return;
    }
    await navigator.clipboard.writeText(feedbackBody);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="account-panel feedback-panel">
      <div className="account-heading">
        <MessageSquare size={17} />
        <span>反馈</span>
      </div>
      <p>写下建议或问题，提交到 GitHub Issues（公开仓库），或复制后自行发送。</p>
      <textarea
        value={feedbackText}
        onChange={(event) => setFeedbackText(event.target.value)}
        rows={3}
        placeholder="描述建议或遇到的问题…"
      />
      <div className="account-actions">
        <button className="ghost-button" onClick={openGitHubIssue} disabled={!feedbackBody}>
          <ExternalLink size={15} />
          提交到 GitHub
        </button>
        <button className="ghost-button" onClick={copyFeedback} disabled={!feedbackBody}>
          <Copy size={15} />
          {copied ? "已复制" : "复制"}
        </button>
      </div>
    </section>
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
