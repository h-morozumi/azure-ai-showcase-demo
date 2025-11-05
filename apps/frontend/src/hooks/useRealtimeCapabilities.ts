import { useMemo } from 'react';
import type {
  ModelMetadata,
  RealtimeCapabilityFlags,
} from '../types/realtimeAvatar';
import { DEFAULT_MODEL_FALLBACK, getCapabilitiesForModel } from '../utils/realtimeModelConfigs';

interface UseRealtimeCapabilitiesResult {
  model: ModelMetadata;
  capabilityFlags: RealtimeCapabilityFlags;
  requiresAgentId: boolean;
}

/**
 * モデル選択に応じた UI 制御用のフラグを計算する。
 */
export const useRealtimeCapabilities = (model: ModelMetadata | undefined): UseRealtimeCapabilitiesResult => {
  return useMemo(() => {
    const activeModel: ModelMetadata = model
      ? model
      : {
          id: DEFAULT_MODEL_FALLBACK,
          label: DEFAULT_MODEL_FALLBACK,
          description: '',
          category: 'realtime',
          latencyProfile: '',
          notes: undefined,
          tags: [],
          rawCapabilities: getCapabilitiesForModel(DEFAULT_MODEL_FALLBACK),
        };

    const { rawCapabilities } = activeModel;

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
          : activeModel.category === 'realtime'
            ? 'リアルタイム系モデルでは phrase list を利用できません。'
            : '選択中のモデルでは phrase list を利用できません。',
      },
      semanticVad: {
        enabled: rawCapabilities.supportsSemanticVad,
        reason: rawCapabilities.supportsSemanticVad
          ? undefined
          : activeModel.category === 'realtime'
            ? '選択中のリアルタイムモデルは semantic VAD をサポートしていません。'
            : 'semantic VAD は GPT Realtime モデル専用のオプションです。',
      },
      instructions: {
        enabled: rawCapabilities.supportsInstructions,
        reason: rawCapabilities.supportsInstructions
          ? undefined
          : activeModel.category === 'agent'
            ? 'Agent 利用時は session.instructions を送信できません。'
            : '選択中のモデルでは instructions を利用できません。',
      },
      customSpeech: {
        enabled: rawCapabilities.supportsCustomSpeech,
        reason: rawCapabilities.supportsCustomSpeech
          ? undefined
          : activeModel.category === 'realtime'
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

    return {
        model: activeModel,
      capabilityFlags,
        requiresAgentId: activeModel.category === 'agent',
    };
    }, [model]);
};
