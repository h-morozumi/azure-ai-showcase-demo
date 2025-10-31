# Frontend (React + Vite)

Azure AI Showcase Demo のフロントエンド実装です。将来的にバックエンドや共有パッケージを追加できるよう、リポジトリ直下の pnpm ワークスペースに参加しています。

## セットアップ

```pwsh
# ルートディレクトリで依存関係を解決
pnpm install

# 開発サーバーを起動
pnpm frontend:dev
```

## ビルド

```pwsh
pnpm frontend:build
```

## Lint

```pwsh
pnpm frontend:lint
```

## ディレクトリ構成

- `src/components` – 再利用可能な UI コンポーネント
- `src/pages` – 画面コンポーネント
- `src/utils` – ヘルパー関数やモックデータ
- `src/types` – TypeScript の型定義

## 注意事項

- コメントは日本語を基本とし、必要に応じて英語を併記する
- `any` 型の使用は禁止。必ず型を定義する
- Tailwind CSS のユーティリティクラスを優先して使用する
