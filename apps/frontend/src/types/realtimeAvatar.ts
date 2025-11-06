export type ModelCategory = 'realtime' | 'multimodal' | 'agent';

export type VoiceProvider = 'azure';

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

export interface RawCapabilities {
  supportsEOU: boolean;
  supportsPhraseList: boolean;
  supportsSemanticVad: boolean;
  supportsInstructions: boolean;
  supportsCustomSpeech: boolean;
  supportsAzureLanguage: boolean;
  azureVoiceWarning: boolean;
}

export interface ModelMetadata {
  id: string;
  label: string;
  description: string;
  category: ModelCategory;
  latencyProfile: string;
  notes?: string;
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
  gender: string;
  style?: string;
  description: string;
  recommendedUse?: string;
  tags?: string[];
  thumbnailUrl?: string;
}

export interface LanguageOptionItem {
  code: string;
  label: string;
  note?: string;
}

export interface LanguageModeOption {
  mode: string;
  label: string;
  description: string;
}

export interface RealtimeModelLanguageSupport {
  modelId: string;
  selectionMode: 'single' | 'multi';
  allowAutoDetect: boolean;
  languages: LanguageOptionItem[];
}

export interface LanguageOptionsState {
  provider: string;
  modes: LanguageModeOption[];
  languages: LanguageOptionItem[];
  realtimeModels: RealtimeModelLanguageSupport[];
}
