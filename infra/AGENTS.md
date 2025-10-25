# Infrastructure as Code (IaC) 設計仕様

## 概要

このディレクトリは、Azure AI Showcase Demo プロジェクトの Infrastructure as Code (IaC) を管理します。
Bicep を使用して Azure リソースをコードで定義し、デプロイを自動化します。

## ディレクトリ構造

```
infra/
├── AGENTS.md              # このファイル：IaC の設計仕様とガイドライン
├── main.bicep             # Bicep のエントリーポイント（起点）
├── main.bicepparam        # パラメータファイル
├── core/                  # プロジェクト非依存の汎用リソース
│   ├── storage/          # ストレージ関連リソース
│   ├── network/          # ネットワーク関連リソース
│   ├── security/         # セキュリティ関連リソース
│   └── monitoring/       # 監視関連リソース
└── app/                   # プロジェクト依存のリソース
    └── (各種アプリケーション固有のリソース)
```

## 設計原則

### 1. モジュール化
- リソースの種類やジャンルごとにモジュールを分割
- 再利用可能なコンポーネントとして設計
- 責任範囲を明確に定義

### 2. 階層構造
#### /core - コアリソース層
- **目的**: プロジェクトに依存しない汎用的なリソースを定義
- **スコープ**: ストレージ、ネットワーク、セキュリティ、監視などの基盤リソース
- **参照ルール**:
  - ✅ **許可**: /core 内でのモジュール間参照は許可
  - ❌ **禁止**: main.bicep から /core への直接参照は禁止（/app 経由での利用は許可）
  - ❌ **禁止**: /core から /app への参照は禁止
- **特徴**:
  - プロジェクト固有の要件に依存しない
  - 他のプロジェクトでも再利用可能
  - ジャンルごとにサブフォルダで整理

#### /app - アプリケーション層
- **目的**: プロジェクト固有のリソース構成を定義
- **スコープ**: Azure AI Services、AI Foundry、アプリケーション固有の設定
- **参照ルール**:
  - ✅ **許可**: /core のリソースを利用可能
  - ✅ **許可**: main.bicep から参照可能
  - ❌ **禁止**: /core から /app への参照は禁止
- **特徴**:
  - /core のリソースを組み合わせて構成
  - プロジェクトの仕様に基づいた構成を作成
  - アプリケーションロジックに密接に関連

#### main.bicep - オーケストレーション層
- **目的**: すべてのリソースをオーケストレーション
- **スコープ**: /core と /app のリソースを統合
- **参照ルール**:
  - ✅ **許可**: /app のモジュールを参照
  - ✅ **許可**: /core のリソースを /app を通じて間接的に利用
- **特徴**:
  - デプロイの起点
  - パラメータを受け取り、各モジュールに配布
  - リソース間の依存関係を管理

## 命名規則

### リソース命名
- **形式**: `{prefix}-{resource-type}-{environment}-{location}-{suffix}`
- **例**: `azai-stg-dev-japaneast-001`

### モジュールファイル命名
- **形式**: `{resource-type}.bicep`
- **例**: 
  - `core/storage/storage-account.bicep`
  - `app/ai-services.bicep`

### パラメータ命名
- **形式**: camelCase を使用
- **例**: `storageAccountName`, `appServicePlanSku`

## パラメータ管理

### main.bicepparam
- 環境固有の設定値を定義
- 機密情報は Azure Key Vault 参照を使用
- 環境ごとに異なるパラメータファイルを作成可能（例: main.dev.bicepparam, main.prod.bicepparam）

### パラメータの種類
1. **必須パラメータ**: デプロイ時に必ず指定が必要
2. **オプションパラメータ**: デフォルト値を持つ
3. **環境変数**: Azure DevOps や GitHub Actions から注入

## デプロイフロー

```
1. main.bicepparam から設定値を読み込み
2. main.bicep がパラメータを受け取る
3. /app のモジュールをデプロイ
4. /app が /core のリソースを利用して構成を作成
5. リソースグループにデプロイ
```

## ベストプラクティス

### セキュリティ
- 機密情報はパラメータファイルにハードコードしない
- Azure Key Vault を使用してシークレットを管理
- Managed Identity を活用

### モジュール設計
- 単一責任の原則を遵守
- 入力パラメータと出力を明確に定義
- 依存関係を最小限に抑える

### バージョン管理
- Bicep ファイルは Git で管理
- パラメータファイルもバージョン管理（機密情報は除く）
- `.gitignore` で機密情報を含むファイルを除外

### ドキュメント
- 各モジュールの先頭にコメントで目的と使用方法を記載
- パラメータの説明を `@description` デコレータで追加
- 複雑なロジックにはインラインコメントを追加

## 使用例

### デプロイコマンド
```bash
# リソースグループへのデプロイ
az deployment group create \
  --resource-group rg-azure-ai-showcase-dev \
  --template-file main.bicep \
  --parameters main.bicepparam

# サブスクリプションレベルのデプロイ
az deployment sub create \
  --location japaneast \
  --template-file main.bicep \
  --parameters main.bicepparam
```

### 検証（What-If）
```bash
az deployment group what-if \
  --resource-group rg-azure-ai-showcase-dev \
  --template-file main.bicep \
  --parameters main.bicepparam
```

## 開発ガイドライン

### 新しいリソースの追加
1. リソースがプロジェクト非依存か依存かを判断
2. /core または /app に適切なサブフォルダを作成（必要に応じて）
3. Bicep モジュールを作成
4. パラメータを定義
5. main.bicep または親モジュールから参照
6. main.bicepparam にパラメータを追加
7. ドキュメントを更新

### コードレビューポイント
- [ ] 命名規則に従っているか
- [ ] 参照ルールを守っているか（/core から /app への参照禁止など）
- [ ] パラメータが適切に定義されているか
- [ ] 機密情報がハードコードされていないか
- [ ] ドキュメントが更新されているか
- [ ] リソースタグが適切に設定されているか

## Azure AI Showcase Demo 固有の要件

### 必要な Azure リソース
- **Azure AI Services**
  - Speech Service
  - Document Intelligence
- **Azure OpenAI Service**
  - GPT-4 / GPT-3.5 デプロイメント
- **Azure AI Foundry**
  - LLM
  - Agent
- **ストレージ**
  - Blob Storage（ドキュメント保存用）
- **ネットワーク**
  - Virtual Network（必要に応じて）
- **監視**
  - Application Insights
  - Log Analytics

### 環境
- **開発環境（dev）**: 開発・テスト用
- **本番環境（prod）**: 本番運用用

## 参考リンク

- [Azure Bicep ドキュメント](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/bicep/)
- [Bicep ベストプラクティス](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/bicep/best-practices)
- [Azure リソース命名規則](https://learn.microsoft.com/ja-jp/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)
- [Azure AI Services Bicep リファレンス](https://learn.microsoft.com/ja-jp/azure/templates/microsoft.cognitiveservices/accounts)
