export type ModelCategory = 'realtime' | 'standard' | 'agent';

export type VoiceTab = 'openai' | 'azure';

export type VoiceProvider = 'openai' | 'azure';

export interface CapabilityFlag {
  enabled: boolean;
  reason?: string;
}

export interface RealtimeCapabilityFlags {
  eou: CapabilityFlag;
  phraseList: CapabilityFlag;
  semanticVad: CapabilityFlag;
  instructions: CapabilityFlag;
  customSpeech: CapabilityFlag;
  azureLanguage: CapabilityFlag;
}

export interface VoiceBehavior {
  defaultTab: VoiceTab;
  showAzureWarning: boolean;
}

interface RawCapabilities {
  supportsEOU: boolean;
  supportsPhraseList: boolean;
  supportsSemanticVad: boolean;
  supportsInstructions: boolean;
  supportsCustomSpeech: boolean;
  supportsAzureLanguage: boolean;
  voiceDefaultTab: VoiceTab;
  azureVoiceWarning: boolean;
}

export interface ModelMetadata {
  id: string;
  label: string;
  description: string;
  category: ModelCategory;
  tags: string[];
  rawCapabilities: RawCapabilities;
}

export interface VoiceCharacterOption {
  id: string;
  provider: VoiceProvider;
  displayName: string;
  locale: string;
  description: string;
  tags?: string[];
}

export type AvatarProvider = 'azure' | 'custom';

export interface AvatarOption {
  id: string;
  provider: AvatarProvider;
  displayName: string;
  character: string;
  style?: string;
  description: string;
  recommendedUse?: string;
  tags?: string[];
}
