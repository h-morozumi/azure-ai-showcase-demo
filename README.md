# Azure AI Showcase Demo

Azureが提供しているAIサービスを活用したデモアプリケーションのショーケースです。Azure AI Foundry や Azure OpenAI Service、Azure AI Serviceなどを使ったアプリケーション開発の参考としてご利用ください。

フロントエンドはReact（TypeScript）、バックエンドはFastAPI（Python）で構築されています。モノレポ形式で管理されており、pnpmとuvを使用して依存関係を管理しています。

## 主なコンポーネント

- 🎨 **Frontend**: React + Vite + Tailwind CSS
- ⚙️ **Backend**: FastAPI（Python / uv）
- ☁️ **Infrastructure**: Bicep による Azure リソース定義

## 前提条件

- Node.js 20 以上
- pnpm 9 以上
- Python 3.11 以上
- uv（https://docs.astral.sh/uv/）

## セットアップ

```bash
git clone https://github.com/h-morozumi/azure-ai-showcase-demo.git
cd azure-ai-showcase-demo

# ワークスペース全体の依存関係を解決
pnpm install

# フロントエンドの依存関係をインストール
cd apps/frontend
pnpm install

# バックエンド（FastAPI）の依存関係をインストール
cd ../backend
uv sync --group dev
```

各アプリケーションの環境変数は、`.env.example` ファイルを参考に設定してください。
`.env` ファイルは、各アプリケーションディレクトリに配置します。

## リポジトリ構成

```
azure-ai-showcase-demo/
├── apps/
│   ├── backend/          # FastAPI バックエンド（uv 管理）
│   └── frontend/         # React フロントエンド（pnpm ワークスペース）
├── infra/                # Bicep テンプレート
├── docs/                 # ドキュメント
├── package.json          # ワークスペース共通スクリプト
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## コマンド一覧

| コマンド | 説明 |
| --- | --- |
| `pnpm frontend:dev` | フロントエンド開発サーバーを起動 |
| `pnpm frontend:build` | フロントエンドをビルド |
| `pnpm frontend:lint` | フロントエンドの lint を実行 |
| `pnpm backend:dev` | バックエンドの開発サーバーを起動 |
| `pnpm backend:test` | バックエンドのテスト実行（将来追加予定） |

## Azure リソース

`infra/` 以下に Bicep テンプレートを配置しています。GitHub Actions からのデプロイを想定したワークフローも `.github/workflows/` に用意しています。

## ドキュメント

- [リアルタイムアバター実装ガイド](docs/realtime-avatar-implementation.md) - Azure Voice Live API のアバター機能の実装方法とSDK制限の回避策

## ライセンス

[MIT License](LICENSE)