-- =====================================================================
-- Todoアプリ用テーブル定義
-- Supabaseのダッシュボード → SQL Editor にこの内容を貼り付けて実行してください。
-- =====================================================================

-- カテゴリ
create table if not exists categories (
  value      text primary key,
  label      text not null,
  bg         text not null,
  text       text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Todo本体
create table if not exists todos (
  id         uuid primary key default gen_random_uuid(),
  text       text not null,
  completed  boolean not null default false,
  priority   text not null default 'medium',
  category   text,
  due_date   date,
  position   double precision,
  created_at timestamptz not null default now()
);

-- RLS（行レベルセキュリティ）を有効化。
-- ポリシーを作らないので、公開用の anon キーからは一切アクセスできません。
-- アプリはサーバー側の service_role キー経由でのみ読み書きします（RLSを通過）。
alter table categories enable row level security;
alter table todos      enable row level security;

-- 既定カテゴリを投入（既にあれば何もしない）
insert into categories (value, label, bg, text, is_default) values
  ('work',    '仕事',         '#dbeafe', '#1d4ed8', true),
  ('private', 'プライベート', '#fce7f3', '#be185d', true),
  ('other',   'その他',       '#e5e7eb', '#4b5563', true)
on conflict (value) do nothing;
