# Azure AI Showcase Demo

Azure AI Service（Speech Service、Document Intelligence など）と Azure AI Foundry（LLM、Agent）を活用したショーケース アプリケーションです。フロントエンドとバックエンドを同一リポジトリで管理するモノレポ構成に刷新し、将来的な機能拡張とチーム開発を見据えた基盤を整備しています。

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

# フロントエンド開発サーバー
pnpm frontend:dev

# バックエンド（FastAPI）の準備
cd apps/backend
uv sync --group dev
uv run fastapi dev app/main.py
```

`.env` などの機密情報は各アプリ配下で管理してください。

## リポジトリ構成

```
azure-ai-showcase-demo/
├── apps/
│   ├── backend/          # FastAPI バックエンド（uv 管理）
│   │   ├── app/
│   │   │   └── main.py
│   │   ├── pyproject.toml
│   │   └── README.md
│   └── frontend/         # React フロントエンド（pnpm ワークスペース）
│       ├── src/
│       ├── Dockerfile
│       ├── package.json
│       └── README.md
├── infra/                # Bicep テンプレート
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
| `uv run fastapi dev app/main.py` | バックエンドの開発サーバーを起動 |
| `uv run pytest` | バックエンドのテスト実行（将来追加予定） |

## 今後の拡張

- フロントエンドとバックエンド間の API 連携実装
- Azure AI サービスとの実際の統合
- 共通のドメインモデル／型のパッケージ化（`packages/` ディレクトリを追加予定）
- CI/CD パイプラインの強化

## Azure リソース

`infra/` 以下に Bicep テンプレートを配置しています。GitHub Actions からのデプロイを想定したワークフローも `.github/workflows/` に用意しています。

## ライセンス

[MIT License](LICENSE)