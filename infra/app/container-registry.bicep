// ============================================================================
// container-registry.bicep - Azure Container Registry のデプロイモジュール
// ============================================================================
// プロジェクト固有の Azure Container Registry を作成し、アプリケーションの
// コンテナ イメージを格納するためのリポジトリを提供します。

@description('Azure Container Registry の名前。小文字英数字で 5-50 文字。')
param name string

@description('レジストリをデプロイするリージョン')
param location string

@description('レジストリの SKU')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param skuName string = 'Basic'

@description('管理者ユーザーを有効にするかどうか')
param adminUserEnabled bool = false

@description('リソースに付与するタグ')
param tags object = {}

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: name
  location: location
  sku: {
    name: skuName
  }
  properties: {
    adminUserEnabled: adminUserEnabled
    publicNetworkAccess: 'Enabled'
  }
  tags: tags
}

output containerRegistryId string = containerRegistry.id
output containerRegistryName string = containerRegistry.name
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
