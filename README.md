# Todo App (Next.js)

Next.js (App Router) で作ったシンプルでおしゃれなTodoアプリです。
UIは日本語、データはブラウザの localStorage に保存されます。

## 機能

- ✅ タスクの追加
- ✅ 完了チェック（丸ボタンで切り替え）
- ✅ タスクの削除

リロードしても内容が残ります（localStorage 保存）。

## 複数人で使う（データはユーザーごとに分離）

- 各自が「名前＋パスワード」で**自分のアカウント**を作成します。Todoとカテゴリはユーザーごとに完全に分離され、他人のデータは見えません。
- **新規登録**には招待合言葉（環境変数 `APP_PASSPHRASE`）が必要です。これを知っている人だけがアカウントを作れます（空にすると誰でも登録可）。ログインは名前＋パスワードのみ。
- DBに `users` テーブルを追加し、`todos` / `categories` に `owner` 列を持たせています。
  - 新規環境: `supabase/schema.sql` を実行。
  - 既存環境: `supabase/migration-add-users.sql` を実行（既存の共有データの引き継ぎ方法も同ファイル内に記載）。

## 必要環境

[Node.js](https://nodejs.org/) 18.18 以上（LTS推奨）。

## ローカルでの起動

```bash
cd todo-app
npm install      # 依存パッケージをインストール
npm run dev      # 開発サーバー起動
```

ブラウザで http://localhost:3000 を開きます。

## 本番ビルド

```bash
npm run build
npm run start
```

## Vercel へのデプロイ

このプロジェクトは標準的な Next.js 構成なので、Vercel が自動検出します（追加設定・`vercel.json` 不要）。

### 方法A: GitHub 経由（推奨）

1. このプロジェクトを GitHub リポジトリにプッシュ
2. [vercel.com](https://vercel.com/) にログイン →「Add New… → Project」
3. リポジトリを選択（モノレポの場合は **Root Directory** に `todo-app` を指定）
4. 設定はそのまま「Deploy」をクリック

以後、`main` ブランチへの push で自動デプロイされます。

### 方法B: Vercel CLI

```bash
npm i -g vercel
cd todo-app
vercel          # 初回はプロジェクト設定 → プレビューデプロイ
vercel --prod   # 本番デプロイ
```

### ビルド設定（Vercel が自動で使う値）

| 項目 | 値 |
| --- | --- |
| Framework Preset | Next.js |
| Build Command | `next build` |
| Output | `.next`（自動） |
| Install Command | `npm install` |

## 構成

```
todo-app/
├─ app/
│  ├─ layout.js          # ルートレイアウト（lang="ja"）
│  ├─ page.js            # Todo本体（追加 / 完了 / 削除）
│  ├─ page.module.css    # ページのスタイル
│  └─ globals.css        # 全体スタイル・日本語フォント
├─ next.config.mjs
├─ jsconfig.json
└─ package.json
```
