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

@description('Azure Container Registry のリソース名')
param containerRegistryName string

@description('Azure Container Registry の SKU')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param containerRegistrySku string = 'Basic'

@description('Azure Container Registry の管理者ユーザーを有効化するかどうか')
param containerRegistryAdminUserEnabled bool = false

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

module containerRegistry './app/container-registry.bicep' = {
  name: 'deployContainerRegistry'
  params: {
    name: containerRegistryName
    location: location
    skuName: containerRegistrySku
    adminUserEnabled: containerRegistryAdminUserEnabled
    tags: tags
  }
}

// ============================================================================
// 出力
// ============================================================================

output containerRegistryId string = containerRegistry.outputs.containerRegistryId
output containerRegistryName string = containerRegistry.outputs.containerRegistryName
output containerRegistryLoginServer string = containerRegistry.outputs.containerRegistryLoginServer
