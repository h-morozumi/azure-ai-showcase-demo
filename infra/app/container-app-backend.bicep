// ============================================================================
// container-app-backend.bicep - Azure Container Apps バックエンド デプロイ
// ============================================================================
// 既存の Container Apps 環境へバックエンド アプリを追加するモジュール。
// ACR に格納されたコンテナ イメージを使用し、ユーザー割り当てマネージド ID 経由
// で Pull 権限を付与する。

@description('既存の Container Apps 環境のリソース名')
param managedEnvironmentName string

@description('バックエンド Container App のリソース名')
param containerAppName string

@description('ユーザー割り当てマネージド ID の名前')
param managedIdentityName string

@description('リソースのデプロイ先リージョン')
param location string

@description('Container App が使用するコンテナ イメージ（<repository>:<tag> 形式）')
param containerImage string

@description('コンテナがリッスンするポート番号（Ingress のターゲット ポート）')
@minValue(1)
@maxValue(65535)
param targetPort int = 8000

@description('最小レプリカ数')
@minValue(0)
param minReplicas int = 1

@description('最大レプリカ数')
@minValue(1)
param maxReplicas int = 2

@description('外部公開を有効にするかどうか')
param enableExternalIngress bool = false

@description('Azure Container Registry のログイン サーバー名（例: contoso.azurecr.io）')
param containerRegistryLoginServer string

@description('Azure Container Registry のリソース ID')
param containerRegistryId string

@description('リソースに付与するタグ')
param tags object = {}

@description('コンテナの CPU コア数（例: 0.5, 1, 2）。文字列形式で指定してください。')
param containerCpu string = '0.5'

@description('コンテナのメモリサイズ（例: 1Gi, 2Gi）')
param containerMemory string = '1Gi'

var fullImageName = '${containerRegistryLoginServer}/${containerImage}'
var registryName = last(split(containerRegistryId, '/'))

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: managedEnvironmentName
}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' existing = {
  name: registryName
}

resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2018-11-30' = {
  name: managedIdentityName
  location: location
  tags: tags
}

var ingressConfiguration = {
  external: enableExternalIngress
  targetPort: targetPort
  transport: 'auto'
  traffic: [
    {
      latestRevision: true
      weight: 100
    }
  ]
}

resource backendContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: containerAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      ingress: ingressConfiguration
      registries: [
        {
          server: containerRegistryLoginServer
          identity: userAssignedIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: fullImageName
          resources: {
            cpu: json(containerCpu)
            memory: containerMemory
          }
          env: [
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: ''
            }
            {
              name: 'AZURE_OPENAI_API_KEY'
              value: ''
            }
            {
              name: 'AZURE_OPENAI_DEPLOYMENT'
              value: ''
            }
            {
              name: 'AZURE_SPEECH_KEY'
              value: ''
            }
            {
              name: 'AZURE_SPEECH_REGION'
              value: ''
            }
            {
              name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
              value: ''
            }
            {
              name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY'
              value: ''
            }
            {
              name: 'APP_LOG_LEVEL'
              value: 'info'
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
  tags: tags
}

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistryId, managedIdentityName, 'acrpull')
  scope: containerRegistry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: userAssignedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output containerAppId string = backendContainerApp.id
output containerAppFqdn string = enableExternalIngress ? backendContainerApp.properties.configuration.ingress.fqdn : ''
output managedIdentityId string = userAssignedIdentity.id
