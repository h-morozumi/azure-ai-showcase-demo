# Infrastructure as Code (IaC)

このディレクトリは、Azure AI Showcase Demo プロジェクトの Infrastructure as Code (IaC) を管理します。
Azure Bicep を使用して Azure リソースをコードとして定義し、自動デプロイを実現します。

## クイックスタート

### 前提条件
- Azure CLI がインストールされていること
- Azure サブスクリプションへのアクセス権限があること
- Bicep CLI がインストールされていること（Azure CLI に含まれています）

### デプロイ手順

1. **Azure にログイン**
```bash
az login
```

2. **サブスクリプションを選択**
```bash
az account set --subscription "your-subscription-id"
```

3. **リソースグループを作成**
```bash
az group create \
  --name rg-azure-ai-showcase-dev \
  --location japaneast
```

4. **デプロイを実行**
```bash
cd infra
az deployment group create \
  --resource-group rg-azure-ai-showcase-dev \
  --template-file main.bicep \
  --parameters main.bicepparam
```

5. **デプロイ内容を確認（What-If）**
```bash
az deployment group what-if \
  --resource-group rg-azure-ai-showcase-dev \
  --template-file main.bicep \
  --parameters main.bicepparam
```

## ディレクトリ構成

```
infra/
├── README.md              # このファイル
├── AGENTS.md              # IaC の設計仕様とガイドライン（詳細）
├── main.bicep             # Bicep のエントリーポイント
├── main.bicepparam        # パラメータファイル
├── core/                  # プロジェクト非依存の汎用リソース
│   ├── README.md         # Core モジュールのガイド
│   ├── storage/          # ストレージ関連（予定）
│   ├── network/          # ネットワーク関連（予定）
│   ├── security/         # セキュリティ関連（予定）
│   └── monitoring/       # 監視関連（予定）
└── app/                   # プロジェクト依存のリソース
    ├── README.md         # App モジュールのガイド
    └── (今後実装予定)
```

## ファイルの役割

### main.bicep
- すべてのリソースのオーケストレーション
- デプロイのエントリーポイント
- /app モジュールを統合

### main.bicepparam
- 環境固有の設定値を定義
- main.bicep に渡すパラメータを管理
- 環境ごとに異なるファイルを作成可能

### AGENTS.md
- IaC の設計仕様と詳細ガイドライン
- 参照ルールと設計原則
- コーディング規約とベストプラクティス
- **重要**: 新しいモジュールを作成する前に必ず確認してください

### /core
- プロジェクト非依存の汎用リソースモジュール
- ストレージ、ネットワーク、セキュリティなどの基盤リソース
- 他のプロジェクトでも再利用可能な設計
- **参照ルール**: /core 内でのみ相互参照が許可されています

### /app
- Azure AI Showcase Demo プロジェクト固有のリソース
- Azure AI Services、OpenAI、AI Foundry などの統合
- /core のリソースを組み合わせて構成
- **参照ルール**: /core のモジュールを利用可能、main.bicep から参照されます

## 設計原則

### 階層構造と参照ルール

```
main.bicep (オーケストレーション)
    ↓ 参照可能
/app (アプリケーション層)
    ↓ 参照可能
/core (基盤リソース層)
```

**重要な制約**:
- ❌ main.bicep から /core への直接参照は禁止
- ❌ /core から /app への参照は禁止
- ✅ /app から /core への参照は許可
- ✅ main.bicep から /app への参照は許可

詳細は [AGENTS.md](./AGENTS.md) を参照してください。

## Azure AI Showcase Demo のリソース

### デプロイ予定のリソース

1. **Azure AI Services**
   - Speech Service（音声認識・音声合成）
   - Document Intelligence（ドキュメント解析）

2. **Azure OpenAI Service**
   - GPT-4 モデル
   - GPT-3.5 モデル

3. **Azure AI Foundry**
   - LLM 統合
   - AI Agent 機能

4. **ストレージ**
   - Blob Storage（ドキュメント保存）

5. **監視**
   - Application Insights
   - Log Analytics

## 環境管理

### 開発環境（dev）
```bash
az deployment group create \
  --resource-group rg-azure-ai-showcase-dev \
  --template-file main.bicep \
  --parameters main.bicepparam
```

### 本番環境（prod）
本番環境用のパラメータファイルを作成：
```bash
cp main.bicepparam main.prod.bicepparam
# main.prod.bicepparam を編集
```

デプロイ：
```bash
az deployment group create \
  --resource-group rg-azure-ai-showcase-prod \
  --template-file main.bicep \
  --parameters main.prod.bicepparam
```

## 便利なコマンド

### Bicep のバリデーション
```bash
az bicep build --file main.bicep
```

### デプロイ履歴の確認
```bash
az deployment group list \
  --resource-group rg-azure-ai-showcase-dev \
  --output table
```

### リソースの確認
```bash
az resource list \
  --resource-group rg-azure-ai-showcase-dev \
  --output table
```

### デプロイの削除
```bash
az group delete \
  --name rg-azure-ai-showcase-dev \
  --yes --no-wait
```

## トラブルシューティング

### Bicep CLI のインストール
```bash
az bicep install
az bicep upgrade
```

### バージョン確認
```bash
az bicep version
az --version
```

### デプロイエラーの確認
```bash
az deployment group show \
  --resource-group rg-azure-ai-showcase-dev \
  --name <deployment-name>
```

## セキュリティのベストプラクティス

1. **機密情報の管理**
   - API キーやパスワードをパラメータファイルにハードコードしない
   - Azure Key Vault を使用してシークレットを管理
   - `.gitignore` で機密情報を含むファイルを除外

2. **アクセス制御**
   - Managed Identity を活用
   - 最小権限の原則を適用
   - RBAC を適切に設定

3. **ネットワークセキュリティ**
   - 必要に応じて Virtual Network を使用
   - Private Endpoint を検討
   - Network Security Group を適切に設定

## 次のステップ

1. [AGENTS.md](./AGENTS.md) で設計仕様を確認
2. [core/README.md](./core/README.md) で Core モジュールの詳細を確認
3. [app/README.md](./app/README.md) で App モジュールの詳細を確認
4. 必要なリソースモジュールを実装
5. main.bicep でモジュールを統合
6. デプロイとテストを実施

## 参考リンク

- [Azure Bicep ドキュメント](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/bicep/)
- [Bicep ベストプラクティス](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/bicep/best-practices)
- [Azure AI Services Bicep リファレンス](https://learn.microsoft.com/ja-jp/azure/templates/microsoft.cognitiveservices/accounts)
- [Azure リソース命名規則](https://learn.microsoft.com/ja-jp/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
