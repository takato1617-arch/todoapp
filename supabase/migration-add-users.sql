-- =====================================================================
-- 複数人で使う（データはユーザーごとに分離）ためのマイグレーション
-- Supabaseのダッシュボード → SQL Editor にこの内容を貼り付けて実行してください。
-- =====================================================================

-- ユーザー（名前＋パスワード）。パスワードはハッシュ化して保存する。
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- anonキーからは触れないよう RLS 有効・ポリシー無し（アプリはservice_role経由）
alter table users enable row level security;

-- todos / categories に所有者（owner）列を追加。
-- ユーザーが消えたら、そのデータも一緒に消える（on delete cascade）。
alter table todos
  add column if not exists owner uuid references users(id) on delete cascade;
alter table categories
  add column if not exists owner uuid references users(id) on delete cascade;

-- 所有者で素早く絞り込めるようにインデックスを張る
create index if not exists todos_owner_idx      on todos(owner);
create index if not exists categories_owner_idx on categories(owner);

-- ---------------------------------------------------------------------
-- 既存データ（owner が NULL の行）の扱いについて
-- ---------------------------------------------------------------------
-- これまで全員で共有していた todos / categories は owner = NULL のまま残ります。
-- それらは誰のアカウントからも表示されません（各APIが owner で絞り込むため）。
-- 既存データを自分のアカウントに引き継ぎたい場合は、先に1人登録してから
-- 下記の <あなたのuser.id> を置き換えて実行してください（任意）。
--
--   update todos      set owner = '<あなたのuser.id>' where owner is null;
--   update categories set owner = '<あなたのuser.id>' where owner is null and is_default = false;
--
-- ※ 旧・共有の既定カテゴリ（is_default=true の work/private/other）は引き継がず、
--   登録時に各ユーザー専用の既定カテゴリが新しく作られます。
