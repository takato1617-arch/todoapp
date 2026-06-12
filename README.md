# Todo App (Next.js)

Next.js (App Router) で作ったシンプルでおしゃれなTodoアプリです。
UIは日本語、データはブラウザの localStorage に保存されます。

## 機能

- ✅ タスクの追加
- ✅ 完了チェック（丸ボタンで切り替え）
- ✅ タスクの削除

リロードしても内容が残ります（localStorage 保存）。

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
