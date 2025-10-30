// ============================================================================
// container-app-frontend.bicep - Azure Container Apps フロントエンド デプロイ
// ============================================================================
// このモジュールは、Azure Container Apps 環境とフロントエンド アプリをデプロイします。
// 指定した Azure Container Registry に格納されたコンテナ イメージを使用し、
// ユーザー割り当てマネージド ID を介して ACR Pull 権限を付与します。

@description('Container Apps 環境のリソース名')
param environmentName string

@description('フロントエンド Container App のリソース名')
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
param targetPort int = 80

@description('最小レプリカ数')
@minValue(0)
param minReplicas int = 1

@description('最大レプリカ数')
@minValue(1)
param maxReplicas int = 1

@description('外部公開を有効にするかどうか')
param enableExternalIngress bool = true

@description('Azure Container Registry のログイン サーバー名（例: contoso.azurecr.io）')
param containerRegistryLoginServer string

@description('Azure Container Registry のリソース ID')
param containerRegistryId string

@description('リソースに付与するタグ')
param tags object = {}

var fullImageName = '${containerRegistryLoginServer}/${containerImage}'
var registryName = last(split(containerRegistryId, '/'))
@description('コンテナの CPU コア数（例: 0.5, 1, 2）。文字列形式で指定してください。')
param containerCpu string = '0.5'

@description('コンテナのメモリサイズ（例: 1Gi, 2Gi）')
param containerMemory string = '1Gi'
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' existing = {
  name: registryName
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: environmentName
  location: location
  properties: {
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
  tags: tags
}

resource userAssignedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31-preview' = {
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

resource frontendContainerApp 'Microsoft.App/containerApps@2024-03-01' = {
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
          name: 'frontend'
          image: fullImageName
          resources: {
            cpu: json(containerCpu)
            memory: containerMemory
          }
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
  dependsOn: [
    userAssignedIdentity
  ]
}

output managedEnvironmentId string = managedEnvironment.id
output containerAppId string = frontendContainerApp.id
output containerAppFqdn string = enableExternalIngress ? frontendContainerApp.properties.configuration.ingress.fqdn : ''
output managedIdentityId string = userAssignedIdentity.id
