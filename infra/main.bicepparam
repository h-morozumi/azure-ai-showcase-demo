// ============================================================================
// main.bicepparam - Azure AI Showcase Demo のパラメータファイル
// ============================================================================
// このファイルは main.bicep に渡すパラメータを定義します。
// 環境ごとに異なるパラメータファイルを作成できます（例: main.dev.bicepparam）

using './main.bicep'

// ============================================================================
// 環境設定
// ============================================================================

// 環境名（dev または prod）
param environment = 'dev'

// プロジェクト名のプレフィックス
param projectPrefix = 'azai'

// Azure Container Registry の名前
// 例: 小文字英数字で 5-50 文字。
param containerRegistryName = 'azaishowcaseacrdev'

// ============================================================================
// Container Apps 設定
// ============================================================================

// Container Apps 環境の名前
// 例: プレフィックスと環境に基づく命名規則
// param containerAppsEnvironmentName = 'azai-dev-cae-001'

// フロントエンド Container App の名前
param frontendContainerAppName = 'azai-dev-ca-frontend-001'

// デプロイするフロントエンド コンテナ イメージ（<repository>:<tag>）
param frontendContainerImage = 'azure-ai-showcase-frontend:latest'

// Container App のリッスン ポート
param frontendContainerTargetPort = 80

// 必要に応じてレプリカ数を調整
param frontendContainerMinReplicas = 0
param backendContainerMinReplicas = 0

// バックエンド Container App のイメージ
param backendContainerImage = 'azure-ai-showcase-backend:latest'

// バックエンドが外部公開を行う場合は true を指定
param backendContainerIngressExternal = true

// バックエンド Container App の名前
param backendContainerAppName = 'azai-dev-ca-backend-001'


// ============================================================================
// タグ設定
// ============================================================================

param tags = {
  Environment: 'dev'
  Project: 'Azure AI Showcase Demo'
  ManagedBy: 'Bicep'
  CostCenter: 'Engineering'
  Owner: 'h-morozumi'
}

// ============================================================================
// 注意事項
// ============================================================================
// - 機密情報（API キー、パスワードなど）はこのファイルにハードコードしないでください
// - Azure Key Vault を使用してシークレットを管理してください
// - 本番環境用のパラメータファイル（main.prod.bicepparam）を別途作成することを推奨します
