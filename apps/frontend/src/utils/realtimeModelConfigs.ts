import type { ModelCategory, ModelMetadata } from '../types/realtimeAvatar';

/**
 * UI で選択可能なモデル一覧。各モデルがサポートする機能を rawCapabilities で定義する。
 */
export const MODEL_CONFIGS: ModelMetadata[] = [
  {
    id: 'gpt-realtime-mini',
    label: 'GPT Realtime Mini',
    description: '低レイテンシ応答向けの軽量モデル。semantic VAD を利用可能。',
    category: 'realtime',
    tags: ['低遅延', 'WebRTC'],
    rawCapabilities: {
      supportsEOU: false,
      supportsPhraseList: false,
      supportsSemanticVad: true,
      supportsInstructions: true,
      supportsCustomSpeech: false,
      supportsAzureLanguage: true,
      azureVoiceWarning: true,
    },
  },
  {
    id: 'gpt-realtime',
    label: 'GPT Realtime',
    description: '低遅延と高品質を両立したリアルタイム会話モデル。',
    category: 'realtime',
    tags: ['リアルタイム', 'WebRTC'],
    rawCapabilities: {
      supportsEOU: false,
      supportsPhraseList: false,
      supportsSemanticVad: true,
      supportsInstructions: true,
      supportsCustomSpeech: false,
      supportsAzureLanguage: true,
      azureVoiceWarning: true,
    },
  },
  {
    id: 'gpt-4o-mini-realtime',
    label: 'GPT-4o Mini Realtime',
    description: 'マルチモーダル軽量モデルのリアルタイム版。',
    category: 'realtime',
    tags: ['マルチモーダル', '低遅延'],
    rawCapabilities: {
      supportsEOU: false,
      supportsPhraseList: false,
      supportsSemanticVad: false,
      supportsInstructions: true,
      supportsCustomSpeech: false,
      supportsAzureLanguage: true,
      azureVoiceWarning: true,
    },
  },
  {
    id: 'phi4-mm-realtime',
    label: 'Phi-4 MM Realtime',
    description: '軽量マルチモーダルモデルのリアルタイム推論。',
    category: 'realtime',
    tags: ['軽量', 'コスト効率'],
    rawCapabilities: {
      supportsEOU: false,
      supportsPhraseList: false,
      supportsSemanticVad: false,
      supportsInstructions: true,
      supportsCustomSpeech: false,
      supportsAzureLanguage: true,
      azureVoiceWarning: true,
    },
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    description: '高品質なマルチモーダル応答を提供するフラグシップモデル。',
    category: 'standard',
    tags: ['高品質', '汎用'],
    rawCapabilities: {
      supportsEOU: true,
      supportsPhraseList: true,
      supportsSemanticVad: false,
      supportsInstructions: true,
      supportsCustomSpeech: true,
      supportsAzureLanguage: true,
      azureVoiceWarning: false,
    },
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    description: '正確性を重視したマルチモーダルモデル。Azure Speech 機能を広く活用可能。',
    category: 'standard',
    tags: ['正確性', 'マルチモーダル'],
    rawCapabilities: {
      supportsEOU: true,
      supportsPhraseList: true,
      supportsSemanticVad: false,
      supportsInstructions: true,
      supportsCustomSpeech: true,
      supportsAzureLanguage: true,
      azureVoiceWarning: false,
    },
  },
  {
    id: 'gpt-5-preview',
    label: 'GPT-5 Preview',
    description: '最新世代の高度な対話モデル。',
    category: 'standard',
    tags: ['最新', 'プレビュー'],
    rawCapabilities: {
      supportsEOU: true,
      supportsPhraseList: true,
      supportsSemanticVad: false,
      supportsInstructions: true,
      supportsCustomSpeech: true,
      supportsAzureLanguage: true,
      azureVoiceWarning: false,
    },
  },
  {
    id: 'agent-runtime',
    label: 'Azure AI Agent (Agent ID 指定)',
    description: 'Agent Service で作成した会話エージェントを利用します。',
    category: 'agent',
    tags: ['Agent'],
    rawCapabilities: {
      supportsEOU: true,
      supportsPhraseList: true,
      supportsSemanticVad: false,
      supportsInstructions: false,
      supportsCustomSpeech: true,
      supportsAzureLanguage: true,
      azureVoiceWarning: false,
    },
  },
];

export const MODEL_CATEGORY_LABELS: Record<ModelCategory, string> = {
  realtime: 'リアルタイムモデル',
  standard: 'マルチモーダル標準モデル',
  agent: 'Azure AI Agent',
};

const groups: Record<ModelCategory, ModelMetadata[]> = {
  realtime: [],
  standard: [],
  agent: [],
};

for (const model of MODEL_CONFIGS) {
  groups[model.category].push(model);
}

export const MODEL_GROUPS: Record<ModelCategory, ModelMetadata[]> = groups;

export const DEFAULT_MODEL_ID = MODEL_CONFIGS[0]?.id ?? '';

export const getModelById = (modelId: string): ModelMetadata | undefined =>
  MODEL_CONFIGS.find((model) => model.id === modelId);
