/**
 * Azure AI サービスの種類を定義
 */
export type AzureService = 
  | 'Speech Service'
  | 'Document Intelligence'
  | 'AI Foundry'
  | 'OpenAI Service';

/**
 * デモの情報を定義する型
 */
export interface Demo {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: AzureService[];
  path: string;
}

/**
 * フィルター状態を管理する型
 */
export interface FilterState {
  selectedTags: AzureService[];
}
