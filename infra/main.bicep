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

@description('Container Apps 環境の名前')
param containerAppsEnvironmentName string = '${projectPrefix}-${environment}-cae-${resourceSuffix}'

@description('フロントエンド Container App の名前')
param frontendContainerAppName string = '${projectPrefix}-${environment}-ca-frontend-${resourceSuffix}'

@description('フロントエンド コンテナ イメージ（<repository>:<tag> 形式）')
param frontendContainerImage string = 'frontend:latest'

@description('フロントエンド コンテナのリッスン ポート')
@minValue(1)
@maxValue(65535)
param frontendContainerTargetPort int = 80

@description('フロントエンド Container App の最小レプリカ数')
@minValue(0)
param frontendContainerMinReplicas int = 1

@description('フロントエンド Container App の最大レプリカ数')
@minValue(1)
param frontendContainerMaxReplicas int = 2 // デフォルト値を 2 に設定し、スケーリングを有効化

@description('フロントエンド Container App を外部公開するかどうか')
param frontendContainerIngressExternal bool = true

@description('フロントエンド Container App 用のユーザー割り当てマネージド ID の名前')
param frontendContainerManagedIdentityName string = '${projectPrefix}-${environment}-id-frontend-${resourceSuffix}'

@description('Log Analytics ワークスペース名')
param logAnalyticsWorkspaceName string = '${projectPrefix}-${environment}-law-${resourceSuffix}'

@description('Log Analytics ワークスペースの SKU')
@allowed([
  'PerGB2018'
  'PerNode'
  'Standalone'
  'CapacityReservation'
])
param logAnalyticsWorkspaceSku string = 'PerGB2018'

@description('Log Analytics ワークスペースの保有日数')
@minValue(30)
@maxValue(730)
param logAnalyticsWorkspaceRetentionInDays int = 30

@description('タグ情報')
param tags object = {
  Environment: environment
  Project: 'Azure AI Showcase Demo'
  ManagedBy: 'Bicep'
}

// ============================================================================
// 変数定義
// ============================================================================

// ============================================================================
// モジュール参照
// ============================================================================

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    retentionInDays: logAnalyticsWorkspaceRetentionInDays
    sku: {
      name: logAnalyticsWorkspaceSku
    }
    features: {
      legacy: 0
      searchVersion: 1
    }
    workspaceCapping: {
      dailyQuotaGb: -1
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
  tags: tags
}

var logAnalyticsSharedKeys = listKeys(logAnalyticsWorkspace.id, '2020-08-01')
var logAnalyticsPrimarySharedKey = logAnalyticsSharedKeys.primarySharedKey

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

module frontendContainerApp './app/container-app-frontend.bicep' = {
  name: 'deployFrontendContainerApp'
  params: {
    environmentName: containerAppsEnvironmentName
    containerAppName: frontendContainerAppName
    managedIdentityName: frontendContainerManagedIdentityName
    location: location
    containerImage: frontendContainerImage
    targetPort: frontendContainerTargetPort
    minReplicas: frontendContainerMinReplicas
    maxReplicas: frontendContainerMaxReplicas
    enableExternalIngress: frontendContainerIngressExternal
    containerRegistryLoginServer: containerRegistry.outputs.containerRegistryLoginServer
    containerRegistryId: containerRegistry.outputs.containerRegistryId
    logAnalyticsCustomerId: logAnalyticsWorkspace.properties.customerId
    logAnalyticsSharedKey: logAnalyticsPrimarySharedKey
    tags: tags
  }
}

// ============================================================================
// 出力
// ============================================================================

output containerRegistryId string = containerRegistry.outputs.containerRegistryId
output containerRegistryName string = containerRegistry.outputs.containerRegistryName
output containerRegistryLoginServer string = containerRegistry.outputs.containerRegistryLoginServer
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output containerAppsEnvironmentId string = frontendContainerApp.outputs.managedEnvironmentId
output frontendContainerAppId string = frontendContainerApp.outputs.containerAppId
output frontendContainerAppFqdn string = frontendContainerApp.outputs.containerAppFqdn
output frontendContainerManagedIdentityId string = frontendContainerApp.outputs.managedIdentityId
