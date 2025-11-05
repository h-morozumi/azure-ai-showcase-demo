import type { ModelCategory, RawCapabilities } from '../types/realtimeAvatar';

export const MODEL_CATEGORY_LABELS: Record<ModelCategory, string> = {
  realtime: 'リアルタイムモデル',
  multimodal: 'マルチモーダルモデル',
  agent: 'Azure AI Agent',
};

export const DEFAULT_MODEL_FALLBACK = 'gpt-realtime';

const DEFAULT_CAPABILITIES: RawCapabilities = {
  supportsEOU: true,
  supportsPhraseList: true,
  supportsSemanticVad: false,
  supportsInstructions: true,
  supportsCustomSpeech: true,
  supportsAzureLanguage: true,
  azureVoiceWarning: false,
};

const MODEL_CAPABILITY_MAP: Record<string, RawCapabilities> = {
  'gpt-realtime': {
    supportsEOU: false,
    supportsPhraseList: false,
    supportsSemanticVad: true,
    supportsInstructions: true,
    supportsCustomSpeech: false,
    supportsAzureLanguage: true,
    azureVoiceWarning: true,
  },
  'gpt-realtime-mini': {
    supportsEOU: false,
    supportsPhraseList: false,
    supportsSemanticVad: true,
    supportsInstructions: true,
    supportsCustomSpeech: false,
    supportsAzureLanguage: true,
    azureVoiceWarning: true,
  },
  'gpt-4o-mini-realtime': {
    supportsEOU: false,
    supportsPhraseList: false,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: false,
    supportsAzureLanguage: true,
    azureVoiceWarning: true,
  },
  'phi4-mm-realtime': {
    supportsEOU: false,
    supportsPhraseList: false,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: false,
    supportsAzureLanguage: true,
    azureVoiceWarning: true,
  },
  'gpt-4o': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'gpt-4o-mini': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'gpt-4.1': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'gpt-4.1-mini': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'gpt-5': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'gpt-5-mini': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'gpt-5-nano': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'gpt-5-chat': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'phi4-mini': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: true,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
  'agent-runtime': {
    supportsEOU: true,
    supportsPhraseList: true,
    supportsSemanticVad: false,
    supportsInstructions: false,
    supportsCustomSpeech: true,
    supportsAzureLanguage: true,
    azureVoiceWarning: false,
  },
};

const MODEL_TAGS_MAP: Record<string, string[]> = {
  'gpt-realtime': ['リアルタイム', 'WebRTC'],
  'gpt-realtime-mini': ['低遅延', '軽量'],
  'gpt-4o-mini-realtime': ['マルチモーダル', '低遅延'],
  'phi4-mm-realtime': ['軽量', 'コスト効率'],
  'gpt-4o': ['高品質', '汎用'],
  'gpt-4o-mini': ['軽量', 'マルチモーダル'],
  'gpt-4.1': ['正確性', 'マルチモーダル'],
  'gpt-4.1-mini': ['軽量', 'マルチモーダル'],
  'gpt-5': ['最新', 'フラグシップ'],
  'gpt-5-mini': ['軽量', '最新'],
  'gpt-5-nano': ['超軽量', '最新'],
  'gpt-5-chat': ['対話特化'],
  'phi4-mini': ['軽量', 'マルチモーダル'],
  'agent-runtime': ['Agent'],
};

export const getCapabilitiesForModel = (modelId: string): RawCapabilities =>
  MODEL_CAPABILITY_MAP[modelId] ?? DEFAULT_CAPABILITIES;

export const getTagsForModel = (modelId: string): string[] => MODEL_TAGS_MAP[modelId] ?? [];

export const normalizeModelCategory = (category: string): ModelCategory => {
  if (category === 'multimodal') {
    return 'multimodal';
  }
  if (category === 'agent') {
    return 'agent';
  }
  return 'realtime';
};
