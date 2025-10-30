# App Modules

このディレクトリには、Azure AI Showcase Demo プロジェクトに固有の Azure リソースの Bicep モジュールを配置します。

## 目的

- プロジェクトの仕様に基づいた Azure リソース構成を定義
- /core のリソースを組み合わせてアプリケーション固有の構成を作成
- Azure AI Services、AI Foundry などのプロジェクト固有リソースを管理

## ディレクトリ構成（予定）

```
app/
├── README.md              # このファイル
├── ai-services.bicep      # Azure AI Services（Speech, Document Intelligence）
├── openai.bicep           # Azure OpenAI Service
├── ai-foundry.bicep       # Azure AI Foundry
├── storage.bicep          # アプリケーション用ストレージ構成
├── monitoring.bicep       # アプリケーション監視構成
└── container-app-frontend.bicep # フロントエンド用 Container Apps モジュール
```

## 設計ガイドライン

### 参照ルール
- ✅ **許可**: /core のモジュールを利用
- ✅ **許可**: main.bicep から参照
- ❌ **禁止**: /core から /app への参照
- ✅ **許可**: /app 内でのモジュール間参照

### モジュール作成時の注意点
1. /core のリソースを活用して構成を作成すること
2. プロジェクトの要件に沿った設定を行うこと
3. Azure AI Services の統合を適切に設計すること
4. セキュリティとコンプライアンスを考慮すること
5. スケーラビリティを考慮した設計にすること

### 命名規則
- ファイル名: `{service-name}.bicep` （例: `ai-services.bicep`）
- パラメータ: camelCase（例: `speechServiceName`）
- リソース名: kebab-case（例: `speech-service-dev`）

## Azure AI Showcase Demo 固有のリソース

### 必要なリソース
1. **Azure AI Services**
   - Speech Service（音声認識・音声合成）
   - Document Intelligence（ドキュメント解析）

2. **Azure OpenAI Service**
   - GPT-4 モデルデプロイメント
   - GPT-3.5 モデルデプロイメント

3. **Azure AI Foundry**
   - LLM 統合
   - AI Agent 機能

4. **ストレージ**
   - Blob Storage（ドキュメント保存用）
   - /core のストレージモジュールを利用

5. **監視**
   - Application Insights
   - Log Analytics
   - /core の監視モジュールを利用

## 使用方法

App モジュールは main.bicep から参照されます。

### 例: main.bicep からの参照

```bicep
// main.bicep 内での使用例

module aiServices './app/ai-services.bicep' = {
  name: 'deploy-ai-services'
  params: {
    location: location
    environment: environment
    namingPrefix: namingPrefix
    resourceSuffix: resourceSuffix
    tags: tags
  }
}

module openAi './app/openai.bicep' = {
  name: 'deploy-openai'
  params: {
    location: location
    environment: environment
    deploymentModel: openAiDeploymentModel
    tags: tags
  }
}
```

## 今後の実装予定

プロジェクトの進行に応じて、以下のモジュールを実装する予定です：

- [ ] Azure AI Services モジュール（Speech Service, Document Intelligence）
- [ ] Azure OpenAI Service モジュール
- [ ] Azure AI Foundry モジュール
- [ ] アプリケーション用ストレージ構成
- [ ] 監視・ログ収集構成
- [ ] ネットワーク構成（必要に応じて）
- [ ] セキュリティ構成（Key Vault, Managed Identity）
- [x] フロントエンド Container Apps モジュール（Container Registry イメージをデプロイ）

## 環境別設定

### 開発環境（dev）
- コスト最適化を優先
- 最小限のリソース構成
- 開発・テスト用の設定

### 本番環境（prod）
- 高可用性を優先
- スケーラビリティを考慮
- 本番運用用の設定
- セキュリティ強化
