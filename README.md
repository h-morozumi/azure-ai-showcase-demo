# Azure AI Showcase Demo

このプロジェクトは、Azure AI Service（Speech Service、AI Documents など）と AI Foundry（LLM、Agent）を使ったデモのショーケースアプリケーションです。

## 概要

Azure AI の各種サービスを統合したフルスタックデモアプリケーションで、以下の機能を提供します：

- 🎤 **Speech Service**: 音声認識・音声合成
- 📄 **AI Documents**: ドキュメント解析・情報抽出
- 🤖 **AI Foundry**: LLM による対話、AI Agent の実装

## アーキテクチャ

### フロントエンド
- **フレームワーク**: React
- **スタイリング**: Tailwind CSS
- **パッケージマネージャー**: pnpm

### バックエンド
- **フレームワーク**: FastAPI
- **パッケージマネージャー**: uv (Astral)

## 前提条件

### システム要件
- Node.js (v18 以上)
- Python (v3.10 以上)
- pnpm
- uv

### Azure リソース
- Azure AI Services (Speech Service)
- Azure AI Document Intelligence
- Azure AI Foundry

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/h-morozumi/azure-ai-showcase-demo.git
cd azure-ai-showcase-demo
```

### 2. フロントエンドのセットアップ

```bash
cd frontend
pnpm install
```

#### 環境変数の設定

`frontend/.env` ファイルを作成し、以下の環境変数を設定します：

```env
VITE_API_URL=http://localhost:8000
```

#### フロントエンドの起動

```bash
pnpm dev
```

### 3. バックエンドのセットアップ

```bash
cd backend
uv sync
```

#### 環境変数の設定

`backend/.env` ファイルを作成し、以下の環境変数を設定します：

```env
# Azure AI Services
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=your_region
AZURE_DOCUMENT_INTELLIGENCE_KEY=your_document_key
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your_document_endpoint

# Azure AI Foundry
AZURE_OPENAI_API_KEY=your_openai_key
AZURE_OPENAI_ENDPOINT=your_openai_endpoint
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
```

#### バックエンドの起動

```bash
uv run uvicorn main:app --reload
```

## プロジェクト構造

```
azure-ai-showcase-demo/
├── frontend/           # React + Tailwind CSS フロントエンド
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── pnpm-lock.yaml
├── backend/            # FastAPI バックエンド
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   ├── pyproject.toml
│   └── uv.lock
└── README.md
```

## 開発ガイド

### フロントエンド開発

```bash
cd frontend
pnpm dev          # 開発サーバー起動
pnpm build        # プロダクションビルド
pnpm lint         # リンター実行
pnpm test         # テスト実行
```

### バックエンド開発

```bash
cd backend
uv run uvicorn main:app --reload  # 開発サーバー起動
uv run pytest                      # テスト実行
uv run ruff check .                # リンター実行
uv run ruff format .               # フォーマット実行
```

## 機能

### 実装済み機能
- [ ] 音声認識機能（Speech to Text）
- [ ] 音声合成機能（Text to Speech）
- [ ] ドキュメント解析機能
- [ ] LLM チャット機能
- [ ] AI Agent 機能

### 今後の実装予定
- [ ] ファイルアップロード機能
- [ ] 会話履歴の保存
- [ ] マルチモーダル対応

## API ドキュメント

バックエンドを起動後、以下の URL で API ドキュメントを確認できます：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## トラブルシューティング

### pnpm が見つからない場合

```bash
npm install -g pnpm
```

### uv が見つからない場合

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

または

```bash
pip install uv
```

## コントリビューション

プルリクエストを歓迎します。大きな変更を加える場合は、まず issue を開いて変更内容について議論してください。

## ライセンス

[MIT License](LICENSE)

## 作者

MOROZUMI, Hiroyuki

## 参考リンク

- [Azure AI Services](https://azure.microsoft.com/ja-jp/products/ai-services/)
- [Azure AI Foundry](https://azure.microsoft.com/ja-jp/products/ai-studio/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [pnpm](https://pnpm.io/)
- [uv](https://docs.astral.sh/uv/)