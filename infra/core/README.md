# Core Modules

このディレクトリには、プロジェクトに依存しない汎用的な Azure リソースの Bicep モジュールを配置します。

## 目的

- 再利用可能なインフラストラクチャコンポーネントを提供
- プロジェクト固有の要件から独立した基盤リソースを定義
- 他のプロジェクトでも利用可能な汎用モジュールとして設計

## ディレクトリ構成（予定）

```
core/
├── README.md          # このファイル
├── storage/           # ストレージ関連リソース
│   ├── storage-account.bicep
│   └── blob-container.bicep
├── network/           # ネットワーク関連リソース
│   ├── vnet.bicep
│   └── nsg.bicep
├── security/          # セキュリティ関連リソース
│   ├── key-vault.bicep
│   └── managed-identity.bicep
└── monitoring/        # 監視関連リソース
    ├── log-analytics.bicep
    └── application-insights.bicep
```

## 設計ガイドライン

### 参照ルール
- ✅ **許可**: /core 内でのモジュール間参照
- ❌ **禁止**: main.bicep からの直接参照
- ❌ **禁止**: /app からの直接参照
- ❌ **禁止**: /core から /app への参照

### モジュール作成時の注意点
1. プロジェクト固有の設定に依存しないこと
2. パラメータで柔軟に設定できるようにすること
3. 再利用性を重視した設計にすること
4. 適切なデフォルト値を設定すること
5. パラメータの説明を `@description` で追加すること

### 命名規則
- ファイル名: `{resource-type}.bicep` （例: `storage-account.bicep`）
- パラメータ: camelCase（例: `storageAccountName`）
- リソース名: kebab-case（例: `storage-account-001`）

## 使用方法

Core モジュールは /app モジュールから参照して使用します。
main.bicep から直接参照することは禁止されています。

### 例: /app から /core のモジュールを利用

```bicep
// app/ai-services.bicep 内での使用例

// /core のストレージアカウントモジュールを利用
module storage '../core/storage/storage-account.bicep' = {
  name: 'deploy-storage'
  params: {
    storageAccountName: 'aistorageaccount'
    location: location
    sku: 'Standard_LRS'
  }
}
```

## 今後の追加予定

プロジェクトの進行に応じて、以下のモジュールを追加する予定です：

- [ ] ストレージアカウント
- [ ] Key Vault
- [ ] Virtual Network
- [ ] Network Security Group
- [ ] Log Analytics
- [ ] Application Insights
- [ ] Managed Identity
