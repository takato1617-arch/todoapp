"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./page.module.css";

// ----- 選択肢の定義 -----
const PRIORITIES = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

// 新規カテゴリに順番に割り当てる配色パレット
const CATEGORY_PALETTE = [
  { bg: "#dcfce7", text: "#047857" },
  { bg: "#fef3c7", text: "#b45309" },
  { bg: "#ede9fe", text: "#6d28d9" },
  { bg: "#cffafe", text: "#0e7490" },
  { bg: "#ffe4e6", text: "#be123c" },
  { bg: "#fae8ff", text: "#a21caf" },
  { bg: "#fef9c3", text: "#a16207" },
];

const FALLBACK_CATEGORY = { label: "（削除済み）", bg: "#e5e7eb", text: "#6b7280" };

const priorityLabel = (v) => PRIORITIES.find((p) => p.value === v)?.label ?? "";

// ----- 日付ユーティリティ -----
function formatDate(d) {
  if (!d) return "";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}

function isOverdue(d) {
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(d + "T00:00:00") < today;
}

// fetch のラッパー。エラー時は例外を投げる。
async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `エラー (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export default function Home() {
  // 認証状態: "checking" | "out" | "in"
  const [authState, setAuthState] = useState("checking");
  // ログイン中のユーザー名（ヘッダー表示用）
  const [userName, setUserName] = useState("");
  // 新規登録に招待合言葉が必要か
  const [inviteRequired, setInviteRequired] = useState(true);

  // 起動時にセッションを確認
  useEffect(() => {
    api("/api/session")
      .then((d) => {
        if (d.authenticated) {
          setUserName(d.name || "");
          setAuthState("in");
        } else {
          setInviteRequired(d.inviteRequired !== false);
          setAuthState("out");
        }
      })
      .catch(() => setAuthState("out"));
  }, []);

  if (authState === "checking") {
    return <main className={styles.loading}>読み込み中...</main>;
  }
  if (authState === "out") {
    return (
      <LoginGate
        inviteRequired={inviteRequired}
        onSuccess={(name) => {
          setUserName(name || "");
          setAuthState("in");
        }}
      />
    );
  }
  return (
    <TodoApp
      userName={userName}
      onLogout={() => {
        setUserName("");
        setAuthState("out");
      }}
    />
  );
}

// ===================== ログイン / 新規登録画面 =====================
function LoginGate({ onSuccess, inviteRequired }) {
  // "login"（ログイン） | "register"（新規登録）
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  function switchMode(next) {
    setMode(next);
    setError("");
    setPassword("");
    setInvite("");
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !password) return;
    setSubmitting(true);
    setError("");
    try {
      const path = isRegister ? "/api/register" : "/api/login";
      const body = isRegister
        ? { name, password, invite }
        : { name, password };
      const result = await api(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onSuccess(result?.name || name.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.gate}>
      <form className={styles.gateCard} onSubmit={submit}>
        <h1 className={styles.gateTitle}>Todo</h1>
        <p className={styles.gateSubtitle}>
          {isRegister
            ? "名前とパスワードでアカウントを作成"
            : "名前とパスワードでログイン"}
        </p>
        <input
          className={styles.gateInput}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="名前"
          aria-label="名前"
          autoFocus
          autoComplete="username"
        />
        <input
          className={styles.gateInput}
          style={{ marginTop: 10 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          aria-label="パスワード"
          autoComplete={isRegister ? "new-password" : "current-password"}
        />
        {isRegister && inviteRequired && (
          <input
            className={styles.gateInput}
            style={{ marginTop: 10 }}
            type="password"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder="招待合言葉"
            aria-label="招待合言葉"
          />
        )}
        <button className={styles.gateButton} type="submit" disabled={submitting}>
          {submitting
            ? "処理中..."
            : isRegister
            ? "アカウント作成"
            : "ログイン"}
        </button>
        {error && <p className={styles.gateError}>{error}</p>}
        <button
          type="button"
          className={styles.gateSwitch}
          onClick={() => switchMode(isRegister ? "login" : "register")}
        >
          {isRegister
            ? "アカウントをお持ちの方はこちら"
            : "新規登録はこちら"}
        </button>
      </form>
    </main>
  );
}

// ===================== Todo本体 =====================
function TodoApp({ onLogout, userName }) {
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloading, setReloading] = useState(false);

  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  // 新規カテゴリ作成
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // 設定モーダルの開閉
  const [showSettings, setShowSettings] = useState(false);

  // メモ出力（項目を選択してテキスト化）
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [memoText, setMemoText] = useState(null);

  // 編集中の項目
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  const [editCategory, setEditCategory] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  // フィルター
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // カテゴリ value → カテゴリ情報 の早見表
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => map.set(c.value, c));
    return map;
  }, [categories]);

  const getCategory = (v) => categoryMap.get(v) ?? FALLBACK_CATEGORY;

  // 最上位カテゴリ（親を持たないもの）。サブカテゴリの親候補に使う。
  const topCategories = useMemo(
    () => categories.filter((c) => !c.parent),
    [categories]
  );

  // 親→子の順に並べ、各カテゴリに階層の深さ(depth)を付与した一覧。
  // セレクトボックスやカテゴリ管理での階層表示に使う。
  const orderedCategories = useMemo(() => {
    const out = [];
    const seen = new Set();
    categories
      .filter((c) => !c.parent)
      .forEach((parent) => {
        out.push({ ...parent, depth: 0 });
        seen.add(parent.value);
        categories
          .filter((c) => c.parent === parent.value)
          .forEach((child) => {
            out.push({ ...child, depth: 1 });
            seen.add(child.value);
          });
      });
    // 親が存在しない孤立サブカテゴリは最上位として拾う
    categories.forEach((c) => {
      if (!seen.has(c.value)) out.push({ ...c, depth: 0 });
    });
    return out;
  }, [categories]);

  // 初回: サーバーから読み込む
  useEffect(() => {
    Promise.all([api("/api/todos"), api("/api/categories")])
      .then(([t, c]) => {
        setTodos(t);
        setCategories(c);
        if (c.length > 0) setCategory(c[0].value);
        setLoaded(true);
      })
      .catch((err) => {
        if (err.status === 401) {
          onLogout();
        } else {
          setLoadError(err.message);
          setLoaded(true);
        }
      });
  }, [onLogout]);

  async function logout() {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  // サーバーから最新のTodo・カテゴリを取り直す
  async function reload() {
    if (reloading) return;
    setReloading(true);
    setLoadError("");
    try {
      const [t, c] = await Promise.all([
        api("/api/todos"),
        api("/api/categories"),
      ]);
      setTodos(t);
      setCategories(c);
      // 選択中カテゴリが消えていたら先頭に寄せる
      setCategory((prev) =>
        c.some((x) => x.value === prev) ? prev : c[0]?.value ?? ""
      );
    } catch (err) {
      if (err.status === 401) onLogout();
      else setLoadError(err.message);
    } finally {
      setReloading(false);
    }
  }

  async function addTodo(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const created = await api("/api/todos", {
      method: "POST",
      body: JSON.stringify({ text, priority, category, dueDate }),
    });
    setTodos((prev) => [created, ...prev]);
    setInput("");
    setDueDate("");
  }

  async function toggleTodo(id) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const updated = await api(`/api/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: !target.completed }),
    });
    setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function deleteTodo(id) {
    if (editingId === id) cancelEdit();
    await api(`/api/todos/${id}`, { method: "DELETE" });
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  // ----- 編集 -----
  function startEdit(todo) {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority);
    setEditCategory(
      categoryMap.has(todo.category) ? todo.category : categories[0]?.value ?? ""
    );
    setEditDueDate(todo.dueDate);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(e) {
    e?.preventDefault();
    const text = editText.trim();
    if (!text) return;
    const updated = await api(`/api/todos/${editingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        text,
        priority: editPriority,
        category: editCategory,
        dueDate: editDueDate,
      }),
    });
    setTodos((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
    setEditingId(null);
  }

  // ----- カテゴリ作成 -----
  async function addCategory(e) {
    e.preventDefault();
    const label = newCategory.trim();
    if (!label) return;
    if (categories.some((c) => c.label === label)) {
      setCategoryError("同じ名前のカテゴリが既にあります");
      return;
    }
    const palette = CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length];
    try {
      const created = await api("/api/categories", {
        method: "POST",
        body: JSON.stringify({
          label,
          bg: palette.bg,
          text: palette.text,
          parent: newCategoryParent || null,
        }),
      });
      setCategories((prev) => [...prev, created]);
      setCategory(created.value);
      setNewCategory("");
      setNewCategoryParent("");
      setCategoryError("");
    } catch (err) {
      setCategoryError(err.message);
    }
  }

  async function deleteCategory(value) {
    await api(`/api/categories/${value}`, { method: "DELETE" });
    // DB側は ON DELETE SET NULL で子の親を外すので、ローカルも合わせる
    setCategories((prev) =>
      prev
        .filter((c) => c.value !== value)
        .map((c) => (c.parent === value ? { ...c, parent: null } : c))
    );
    if (category === value) setCategory(categories[0]?.value ?? "");
    if (filterCategory === value) setFilterCategory("all");
  }

  // カテゴリフィルター判定。親カテゴリを選んだら、その子カテゴリの項目も含める。
  const matchesCategoryFilter = (todoCat) => {
    if (filterCategory === "all") return true;
    if (todoCat === filterCategory) return true;
    return categoryMap.get(todoCat)?.parent === filterCategory;
  };

  // フィルター適用後のリスト
  const visibleTodos = useMemo(
    () =>
      todos.filter(
        (t) =>
          matchesCategoryFilter(t.category) &&
          (filterPriority === "all" || t.priority === filterPriority)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todos, filterCategory, filterPriority, categoryMap]
  );

  // ----- 並び替え（ドラッグ&ドロップ） -----
  const sensors = useSensors(
    // 6px以上動かしたらドラッグ開始（タップやボタン操作と区別する）
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleTodos.findIndex((t) => t.id === active.id);
    const newIndex = visibleTodos.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    // 表示中リストを並べ替え、隠れている項目の位置は保ったまま全体へ反映
    const newVisible = arrayMove(visibleTodos, oldIndex, newIndex);
    const visibleIds = new Set(visibleTodos.map((t) => t.id));
    let vi = 0;
    const newTodos = todos.map((t) =>
      visibleIds.has(t.id) ? newVisible[vi++] : t
    );
    setTodos(newTodos);

    // サーバーに新しい並び順を保存
    try {
      await api("/api/todos/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: newTodos.map((t) => t.id) }),
      });
    } catch (err) {
      if (err.status === 401) onLogout();
    }
  }

  // 完了率（フィルター後の表示対象を基準にする）
  const total = visibleTodos.length;
  const done = visibleTodos.filter((t) => t.completed).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  const isCustomCategory = (value) => !categoryMap.get(value)?.isDefault;

  // ----- メモ出力（選択した項目をテキスト化） -----
  function toggleSelectMode() {
    setSelectMode((on) => {
      if (on) setSelectedIds(new Set()); // 解除時は選択をクリア
      return !on;
    });
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(visibleTodos.map((t) => t.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // 選択中の項目を「>内容。」形式に整形する
  function buildMemo(items) {
    return items.map((t) => `>${t.text}。`).join("\n");
  }

  async function exportMemo() {
    // todos の並び順を保ったまま、選択された項目だけ抽出
    const items = todos.filter((t) => selectedIds.has(t.id));
    if (items.length === 0) return;
    const text = buildMemo(items);
    setMemoText(text);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // クリップボードが使えない場合はモーダルから手動コピーしてもらう
    }
  }

  // メモ出力後、チェックした項目をまとめて削除する
  async function deleteSelectedTodos() {
    const ids = todos.filter((t) => selectedIds.has(t.id)).map((t) => t.id);
    if (ids.length === 0) return;
    if (editingId && selectedIds.has(editingId)) cancelEdit();
    await Promise.all(
      ids.map((id) =>
        api(`/api/todos/${id}`, { method: "DELETE" }).catch(() => {})
      )
    );
    setTodos((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    setMemoText(null);
  }

  if (!loaded) {
    return <main className={styles.loading}>読み込み中...</main>;
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Todo</h1>
            <p className={styles.subtitle}>
              {userName ? `${userName}さん · ` : ""}
              {done} / {total} 完了
            </p>
          </div>
          <div className={styles.headerActions}>
            <ProgressRing rate={rate} />
            <button
              className={`${styles.reloadButton} ${
                reloading ? styles.reloadButtonSpinning : ""
              }`}
              onClick={reload}
              disabled={reloading}
              aria-label="再読み込み"
              title="再読み込み"
            >
              ↻
            </button>
            <button
              className={styles.settingsButton}
              onClick={() => setShowSettings(true)}
              aria-label="設定"
              title="設定"
            >
              ⚙
            </button>
            <button className={styles.logoutButton} onClick={logout}>
              ログアウト
            </button>
          </div>
        </header>

        {loadError && <p className={styles.gateError}>{loadError}</p>}

        {/* 追加フォーム */}
        <form onSubmit={addTodo} className={styles.form}>
          <div className={styles.inputRow}>
            <AutoGrowTextarea
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onSubmit={addTodo}
              placeholder="やることを入力..."
              aria-label="新しいTodo"
            />
            <button
              className={styles.addButton}
              type="submit"
              aria-label="追加"
            >
              +
            </button>
          </div>
          <div className={styles.optionRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>優先度</span>
              <select
                className={styles.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>カテゴリ</span>
              <select
                className={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {orderedCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.depth ? `　└ ${c.label}` : c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>締め切り</span>
              <input
                className={styles.select}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>
        </form>

        {/* フィルター */}
        <div className={styles.filters}>
          <FilterGroup
            label="カテゴリ"
            options={[
              { value: "all", label: "すべて" },
              ...orderedCategories.map((c) => ({
                value: c.value,
                label: c.depth ? `└ ${c.label}` : c.label,
              })),
            ]}
            value={filterCategory}
            onChange={setFilterCategory}
          />
          <FilterGroup
            label="優先度"
            options={[{ value: "all", label: "すべて" }, ...PRIORITIES]}
            value={filterPriority}
            onChange={setFilterPriority}
          />
        </div>

        {/* メモ出力ツールバー */}
        <div className={styles.listToolbar}>
          <button
            type="button"
            className={`${styles.memoToggle} ${
              selectMode ? styles.memoToggleActive : ""
            }`}
            onClick={toggleSelectMode}
          >
            {selectMode ? "選択をやめる" : "📋 メモ出力"}
          </button>
          {selectMode && (
            <div className={styles.memoActions}>
              <span className={styles.memoCount}>{selectedIds.size}件選択</span>
              <button
                type="button"
                className={styles.memoSubButton}
                onClick={selectAllVisible}
              >
                表示中を全選択
              </button>
              <button
                type="button"
                className={styles.memoSubButton}
                onClick={clearSelection}
                disabled={selectedIds.size === 0}
              >
                選択解除
              </button>
              <button
                type="button"
                className={styles.memoCopyButton}
                onClick={exportMemo}
                disabled={selectedIds.size === 0}
              >
                メモにコピー
              </button>
            </div>
          )}
        </div>

        {/* リスト（ドラッグで並び替え可能） */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleTodos.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className={styles.list}>
              {visibleTodos.length === 0 && (
                <li className={styles.empty}>
                  {todos.length === 0
                    ? "まだ項目がありません"
                    : "条件に一致する項目がありません"}
                </li>
              )}
              {visibleTodos.map((todo) => (
                <SortableTodoItem
                  key={todo.id}
                  todo={todo}
                  isEditing={editingId === todo.id}
                  categories={orderedCategories}
                  getCategory={getCategory}
                  selectMode={selectMode}
                  selected={selectedIds.has(todo.id)}
                  onToggleSelect={toggleSelected}
                  toggleTodo={toggleTodo}
                  deleteTodo={deleteTodo}
                  startEdit={startEdit}
                  saveEdit={saveEdit}
                  cancelEdit={cancelEdit}
                  editText={editText}
                  setEditText={setEditText}
                  editPriority={editPriority}
                  setEditPriority={setEditPriority}
                  editCategory={editCategory}
                  setEditCategory={setEditCategory}
                  editDueDate={editDueDate}
                  setEditDueDate={setEditDueDate}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      {showSettings && (
        <SettingsModal
          orderedCategories={orderedCategories}
          topCategories={topCategories}
          isCustomCategory={isCustomCategory}
          deleteCategory={deleteCategory}
          addCategory={addCategory}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          newCategoryParent={newCategoryParent}
          setNewCategoryParent={setNewCategoryParent}
          categoryError={categoryError}
          setCategoryError={setCategoryError}
          onClose={() => {
            setShowSettings(false);
            setNewCategory("");
            setNewCategoryParent("");
            setCategoryError("");
          }}
        />
      )}

      {memoText !== null && (
        <MemoModal
          text={memoText}
          selectedCount={selectedIds.size}
          onDeleteSelected={deleteSelectedTodos}
          onClose={() => setMemoText(null)}
        />
      )}
    </main>
  );
}

// ===================== 設定モーダル（カテゴリ管理） =====================
function SettingsModal({
  orderedCategories,
  topCategories,
  isCustomCategory,
  deleteCategory,
  addCategory,
  newCategory,
  setNewCategory,
  newCategoryParent,
  setNewCategoryParent,
  categoryError,
  setCategoryError,
  onClose,
}) {
  // Escキーで閉じる
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="設定"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>設定</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <section className={styles.modalSection}>
          <span className={styles.categoryManagerLabel}>カテゴリ管理</span>
          <div className={styles.categoryTree}>
            {orderedCategories.map((c) => (
              <div
                key={c.value}
                className={styles.categoryTreeRow}
                style={{ paddingLeft: c.depth ? 18 : 0 }}
              >
                {c.depth > 0 && (
                  <span className={styles.categoryTreeBranch}>└</span>
                )}
                <span
                  className={styles.categoryTag}
                  style={{ background: c.bg, color: c.text }}
                >
                  {c.label}
                  {isCustomCategory(c.value) && (
                    <button
                      type="button"
                      className={styles.categoryTagDelete}
                      onClick={() => deleteCategory(c.value)}
                      aria-label={`カテゴリ「${c.label}」を削除`}
                      title="このカテゴリを削除"
                    >
                      ×
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={addCategory} className={styles.categoryAddForm}>
            <div className={styles.categoryAddRow}>
              <input
                className={styles.categoryInput}
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  if (categoryError) setCategoryError("");
                }}
                placeholder="新しいカテゴリ名..."
                aria-label="新しいカテゴリ名"
              />
              <button type="submit" className={styles.categoryAddButton}>
                作成
              </button>
            </div>
            <label className={styles.categoryParentField}>
              <span className={styles.categoryParentLabel}>親カテゴリ</span>
              <select
                className={styles.select}
                value={newCategoryParent}
                onChange={(e) => setNewCategoryParent(e.target.value)}
              >
                <option value="">なし（最上位）</option>
                {topCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </form>
          {categoryError && (
            <span className={styles.categoryError}>{categoryError}</span>
          )}
        </section>
      </div>
    </div>
  );
}

// ===================== メモ出力モーダル =====================
function MemoModal({ text, selectedCount = 0, onDeleteSelected, onClose }) {
  const [copied, setCopied] = useState(false);
  // チェックした項目の削除確認（誤操作防止のためワンクッション置く）
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="メモ出力"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>メモ出力</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </header>
        <section className={styles.modalSection}>
          <p className={styles.memoHint}>
            クリップボードにコピーしました。Claude Codeなどに貼り付けて使えます。
          </p>
          <textarea
            className={styles.memoTextarea}
            value={text}
            readOnly
            rows={Math.min(14, text.split("\n").length + 1)}
            onFocus={(e) => e.target.select()}
          />
          <div className={styles.editActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              閉じる
            </button>
            <button type="button" className={styles.saveButton} onClick={copy}>
              {copied ? "コピーしました ✓" : "コピー"}
            </button>
          </div>
          {selectedCount > 0 &&
            (confirmingDelete ? (
              <div
                className={styles.confirmBar}
                role="alertdialog"
                aria-label="削除の確認"
              >
                <span className={styles.confirmText}>
                  チェックした{selectedCount}件を削除しますか？
                </span>
                <button
                  type="button"
                  className={styles.confirmCancel}
                  onClick={() => setConfirmingDelete(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.confirmDelete}
                  onClick={onDeleteSelected}
                >
                  削除
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.memoDeleteButton}
                onClick={() => setConfirmingDelete(true)}
              >
                🗑 チェックした項目を削除（{selectedCount}件）
              </button>
            ))}
        </section>
      </div>
    </div>
  );
}

// ===================== 並び替え可能なTodo項目 =====================
function SortableTodoItem({
  todo,
  isEditing,
  categories,
  getCategory,
  selectMode,
  selected,
  onToggleSelect,
  toggleTodo,
  deleteTodo,
  startEdit,
  saveEdit,
  cancelEdit,
  editText,
  setEditText,
  editPriority,
  setEditPriority,
  editCategory,
  setEditCategory,
  editDueDate,
  setEditDueDate,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: isEditing || selectMode });

  // 削除の確認状態（誤操作防止のためワンクッション置く）
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  // 編集モード
  if (isEditing) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className={`${styles.item} ${styles.editing} ${
          styles[`p_${editPriority}`]
        }`}
      >
        <form onSubmit={saveEdit} className={styles.editForm}>
          <AutoGrowTextarea
            className={styles.input}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onSubmit={saveEdit}
            aria-label="Todoを編集"
            autoFocus
          />
          <div className={styles.optionRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>優先度</span>
              <select
                className={styles.select}
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>カテゴリ</span>
              <select
                className={styles.select}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.depth ? `　└ ${c.label}` : c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>締め切り</span>
              <input
                className={styles.select}
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </label>
          </div>
          <div className={styles.editActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={cancelEdit}
            >
              キャンセル
            </button>
            <button type="submit" className={styles.saveButton}>
              保存
            </button>
          </div>
        </form>
      </li>
    );
  }

  // 通常表示
  const overdue = !todo.completed && isOverdue(todo.dueDate);
  const cat = getCategory(todo.category);

  const metaBlock = (
    <div className={styles.meta}>
      <span className={styles.badge} style={{ background: cat.bg, color: cat.text }}>
        {cat.label}
      </span>
      <span className={`${styles.badge} ${styles[`pri_${todo.priority}`]}`}>
        優先度: {priorityLabel(todo.priority)}
      </span>
      {todo.dueDate && (
        <span className={`${styles.due} ${overdue ? styles.overdue : ""}`}>
          📅 {formatDate(todo.dueDate)}
          {overdue ? "（期限切れ）" : ""}
        </span>
      )}
    </div>
  );

  // メモ出力の選択モード：行全体で選択をトグルする
  if (selectMode) {
    return (
      <li
        className={`${styles.item} ${styles[`p_${todo.priority}`]} ${
          styles.selectable
        } ${selected ? styles.selected : ""}`}
        onClick={() => onToggleSelect(todo.id)}
      >
        <input
          type="checkbox"
          className={styles.selectCheck}
          checked={selected}
          onChange={() => onToggleSelect(todo.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="メモに含める項目を選択"
        />
        <div className={styles.body}>
          <span
            className={`${styles.text} ${todo.completed ? styles.completed : ""}`}
          >
            {todo.text}
          </span>
          {metaBlock}
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.item} ${styles[`p_${todo.priority}`]} ${
        isDragging ? styles.dragging : ""
      }`}
    >
      {/* ドラッグ用ハンドル */}
      <button
        type="button"
        className={styles.dragHandle}
        aria-label="ドラッグして並び替え"
        title="ドラッグして並び替え"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <button
        className={`${styles.check} ${todo.completed ? styles.checked : ""}`}
        onClick={() => toggleTodo(todo.id)}
        aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
      >
        {todo.completed ? "✓" : ""}
      </button>

      <div className={styles.body}>
        <span
          className={`${styles.text} ${todo.completed ? styles.completed : ""}`}
        >
          {todo.text}
        </span>
        {metaBlock}
      </div>

      {confirmingDelete ? (
        <div className={styles.confirmBar} role="alertdialog" aria-label="削除の確認">
          <span className={styles.confirmText}>削除しますか？</span>
          <button
            type="button"
            className={styles.confirmCancel}
            onClick={() => setConfirmingDelete(false)}
          >
            キャンセル
          </button>
          <button
            type="button"
            className={styles.confirmDelete}
            onClick={() => deleteTodo(todo.id)}
          >
            削除
          </button>
        </div>
      ) : (
        <div className={styles.itemActions}>
          <button
            className={styles.editButton}
            onClick={() => startEdit(todo)}
            aria-label="編集"
            title="編集"
          >
            ✎
          </button>
          <button
            className={styles.deleteButton}
            onClick={() => setConfirmingDelete(true)}
            aria-label="削除"
            title="削除"
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}

// 入力内容に合わせて高さが自動で伸びる textarea。
// 長文のやることでも折り返して全文が見えるようにする。
// Enterで送信、Shift+Enterで改行（onSubmit を渡したときのみ）。
function AutoGrowTextarea({ value, onSubmit, className, ...rest }) {
  const ref = useRef(null);

  // 内容に合わせて高さを再計算する
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  function handleKeyDown(e) {
    if (onSubmit && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      className={className}
      onKeyDown={handleKeyDown}
      {...rest}
    />
  );
}

// 完了率を表す円形プログレスリング
function ProgressRing({ rate }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - rate / 100);
  return (
    <div className={styles.ringWrap}>
      <svg width="72" height="72" className={styles.ring}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="7"
          fill="none"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
          className={styles.ringProgress}
        />
      </svg>
      <span className={styles.ringText}>{rate}%</span>
    </div>
  );
}

// フィルター用のチップ群
function FilterGroup({ label, options, value, onChange }) {
  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.chips}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`${styles.chip} ${
              value === o.value ? styles.chipActive : ""
            }`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
