"use client";

import { useEffect, useMemo, useState } from "react";
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

  // 起動時にセッションを確認
  useEffect(() => {
    api("/api/session")
      .then((d) => setAuthState(d.authenticated ? "in" : "out"))
      .catch(() => setAuthState("out"));
  }, []);

  if (authState === "checking") {
    return <main className={styles.loading}>読み込み中...</main>;
  }
  if (authState === "out") {
    return <LoginGate onSuccess={() => setAuthState("in")} />;
  }
  return <TodoApp onLogout={() => setAuthState("out")} />;
}

// ===================== ログイン画面 =====================
function LoginGate({ onSuccess }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!passphrase) return;
    setSubmitting(true);
    setError("");
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ passphrase }),
      });
      onSuccess();
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
        <p className={styles.gateSubtitle}>合言葉を入力してください</p>
        <input
          className={styles.gateInput}
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="合言葉"
          aria-label="合言葉"
          autoFocus
        />
        <button className={styles.gateButton} type="submit" disabled={submitting}>
          {submitting ? "確認中..." : "入る"}
        </button>
        {error && <p className={styles.gateError}>{error}</p>}
      </form>
    </main>
  );
}

// ===================== Todo本体 =====================
function TodoApp({ onLogout }) {
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  // 新規カテゴリ作成
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");

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
        body: JSON.stringify({ label, bg: palette.bg, text: palette.text }),
      });
      setCategories((prev) => [...prev, created]);
      setCategory(created.value);
      setNewCategory("");
      setCategoryError("");
    } catch (err) {
      setCategoryError(err.message);
    }
  }

  async function deleteCategory(value) {
    await api(`/api/categories/${value}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.value !== value));
    if (category === value) setCategory(categories[0]?.value ?? "");
    if (filterCategory === value) setFilterCategory("all");
  }

  // フィルター適用後のリスト
  const visibleTodos = useMemo(
    () =>
      todos.filter(
        (t) =>
          (filterCategory === "all" || t.category === filterCategory) &&
          (filterPriority === "all" || t.priority === filterPriority)
      ),
    [todos, filterCategory, filterPriority]
  );

  // 完了率（フィルター後の表示対象を基準にする）
  const total = visibleTodos.length;
  const done = visibleTodos.filter((t) => t.completed).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  const isCustomCategory = (value) => !categoryMap.get(value)?.isDefault;

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
              {done} / {total} 完了
            </p>
          </div>
          <div className={styles.headerActions}>
            <ProgressRing rate={rate} />
            <button className={styles.logoutButton} onClick={logout}>
              ログアウト
            </button>
          </div>
        </header>

        {loadError && <p className={styles.gateError}>{loadError}</p>}

        {/* 追加フォーム */}
        <form onSubmit={addTodo} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
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

        {/* カテゴリ管理 */}
        <section className={styles.categoryManager}>
          <span className={styles.categoryManagerLabel}>カテゴリ管理</span>
          <div className={styles.categoryTags}>
            {categories.map((c) => (
              <span
                key={c.value}
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
            ))}
          </div>
          <form onSubmit={addCategory} className={styles.categoryAddRow}>
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
          </form>
          {categoryError && (
            <span className={styles.categoryError}>{categoryError}</span>
          )}
        </section>

        {/* フィルター */}
        <div className={styles.filters}>
          <FilterGroup
            label="カテゴリ"
            options={[
              { value: "all", label: "すべて" },
              ...categories.map((c) => ({ value: c.value, label: c.label })),
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

        {/* リスト */}
        <ul className={styles.list}>
          {visibleTodos.length === 0 && (
            <li className={styles.empty}>
              {todos.length === 0
                ? "まだ項目がありません"
                : "条件に一致する項目がありません"}
            </li>
          )}
          {visibleTodos.map((todo) => {
            const overdue = !todo.completed && isOverdue(todo.dueDate);
            const cat = getCategory(todo.category);

            // 編集モード
            if (editingId === todo.id) {
              return (
                <li
                  key={todo.id}
                  className={`${styles.item} ${styles.editing} ${
                    styles[`p_${editPriority}`]
                  }`}
                >
                  <form onSubmit={saveEdit} className={styles.editForm}>
                    <input
                      className={styles.input}
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
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
                              {c.label}
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
            return (
              <li
                key={todo.id}
                className={`${styles.item} ${styles[`p_${todo.priority}`]}`}
              >
                <button
                  className={`${styles.check} ${
                    todo.completed ? styles.checked : ""
                  }`}
                  onClick={() => toggleTodo(todo.id)}
                  aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
                >
                  {todo.completed ? "✓" : ""}
                </button>

                <div className={styles.body}>
                  <span
                    className={`${styles.text} ${
                      todo.completed ? styles.completed : ""
                    }`}
                  >
                    {todo.text}
                  </span>
                  <div className={styles.meta}>
                    <span
                      className={styles.badge}
                      style={{ background: cat.bg, color: cat.text }}
                    >
                      {cat.label}
                    </span>
                    <span
                      className={`${styles.badge} ${
                        styles[`pri_${todo.priority}`]
                      }`}
                    >
                      優先度: {priorityLabel(todo.priority)}
                    </span>
                    {todo.dueDate && (
                      <span
                        className={`${styles.due} ${
                          overdue ? styles.overdue : ""
                        }`}
                      >
                        📅 {formatDate(todo.dueDate)}
                        {overdue ? "（期限切れ）" : ""}
                      </span>
                    )}
                  </div>
                </div>

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
                  onClick={() => deleteTodo(todo.id)}
                  aria-label="削除"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
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
