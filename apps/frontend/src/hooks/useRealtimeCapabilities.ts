import { useMemo } from 'react';
import type {
  ModelMetadata,
  RealtimeCapabilityFlags,
  VoiceBehavior,
} from '../types/realtimeAvatar';
import { DEFAULT_MODEL_ID, MODEL_CONFIGS, getModelById } from '../utils/realtimeModelConfigs';

interface UseRealtimeCapabilitiesResult {
  model: ModelMetadata;
  capabilityFlags: RealtimeCapabilityFlags;
  voiceBehavior: VoiceBehavior;
  requiresAgentId: boolean;
}

/**
 * モデル選択に応じた UI 制御用のフラグを計算する。
 */
export const useRealtimeCapabilities = (modelId: string): UseRealtimeCapabilitiesResult => {
  return useMemo(() => {
    const model = getModelById(modelId) ?? MODEL_CONFIGS.find((candidate) => candidate.id === DEFAULT_MODEL_ID) ?? MODEL_CONFIGS[0];
    const { rawCapabilities } = model;

    const capabilityFlags: RealtimeCapabilityFlags = {
      eou: {
        enabled: rawCapabilities.supportsEOU,
        reason: rawCapabilities.supportsEOU
          ? undefined
          : '選択中のモデルは End-of-Utterance をサポートしていません。',
      },
      phraseList: {
        enabled: rawCapabilities.supportsPhraseList,
        reason: rawCapabilities.supportsPhraseList
          ? undefined
          : model.category === 'realtime'
            ? 'リアルタイム系モデルでは phrase list を利用できません。'
            : '選択中のモデルでは phrase list を利用できません。',
      },
      semanticVad: {
        enabled: rawCapabilities.supportsSemanticVad,
        reason: rawCapabilities.supportsSemanticVad
          ? undefined
          : model.category === 'realtime'
            ? '選択中のリアルタイムモデルは semantic VAD をサポートしていません。'
            : 'semantic VAD は GPT Realtime モデル専用のオプションです。',
      },
      instructions: {
        enabled: rawCapabilities.supportsInstructions,
        reason: rawCapabilities.supportsInstructions
          ? undefined
          : model.category === 'agent'
            ? 'Agent 利用時は session.instructions を送信できません。'
            : '選択中のモデルでは instructions を利用できません。',
      },
      customSpeech: {
        enabled: rawCapabilities.supportsCustomSpeech,
        reason: rawCapabilities.supportsCustomSpeech
          ? undefined
          : model.category === 'realtime'
            ? 'リアルタイム系モデルでは Azure Speech のカスタムモデル設定が適用されません。'
            : '選択中のモデルではカスタム音声モデルを利用できません。',
      },
      azureLanguage: {
        enabled: rawCapabilities.supportsAzureLanguage,
        reason: rawCapabilities.supportsAzureLanguage
          ? undefined
          : '選択中のモデルでは認識言語を指定できません。',
      },
    };

    const voiceBehavior: VoiceBehavior = {
      defaultTab: rawCapabilities.voiceDefaultTab,
      showAzureWarning: rawCapabilities.azureVoiceWarning,
    };

    return {
      model,
      capabilityFlags,
      voiceBehavior,
      requiresAgentId: model.category === 'agent',
    };
  }, [modelId]);
};
