import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_MODEL_FALLBACK,
  getCapabilitiesForModel,
  getTagsForModel,
  normalizeModelCategory,
} from '../utils/realtimeModelConfigs';
import type {
  AvatarOption,
  LanguageOptionsState,
  LanguageOptionItem,
  ModelCategory,
  ModelMetadata,
  RealtimeModelLanguageSupport,
  VoiceCharacterOption,
} from '../types/realtimeAvatar';
import type { AvatarProvider, VoiceProvider } from '../types/realtimeAvatar';
import {
  fetchAzureVoices,
  fetchAvatars,
  fetchLanguageOptions,
  fetchRealtimeModels,
  type AvatarOptionsApiResponse,
  type LanguageOptionsApiResponse,
  type RealtimeModelsApiResponse,
  type VoiceOptionsApiResponse,
} from '../services/realtimeApi';

interface RealtimeMetadataState {
  models: ModelMetadata[];
  groupedModels: Record<ModelCategory, ModelMetadata[]>;
  defaultModelId: string;
  voiceOptions: VoiceCharacterOption[];
  defaultVoiceId: string;
  avatarOptions: AvatarOption[];
  defaultAvatarId: string;
  languageOptions: LanguageOptionsState;
  voiceLiveAgentId?: string | null;
}

const INITIAL_LANGUAGE_OPTIONS: LanguageOptionsState = {
  provider: '',
  modes: [],
  languages: [],
  realtimeModels: [],
};

const createGroupedModels = (
  models: ModelMetadata[],
): Record<ModelCategory, ModelMetadata[]> => {
  const groups: Record<ModelCategory, ModelMetadata[]> = {
    realtime: [],
    multimodal: [],
    agent: [],
  };

  models.forEach((model) => {
    groups[model.category]?.push(model);
  });

  return groups;
};

const adaptModels = (response: RealtimeModelsApiResponse): ModelMetadata[] => {
  const adapted = response.models.map<ModelMetadata>((model) => ({
    id: model.model_id,
    label: model.label,
    description: model.description,
    category: normalizeModelCategory(model.category),
    latencyProfile: model.latency_profile,
    notes: model.notes ?? undefined,
    tags: getTagsForModel(model.model_id),
    rawCapabilities: getCapabilitiesForModel(model.model_id),
  }));

  if (response.voice_live_agent_id) {
    const exists = adapted.some((model) => model.id === 'agent-runtime');
    if (!exists) {
      adapted.push({
        id: 'agent-runtime',
        label: 'Azure AI Agent (Agent ID 指定)',
        description: 'Agent Service で作成した会話エージェントを利用します。',
        category: 'agent',
        latencyProfile: 'delegated',
        notes: 'バックエンドで Agent ID を指定してプロキシ接続します。',
        tags: getTagsForModel('agent-runtime'),
        rawCapabilities: getCapabilitiesForModel('agent-runtime'),
      });
    }
  }

  return adapted;
};

const adaptVoices = (response: VoiceOptionsApiResponse): VoiceCharacterOption[] =>
  response.voices.map<VoiceCharacterOption>((voice) => ({
    id: voice.voice_id,
    provider: voice.provider as VoiceProvider,
    displayName: voice.display_name,
    locale: voice.locale,
    description: voice.description,
    tags: voice.tags ?? undefined,
  }));

const adaptAvatars = (response: AvatarOptionsApiResponse): AvatarOption[] =>
  response.avatars.map<AvatarOption>((avatar) => ({
    id: avatar.avatar_id,
    provider: avatar.provider as AvatarProvider,
    displayName: avatar.display_name,
    character: avatar.character,
    gender: avatar.gender,
    style: avatar.style ?? undefined,
    description: avatar.description,
    recommendedUse: avatar.recommended_use ?? undefined,
    tags: avatar.tags ?? undefined,
    thumbnailUrl: avatar.thumbnail_url ?? undefined,
  }));

const adaptLanguages = (response: LanguageOptionsApiResponse): LanguageOptionsState => {
  const modes = response.azure_speech.modes.map((mode) => ({
    mode: mode.mode,
    label: mode.label,
    description: mode.description,
  }));

  const languages: LanguageOptionItem[] = response.azure_speech.languages.map((language) => ({
    code: language.code,
    label: language.label,
    note: language.note ?? undefined,
  }));

  const realtimeModels: RealtimeModelLanguageSupport[] = response.realtime_models.map((entry) => ({
    modelId: entry.model_id,
    selectionMode: entry.selection_mode,
    allowAutoDetect: entry.allow_auto_detect,
    languages: entry.languages.map((language) => ({
      code: language.code,
      label: language.label,
      note: language.note ?? undefined,
    })),
  }));

  return {
    provider: response.azure_speech.provider,
    modes,
    languages,
    realtimeModels,
  };
};

export const useRealtimeMetadata = () => {
  const [state, setState] = useState<RealtimeMetadataState>({
    models: [],
    groupedModels: {
      realtime: [],
      multimodal: [],
      agent: [],
    },
    defaultModelId: DEFAULT_MODEL_FALLBACK,
    voiceOptions: [],
    defaultVoiceId: '',
    avatarOptions: [],
    defaultAvatarId: '',
    languageOptions: INITIAL_LANGUAGE_OPTIONS,
    voiceLiveAgentId: undefined,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [modelsResponse, voiceResponse, avatarResponse, languageResponse] = await Promise.all([
          fetchRealtimeModels(),
          fetchAzureVoices(),
          fetchAvatars(),
          fetchLanguageOptions(),
        ]);

        if (cancelled) {
          return;
        }

        const models = adaptModels(modelsResponse);
        const voiceOptions = adaptVoices(voiceResponse);
        const avatarOptions = adaptAvatars(avatarResponse);
        const languageOptions = adaptLanguages(languageResponse);

        const groupedModels = createGroupedModels(models);

        setState({
          models,
          groupedModels,
          defaultModelId:
            modelsResponse.default_model_id || models[0]?.id || DEFAULT_MODEL_FALLBACK,
          voiceOptions,
          defaultVoiceId: voiceResponse.default_voice_id || voiceOptions[0]?.id || '',
          avatarOptions,
          defaultAvatarId: avatarResponse.default_avatar_id || avatarOptions[0]?.id || '',
          languageOptions,
          voiceLiveAgentId: modelsResponse.voice_live_agent_id,
        });
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load metadata';
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      loading,
      error,
      ...state,
    }),
    [loading, error, state],
  );
};
