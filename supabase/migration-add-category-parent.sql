-- =====================================================================
-- カテゴリに親子階層（サブカテゴリ）を追加するマイグレーション
-- Supabaseのダッシュボード → SQL Editor にこの内容を貼り付けて実行してください。
-- =====================================================================

-- 親カテゴリの value を指す parent 列を追加（NULL = 最上位カテゴリ）。
-- 親が削除されたら子は最上位（parent = NULL）に戻す。
alter table categories
  add column if not exists parent text
  references categories(value) on delete set null;
