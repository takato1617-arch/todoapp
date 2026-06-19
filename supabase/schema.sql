-- =====================================================================
-- Todoアプリ用テーブル定義
-- Supabaseのダッシュボード → SQL Editor にこの内容を貼り付けて実行してください。
-- =====================================================================

-- ユーザー（名前＋パスワード）。複数人で使い、データはユーザーごとに分離する。
-- パスワードはハッシュ化して保存する（lib/auth.js）。
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- カテゴリ（ユーザーごとに作られる。既定カテゴリも登録時に各ユーザー分を作成）
create table if not exists categories (
  value      text primary key,
  label      text not null,
  bg         text not null,
  text       text not null,
  is_default boolean not null default false,
  -- 親カテゴリの value（NULL = 最上位）。親が消えたら子は最上位に戻す。
  parent     text references categories(value) on delete set null,
  -- 所有者（NULL = 旧・共有データ）。ユーザーが消えたら一緒に消える。
  owner      uuid references users(id) on delete cascade,
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
  -- 所有者（NULL = 旧・共有データ）。ユーザーが消えたら一緒に消える。
  owner      uuid references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 所有者で素早く絞り込めるようにインデックスを張る
create index if not exists todos_owner_idx      on todos(owner);
create index if not exists categories_owner_idx on categories(owner);

-- RLS（行レベルセキュリティ）を有効化。
-- ポリシーを作らないので、公開用の anon キーからは一切アクセスできません。
-- アプリはサーバー側の service_role キー経由でのみ読み書きします（RLSを通過）。
alter table users      enable row level security;
alter table categories enable row level security;
alter table todos      enable row level security;
