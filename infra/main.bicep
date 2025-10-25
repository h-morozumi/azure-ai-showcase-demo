// ============================================================================
// main.bicep - Azure AI Showcase Demo のメインテンプレート
// ============================================================================
// このファイルは Infrastructure as Code のエントリーポイントです。
// すべてのリソースをオーケストレーションし、/app モジュールを統合します。

targetScope = 'resourceGroup'

// ============================================================================
// パラメータ定義
// ============================================================================

@description('環境名（dev, prod など）')
@allowed([
  'dev'
  'prod'
])
param environment string = 'dev'

@description('リソースのデプロイ先リージョン')
param location string = resourceGroup().location

@description('プロジェクト名のプレフィックス')
param projectPrefix string = 'azai'

@description('リソースの一意性を保証するためのサフィックス')
param resourceSuffix string = uniqueString(resourceGroup().id)

@description('Azure OpenAI のデプロイメントモデル名')
param openAiDeploymentModel string = 'gpt-4'

@description('タグ情報')
param tags object = {
  Environment: environment
  Project: 'Azure AI Showcase Demo'
  ManagedBy: 'Bicep'
}

// ============================================================================
// 変数定義
// ============================================================================

var namingPrefix = '${projectPrefix}-${environment}'

// ============================================================================
// モジュール参照
// ============================================================================

// TODO: /app モジュールの実装後に参照を追加
// 例:
// module aiServices './app/ai-services.bicep' = {
//   name: 'deploy-ai-services'
//   params: {
//     location: location
//     namingPrefix: namingPrefix
//     resourceSuffix: resourceSuffix
//     tags: tags
//   }
// }

// ============================================================================
// 出力
// ============================================================================

// TODO: デプロイされたリソースの情報を出力
// 例:
// output aiServicesEndpoint string = aiServices.outputs.endpoint
// output aiServicesKey string = aiServices.outputs.primaryKey
