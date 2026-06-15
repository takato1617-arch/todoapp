-- =====================================================================
-- 並び替え用の position 列を todos に追加するマイグレーション
-- Supabase → SQL Editor で1回だけ実行してください。
-- =====================================================================

alter table todos add column if not exists position double precision;

-- 既存のTodoに初期の並び順を付与する（今の表示順＝作成日時の新しい順）。
-- 新しいものほど上＝小さいpositionになるように、負のepoch秒を入れる。
update todos
set position = - extract(epoch from created_at)
where position is null;
