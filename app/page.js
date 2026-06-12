"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const STORAGE_KEY = "todos";

// ----- 選択肢の定義 -----
const PRIORITIES = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

const CATEGORIES = [
  { value: "work", label: "仕事" },
  { value: "private", label: "プライベート" },
  { value: "other", label: "その他" },
];

const priorityLabel = (v) => PRIORITIES.find((p) => p.value === v)?.label ?? "";
const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label ?? "";

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

// 旧フォーマット（text/completedのみ）も読み込めるよう補完する
function normalize(todo) {
  return {
    id: todo.id ?? crypto.randomUUID(),
    text: todo.text ?? "",
    completed: !!todo.completed,
    priority: todo.priority ?? "medium",
    category: todo.category ?? "other",
    dueDate: todo.dueDate ?? "",
    createdAt: todo.createdAt ?? Date.now(),
  };
}

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("work");
  const [dueDate, setDueDate] = useState("");
  const [loaded, setLoaded] = useState(false);

  // フィルター
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // 初回マウント時に localStorage から読み込む
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTodos(JSON.parse(saved).map(normalize));
    } catch {
      // 読み込み失敗時は空のまま
    }
    setLoaded(true);
  }, []);

  // todos が変わるたびに保存する（初回読み込み完了後のみ）
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos, loaded]);

  function addTodo(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setTodos((prev) => [
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
        priority,
        category,
        dueDate,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setInput("");
    setDueDate("");
  }

  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
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
          <ProgressRing rate={rate} />
        </header>

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
                {CATEGORIES.map((c) => (
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

        {/* フィルター */}
        <div className={styles.filters}>
          <FilterGroup
            label="カテゴリ"
            options={[{ value: "all", label: "すべて" }, ...CATEGORIES]}
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
                      className={`${styles.badge} ${
                        styles[`cat_${todo.category}`]
                      }`}
                    >
                      {categoryLabel(todo.category)}
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
