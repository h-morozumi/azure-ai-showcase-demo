import { useEffect, useMemo, useState } from 'react';
import { useLiveVoiceSession } from '../hooks/useLiveVoiceSession';
import { useRealtimeCapabilities } from '../hooks/useRealtimeCapabilities';
import { useRealtimeMetadata } from '../hooks/useRealtimeMetadata';
import type { LiveVoiceSessionStatus } from '../hooks/useLiveVoiceSession';
import type { ModelCategory, ModelMetadata } from '../types/realtimeAvatar';
import { MODEL_CATEGORY_LABELS } from '../utils/realtimeModelConfigs';
import { findVoiceById } from '../utils/voiceOptions';
import { findAvatarById } from '../utils/avatarOptions';

const SESSION_STATUS_LABEL: Record<LiveVoiceSessionStatus, string> = {
  idle: '待機',
  connecting: '接続中',
  ready: '稼働中',
  stopping: '停止処理',
  error: 'エラー',
};

const SESSION_STATUS_CLASS: Record<LiveVoiceSessionStatus, string> = {
  idle: 'border border-slate-400/30 bg-slate-800/60 text-slate-200',
  connecting: 'border border-amber-400/40 bg-amber-500/15 text-amber-200',
  ready: 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  stopping: 'border border-slate-400/40 bg-slate-700/40 text-slate-200',
  error: 'border border-rose-400/50 bg-rose-500/15 text-rose-200',
};

const formatBytes = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let result = value;
  let unitIndex = 0;

  while (result >= 1024 && unitIndex < units.length - 1) {
    result /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 ? 0 : 1;
  return `${result.toFixed(precision)} ${units[unitIndex]}`;
};

const formatTimestamp = (value: number): string =>
  new Date(value).toLocaleTimeString('ja-JP', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

type SemanticVadMode = 'azure_semantic_vad' | 'semantic_vad';

type CapabilitySummaryItem = {
  label: string;
  enabled: boolean;
  active: boolean;
  reason?: string;
  status: string;
};

interface FormState {
  instructions: string;
  phraseList: string;
  enableEou: boolean;
  semanticVad: SemanticVadMode;
  language: string;
  multiLanguageSelections: string[];
  customSpeechEndpoint: string;
  agentId: string;
  voiceId: string;
  avatarId: string;
}

const MAX_MULTI_LANGUAGE_SELECTION = 10;

export const RealtimeConfigurator = () => {
  const {
    loading,
    error,
    models,
    groupedModels,
    defaultModelId,
    azureVoiceOptions,
    defaultAzureVoiceId,
    openAiVoiceOptions,
    defaultOpenAiVoiceId,
    avatarOptions,
    defaultAvatarId,
    languageOptions,
    voiceLiveAgentId,
  } = useRealtimeMetadata();

  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const [formState, setFormState] = useState<FormState>(() => ({
    instructions: '',
    phraseList: '',
    enableEou: false,
    semanticVad: 'azure_semantic_vad',
    language: '',
    multiLanguageSelections: [],
    customSpeechEndpoint: '',
    agentId: '',
    voiceId: '',
    avatarId: '',
  }));

  const {
    status: sessionStatus,
    error: sessionError,
    logs: sessionLogs,
    metrics: sessionMetrics,
    start: startLiveSession,
    stop: stopLiveSession,
    isStreaming,
  } = useLiveVoiceSession();

  const [sessionConfigError, setSessionConfigError] = useState<string | null>(null);

  const selectedModel = useMemo<ModelMetadata | undefined>(
    () => models.find((candidate) => candidate.id === selectedModelId) ?? models[0],
    [models, selectedModelId],
  );

  const { model, capabilityFlags, requiresAgentId } = useRealtimeCapabilities(selectedModel);

  const isRealtimeModel = model.category === 'realtime';

  const voiceOptions = useMemo(() => {
    if (isRealtimeModel) {
      if (openAiVoiceOptions.length > 0) {
        return openAiVoiceOptions;
      }
      return azureVoiceOptions;
    }

    if (azureVoiceOptions.length > 0) {
      return azureVoiceOptions;
    }

    return openAiVoiceOptions;
  }, [azureVoiceOptions, openAiVoiceOptions, isRealtimeModel]);

  const defaultVoiceId = useMemo(() => {
    if (isRealtimeModel) {
      if (openAiVoiceOptions.length > 0) {
        return defaultOpenAiVoiceId || openAiVoiceOptions[0]?.id || '';
      }
      return defaultAzureVoiceId || azureVoiceOptions[0]?.id || '';
    }

    if (azureVoiceOptions.length > 0) {
      return defaultAzureVoiceId || azureVoiceOptions[0]?.id || '';
    }

    return defaultOpenAiVoiceId || openAiVoiceOptions[0]?.id || '';
  }, [
    azureVoiceOptions,
    defaultAzureVoiceId,
    defaultOpenAiVoiceId,
    isRealtimeModel,
    openAiVoiceOptions,
  ]);

  const voiceProviderLabel = useMemo(() => {
    const provider = voiceOptions[0]?.provider;
    if (provider === 'openai') {
      return 'OpenAI ボイスキャラクター';
    }
    if (provider === 'azure') {
      return 'Azure ボイスキャラクター';
    }
    return 'ボイスキャラクター';
  }, [voiceOptions]);

  const usingAzureVoiceFallback = useMemo(
    () => isRealtimeModel && voiceOptions.length > 0 && voiceOptions[0].provider !== 'openai',
    [isRealtimeModel, voiceOptions],
  );

  const activeLanguageProfile = useMemo(
    () => languageOptions.realtimeModels.find((entry) => entry.modelId === model.id) ?? null,
    [languageOptions.realtimeModels, model.id],
  );

  const fallbackLanguageMode = useMemo(() => {
    const singleMode = languageOptions.modes.find((item) => item.mode === 'single');
    if (singleMode) {
      return singleMode.mode;
    }
    return languageOptions.modes[0]?.mode ?? 'single';
  }, [languageOptions.modes]);

  useEffect(() => {
    if (!selectedModelId && defaultModelId) {
      setSelectedModelId(defaultModelId);
    }
  }, [defaultModelId, selectedModelId]);

  // モデル変更に伴い無効な設定値をリセットする
  useEffect(() => {
    setFormState((prev) => {
      let changed = false;
      const next = { ...prev };

      if (!capabilityFlags.eou.enabled && prev.enableEou) {
        next.enableEou = false;
        changed = true;
      }
      if (!capabilityFlags.phraseList.enabled && prev.phraseList) {
        next.phraseList = '';
        changed = true;
      }
      if (!capabilityFlags.semanticVad.enabled && prev.semanticVad === 'semantic_vad') {
        next.semanticVad = 'azure_semantic_vad';
        changed = true;
      }
      if (!capabilityFlags.instructions.enabled && prev.instructions) {
        next.instructions = '';
        changed = true;
      }
      if (!capabilityFlags.customSpeech.enabled && prev.customSpeechEndpoint) {
        next.customSpeechEndpoint = '';
        changed = true;
      }
      if (!requiresAgentId && prev.agentId) {
        next.agentId = '';
        changed = true;
      }

      if (voiceOptions.length > 0 && !voiceOptions.some((voice) => voice.id === prev.voiceId)) {
        next.voiceId = defaultVoiceId || voiceOptions[0].id;
        changed = true;
      }

      if (avatarOptions.length > 0 && !avatarOptions.some((avatar) => avatar.id === prev.avatarId)) {
        next.avatarId = defaultAvatarId || avatarOptions[0].id;
        changed = true;
      }

      const profile = activeLanguageProfile;
      const selectionMode = profile?.selectionMode ?? fallbackLanguageMode;

      const rawLanguages = profile ? profile.languages : languageOptions.languages;
      const allowAutoDetect = profile ? profile.allowAutoDetect : true;

      const selectableForMulti = rawLanguages.filter((item) => item.code);
      const selectableForSingle = allowAutoDetect ? rawLanguages : rawLanguages.filter((item) => item.code);

      const effectiveLanguageMode = selectionMode;

      if (effectiveLanguageMode === 'multi') {
        let filteredSelections = prev.multiLanguageSelections.filter((code) =>
          selectableForMulti.some((option) => option.code === code),
        );

        if (filteredSelections.length > MAX_MULTI_LANGUAGE_SELECTION) {
          filteredSelections = filteredSelections.slice(0, MAX_MULTI_LANGUAGE_SELECTION);
        }

        const orderedSelections = rawLanguages
          .map((item) => item.code)
          .filter((code) => code && filteredSelections.includes(code))
          .slice(0, MAX_MULTI_LANGUAGE_SELECTION);

        let activeSelections = orderedSelections;
        if (activeSelections.length === 0 && selectableForMulti.length > 0) {
          activeSelections = [selectableForMulti[0].code];
        }

        const hasMultiChanged =
          prev.multiLanguageSelections.length !== activeSelections.length
          || prev.multiLanguageSelections.some((code, index) => code !== activeSelections[index]);

        if (hasMultiChanged) {
          next.multiLanguageSelections = activeSelections;
          changed = true;
        }

        const joinedLanguages = activeSelections.join(',');

        if (prev.language !== joinedLanguages) {
          next.language = joinedLanguages;
          changed = true;
        }
      } else if (effectiveLanguageMode === 'single') {
        if (prev.multiLanguageSelections.length > 0) {
          next.multiLanguageSelections = [];
          changed = true;
        }

        if (selectableForSingle.length > 0) {
          const preferredLanguage = selectableForSingle.some((item) => item.code === prev.language)
            ? prev.language
            : selectableForSingle[0].code ?? '';

          if (next.language !== preferredLanguage) {
            next.language = preferredLanguage;
            changed = true;
          }
        } else if (next.language !== '') {
          next.language = '';
          changed = true;
        }
      } else {
        if (next.multiLanguageSelections.length > 0) {
          next.multiLanguageSelections = [];
          changed = true;
        }
        if (next.language !== '') {
          next.language = '';
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [
    capabilityFlags.eou.enabled,
    capabilityFlags.phraseList.enabled,
    capabilityFlags.semanticVad.enabled,
    capabilityFlags.instructions.enabled,
    capabilityFlags.customSpeech.enabled,
    requiresAgentId,
    voiceOptions,
    defaultVoiceId,
    avatarOptions,
    defaultAvatarId,
    languageOptions,
    fallbackLanguageMode,
    activeLanguageProfile,
  ]);

  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(event.target.value);
  };

  const handleInstructionsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, instructions: value }));
  };

  const handlePhraseListChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, phraseList: value }));
  };

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    const selectionMode = activeLanguageProfile?.selectionMode ?? fallbackLanguageMode;
    if (selectionMode === 'multi') {
      return;
    }
    setFormState((prev) => ({ ...prev, language: value }));
  };

  const handleMultiLanguageToggle = (code: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    const selectionMode = activeLanguageProfile?.selectionMode ?? fallbackLanguageMode;
    if (selectionMode !== 'multi') {
      return;
    }
    setFormState((prev) => {
      const languageOrdering = activeLanguageProfile
        ? activeLanguageProfile.languages
        : languageOptions.languages;

      if (!languageOrdering.some((item) => item.code === code)) {
        return prev;
      }

      let selections = prev.multiLanguageSelections;
      if (checked) {
        if (selections.includes(code) || selections.length >= MAX_MULTI_LANGUAGE_SELECTION) {
          return prev;
        }
        selections = [...selections, code];
      } else {
        if (!selections.includes(code)) {
          return prev;
        }
        selections = selections.filter((item) => item !== code);
      }

      const ordered = languageOrdering
        .map((item) => item.code)
        .filter((entry) => entry && selections.includes(entry))
        .slice(0, MAX_MULTI_LANGUAGE_SELECTION);

      return {
        ...prev,
        multiLanguageSelections: ordered,
        language: ordered.join(','),
      };
    });
  };

  const handleCustomSpeechChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, customSpeechEndpoint: value }));
  };

  const handleAgentIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, agentId: value }));
    if (sessionConfigError === 'Agent ID を入力してください。') {
      setSessionConfigError(null);
    }
  };

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, voiceId: value }));
    if (sessionConfigError === '利用可能なボイスがありません。') {
      setSessionConfigError(null);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, avatarId: value }));
  };

  const handleStartSession = () => {
    if (sessionStatus === 'connecting' || sessionStatus === 'ready') {
      return;
    }

    if (missingAgentId) {
      setSessionConfigError('Agent ID を入力してください。');
      return;
    }

    if (!voiceCandidate) {
      setSessionConfigError('利用可能なボイスがありません。');
      return;
    }

    const instructions = formState.instructions.trim();
    const agentIdValue = formState.agentId.trim();
    const customSpeechValue = formState.customSpeechEndpoint.trim();

    const phraseListEntries = formState.phraseList
      .split(/[,\r\n]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    setSessionConfigError(null);

    void startLiveSession({
      modelId: model.id,
      voiceId: voiceCandidate,
      instructions: instructions.length > 0 ? instructions : undefined,
      language: formState.language ? formState.language : undefined,
      phraseList: phraseListEntries,
      semanticVad: formState.semanticVad,
      enableEou: formState.enableEou,
      agentId: agentIdValue.length > 0 ? agentIdValue : undefined,
      customSpeechEndpoint: customSpeechValue.length > 0 ? customSpeechValue : undefined,
      avatarId: formState.avatarId || undefined,
    });
  };

  const handleStopSession = () => {
    if (sessionStatus === 'idle') {
      return;
    }
    setSessionConfigError(null);
    void stopLiveSession();
  };

  const selectedVoice = useMemo(
    () => findVoiceById(voiceOptions, formState.voiceId),
    [voiceOptions, formState.voiceId],
  );

  const selectedAvatar = useMemo(
    () => findAvatarById(avatarOptions, formState.avatarId),
    [avatarOptions, formState.avatarId],
  );

  const avatarGenderLabel = selectedAvatar?.gender ?? '';
  const avatarTags = selectedAvatar?.tags ?? [];
  const hasAvatarTags = avatarTags.length > 0;
  const showAvatarMetaChips = Boolean(avatarGenderLabel) || hasAvatarTags;

  const voiceTags = selectedVoice?.tags ?? [];
  const hasVoiceTags = voiceTags.length > 0;
  const isPreviewVoice = voiceTags.includes('Preview');
  const isTurboVoice = voiceTags.includes('Turbo');

  const voiceCandidate = useMemo(() => {
    const fallback = defaultVoiceId || voiceOptions[0]?.id || '';
    return formState.voiceId || fallback;
  }, [defaultVoiceId, formState.voiceId, voiceOptions]);

  const missingAgentId = useMemo(
    () => requiresAgentId && formState.agentId.trim().length === 0,
    [requiresAgentId, formState.agentId],
  );

  const sessionStatusLabel = SESSION_STATUS_LABEL[sessionStatus];
  const sessionStatusClass = SESSION_STATUS_CLASS[sessionStatus];
  const startDisabled = sessionStatus === 'connecting' || sessionStatus === 'ready' || missingAgentId;
  const stopDisabled = sessionStatus === 'idle' || sessionStatus === 'stopping';
  const sessionLogsToRender = useMemo(() => sessionLogs.slice(-20), [sessionLogs]);
  const aggregatedSessionError = sessionConfigError ?? sessionError ?? null;

  const resolveLogLevelClass = (level: string): string => {
    if (level === 'error') {
      return 'bg-rose-500/20 text-rose-200';
    }
    if (level === 'warn') {
      return 'bg-amber-500/20 text-amber-200';
    }
    return 'bg-slate-700/60 text-slate-200';
  };

  const effectiveLanguageMode = activeLanguageProfile?.selectionMode ?? fallbackLanguageMode;

  const allowsAutoDetect = activeLanguageProfile ? activeLanguageProfile.allowAutoDetect : true;

  const isMultiLanguageMode = effectiveLanguageMode === 'multi';

  const languageModeLabel = useMemo(() => {
    if (isMultiLanguageMode) {
      return '複数言語ヒント';
    }
    return allowsAutoDetect ? '単一言語 (自動検出可)' : '単一言語';
  }, [allowsAutoDetect, isMultiLanguageMode]);

  const languageModeDescription = useMemo(() => {
    if (activeLanguageProfile) {
      if (isMultiLanguageMode) {
        return 'このモデルは複数の言語ヒントを指定できます。';
      }
      return activeLanguageProfile.allowAutoDetect
        ? 'このモデルは自動検出をサポートします。'
        : 'このモデルでは単一言語のみ指定できます。';
    }
    if (isMultiLanguageMode) {
      return '複数の言語をヒントとして指定できます。';
    }
    if (allowsAutoDetect) {
      return '自動検出または単一言語の指定が可能です。';
    }
    return '単一の言語を指定します。';
  }, [activeLanguageProfile, allowsAutoDetect, isMultiLanguageMode]);

  const baseLanguageOptions = activeLanguageProfile
    ? activeLanguageProfile.languages
    : languageOptions.languages;

  const availableLanguages = useMemo(() => {
    if (effectiveLanguageMode === 'multi') {
      return baseLanguageOptions.filter((item) => item.code);
    }
    if (allowsAutoDetect) {
      return baseLanguageOptions;
    }
    return baseLanguageOptions.filter((item) => item.code);
  }, [baseLanguageOptions, effectiveLanguageMode, allowsAutoDetect]);

  const selectedLanguageOption = useMemo(
    () => {
      if (effectiveLanguageMode === 'multi') {
        return null;
      }
      return availableLanguages.find((item) => item.code === formState.language) ?? null;
    },
    [availableLanguages, effectiveLanguageMode, formState.language],
  );

  const selectedMultiLanguageLabels = useMemo(
    () => {
      if (effectiveLanguageMode !== 'multi') {
        return [];
      }
      const selectedSet = new Set(formState.multiLanguageSelections);
      return baseLanguageOptions
        .filter((item) => item.code && selectedSet.has(item.code))
        .map((item) => item.label);
    },
    [baseLanguageOptions, effectiveLanguageMode, formState.multiLanguageSelections],
  );

  const languageStatusLabel = useMemo(() => {
    if (!capabilityFlags.azureLanguage.enabled) {
      return 'モデル非対応';
    }

    if (isMultiLanguageMode) {
      if (formState.multiLanguageSelections.length === 0) {
        return '未選択';
      }
      const display = selectedMultiLanguageLabels;
      if (display.length === 0) {
        return formState.language || '未選択';
      }
      if (display.length <= 3) {
        return display.join('、');
      }
      return `${display.slice(0, 3).join('、')} 他${display.length - 3}件`;
    }

    if (selectedLanguageOption) {
      return selectedLanguageOption.label;
    }

    if (formState.language) {
      return formState.language;
    }

    return '未選択';
  }, [
    capabilityFlags.azureLanguage.enabled,
    formState.language,
    formState.multiLanguageSelections,
    isMultiLanguageMode,
    selectedLanguageOption,
    selectedMultiLanguageLabels,
  ]);

  const isLanguageConfigurationActive = useMemo(() => {
    if (!capabilityFlags.azureLanguage.enabled) {
      return false;
    }
    if (isMultiLanguageMode) {
      return formState.multiLanguageSelections.length > 0;
    }
    // single モードでは自動検出 (空文字) も有効な選択とみなす
    return availableLanguages.length > 0;
  }, [
    capabilityFlags.azureLanguage.enabled,
    formState.multiLanguageSelections,
    isMultiLanguageMode,
    availableLanguages,
  ]);

  const languageCapabilityStatus = useMemo(() => {
    if (!capabilityFlags.azureLanguage.enabled) {
      return 'モデル非対応';
    }
    return `${languageModeLabel} · ${languageStatusLabel}`;
  }, [capabilityFlags.azureLanguage.enabled, languageModeLabel, languageStatusLabel]);

  const modelLanguageSupport = activeLanguageProfile?.languages ?? [];

  const capabilitySummary: CapabilitySummaryItem[] = useMemo(() => ([
    {
      label: 'End-of-Utterance 検知',
      enabled: capabilityFlags.eou.enabled,
      active: capabilityFlags.eou.enabled && formState.enableEou,
      reason: capabilityFlags.eou.reason,
      status: capabilityFlags.eou.enabled && formState.enableEou ? 'UI で有効化済み' : capabilityFlags.eou.enabled ? '利用可能（未有効化）' : 'モデル非対応',
    },
    {
      label: 'Phrase list',
      enabled: capabilityFlags.phraseList.enabled,
      active: capabilityFlags.phraseList.enabled && formState.phraseList.length > 0,
      reason: capabilityFlags.phraseList.reason,
      status: capabilityFlags.phraseList.enabled && formState.phraseList.length > 0 ? '語句登録済み' : capabilityFlags.phraseList.enabled ? '入力待ち' : 'モデル非対応',
    },
    {
      label: 'Semantic VAD',
      enabled: capabilityFlags.semanticVad.enabled,
      active: capabilityFlags.semanticVad.enabled && formState.semanticVad === 'semantic_vad',
      reason: capabilityFlags.semanticVad.reason,
      status: capabilityFlags.semanticVad.enabled && formState.semanticVad === 'semantic_vad' ? 'semantic_vad を選択中' : capabilityFlags.semanticVad.enabled ? 'azure_semantic_vad を利用' : 'モデル非対応',
    },
    {
      label: 'instructions',
      enabled: capabilityFlags.instructions.enabled,
      active: capabilityFlags.instructions.enabled && formState.instructions.length > 0,
      reason: capabilityFlags.instructions.reason,
      status: capabilityFlags.instructions.enabled && formState.instructions.length > 0 ? 'カスタムプロンプト設定済み' : capabilityFlags.instructions.enabled ? '入力可能' : 'モデル非対応',
    },
    {
      label: '入力音声 (Azure Speech)',
      enabled: capabilityFlags.azureLanguage.enabled,
      active: isLanguageConfigurationActive,
      reason: capabilityFlags.azureLanguage.reason,
      status: languageCapabilityStatus,
    },
    {
      label: 'Azure Speech カスタムモデル',
      enabled: capabilityFlags.customSpeech.enabled,
      active: capabilityFlags.customSpeech.enabled && formState.customSpeechEndpoint.length > 0,
      reason: capabilityFlags.customSpeech.reason,
      status: capabilityFlags.customSpeech.enabled && formState.customSpeechEndpoint.length > 0 ? 'エンドポイント設定済み' : capabilityFlags.customSpeech.enabled ? '未設定' : 'モデル非対応',
    },
    {
      label: '音声キャラクター',
      enabled: true,
      active: true,
      status: selectedVoice
        ? `${selectedVoice.displayName} · ${selectedVoice.locale} · ${selectedVoice.provider === 'openai' ? 'OpenAI' : 'Azure'}`
        : '未選択',
    },
    {
      label: 'アバター',
      enabled: true,
      active: true,
      status: selectedAvatar ? `${selectedAvatar.displayName} / ${selectedAvatar.gender}` : '未選択',
    },
  ]), [
    capabilityFlags.eou.enabled,
    capabilityFlags.eou.reason,
    formState.enableEou,
    capabilityFlags.phraseList.enabled,
    capabilityFlags.phraseList.reason,
    formState.phraseList,
    capabilityFlags.semanticVad.enabled,
    capabilityFlags.semanticVad.reason,
    formState.semanticVad,
    capabilityFlags.instructions.enabled,
    capabilityFlags.instructions.reason,
    formState.instructions,
    capabilityFlags.azureLanguage.enabled,
    capabilityFlags.azureLanguage.reason,
    isLanguageConfigurationActive,
    languageCapabilityStatus,
    capabilityFlags.customSpeech.enabled,
    capabilityFlags.customSpeech.reason,
    formState.customSpeechEndpoint,
    selectedVoice,
    selectedAvatar,
  ]);

  const categoryOrder: ModelCategory[] = ['realtime', 'multimodal', 'agent'];

  if (loading) {
    return (
      <section className="mt-24 space-y-6" aria-label="Live Voice 設定シミュレーター">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          メタデータを読み込み中です…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-24 space-y-6" aria-label="Live Voice 設定シミュレーター">
        <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
          <p className="text-sm font-semibold text-white">メタデータの取得に失敗しました。</p>
          <p className="text-xs text-amber-300">{error}</p>
        </div>
      </section>
    );
  }

  if (models.length === 0) {
    return (
      <section className="mt-24 space-y-6" aria-label="Live Voice 設定シミュレーター">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          利用可能なモデルが構成されていません。バックエンド設定を確認してください。
        </div>
      </section>
    );
  }

  const renderCapabilityReason = (enabled: boolean, reason?: string) => {
    if (enabled || !reason) {
      return null;
    }
    return (
      <p className="mt-2 text-xs text-amber-300">
        {reason}
      </p>
    );
  };

  const renderSectionTitle = (title: string, subtitle?: string) => (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle ? (
        <p className="text-xs text-slate-400">{subtitle}</p>
      ) : null}
    </div>
  );

  return (
    <section className="mt-24 space-y-6" aria-label="Live Voice 設定シミュレーター">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Live Voice UI 設定シミュレーター</h2>
          <p className="text-sm text-slate-300">
            モデル選択に応じて UI を制御し、サポートされない機能には理由を提示します。デモ実装前に挙動を確認できます。
          </p>
        </div>
        <span className="inline-flex items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
          Prototype
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <aside className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur">
          <div className="space-y-4">
            {renderSectionTitle('1. セッション設定', '利用するモデルとベースプロンプトを選択します。')}
            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              モデル選択
              <select
                value={selectedModelId}
                onChange={handleModelChange}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                {categoryOrder.map((category) => {
                  const options = groupedModels[category] ?? [];
                  if (options.length === 0) {
                    return null;
                  }
                  return (
                    <optgroup key={category} label={MODEL_CATEGORY_LABELS[category]}>
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            <p className="text-xs text-slate-400">{model.description}</p>

            {requiresAgentId ? (
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Agent ID
                <input
                  type="text"
                  value={formState.agentId}
                  onChange={handleAgentIdChange}
                  placeholder="agent_xxxxx"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                />
              </label>
            ) : null}
          </div>

          <div className="space-y-4">
            {renderSectionTitle('2. 会話挙動', '発話検知やターン制御を設定します。')}
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={formState.enableEou}
                onChange={(event) => setFormState((prev) => ({ ...prev, enableEou: event.target.checked }))}
                disabled={!capabilityFlags.eou.enabled}
                className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-0"
              />
              End-of-Utterance 検知を有効化
            </label>
            {renderCapabilityReason(capabilityFlags.eou.enabled, capabilityFlags.eou.reason)}

            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              VAD モード
              <select
                value={formState.semanticVad}
                onChange={(event) => setFormState((prev) => ({ ...prev, semanticVad: event.target.value as SemanticVadMode }))}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="azure_semantic_vad">azure_semantic_vad</option>
                <option value="semantic_vad" disabled={!capabilityFlags.semanticVad.enabled}>
                  semantic_vad
                </option>
              </select>
            </label>
            {renderCapabilityReason(capabilityFlags.semanticVad.enabled, capabilityFlags.semanticVad.reason)}
          </div>

          <div className="space-y-4">
            {renderSectionTitle('3. 入力音声', '音声認識の言語や語句ブーストを設定します。')}
            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              認識言語
              <p className="mt-1 text-[11px] text-slate-400">{languageModeDescription}</p>
              <div className="mt-2">
                {isMultiLanguageMode ? (
                  availableLanguages.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>最大 {MAX_MULTI_LANGUAGE_SELECTION} 言語を選択</span>
                        <span>
                          {formState.multiLanguageSelections.length}
                          /
                          {MAX_MULTI_LANGUAGE_SELECTION}
                        </span>
                      </div>
                      <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {availableLanguages.map((language) => {
                          const checked = formState.multiLanguageSelections.includes(language.code);
                          const disableSelection =
                            !capabilityFlags.azureLanguage.enabled
                            || (!checked
                              && formState.multiLanguageSelections.length >= MAX_MULTI_LANGUAGE_SELECTION);
                          return (
                            <label
                              key={language.code}
                              className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${checked ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-slate-900/80 text-slate-100'} ${disableSelection && !checked ? 'opacity-50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disableSelection}
                                onChange={handleMultiLanguageToggle(language.code)}
                                className="mt-[2px] h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-400 focus:ring-0"
                              />
                              <span>{language.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                      言語情報が利用できません
                    </p>
                  )
                ) : (
                  <select
                    value={formState.language}
                    onChange={handleLanguageChange}
                    disabled={!capabilityFlags.azureLanguage.enabled || availableLanguages.length === 0}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    {availableLanguages.length > 0 ? (
                      availableLanguages.map((language) => (
                        <option key={language.code || `auto-${language.label}`} value={language.code}>
                          {language.label}
                        </option>
                      ))
                    ) : (
                      <option value="">言語情報が利用できません</option>
                    )}
                  </select>
                )}
              </div>
            </label>
            {!isMultiLanguageMode && selectedLanguageOption?.note ? (
              <p className="text-xs text-slate-400">{selectedLanguageOption.note}</p>
            ) : null}
            {isMultiLanguageMode && selectedMultiLanguageLabels.length > 0 ? (
              <p className="text-xs text-slate-400">
                選択中: {selectedMultiLanguageLabels.join('、')}
              </p>
            ) : null}
            {renderCapabilityReason(capabilityFlags.azureLanguage.enabled, capabilityFlags.azureLanguage.reason)}

            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Phrase list
              <textarea
                value={formState.phraseList}
                onChange={handlePhraseListChange}
                disabled={!capabilityFlags.phraseList.enabled}
                rows={3}
                placeholder="Azure, Speech Service, Voice Live"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </label>
            {renderCapabilityReason(capabilityFlags.phraseList.enabled, capabilityFlags.phraseList.reason)}

            {modelLanguageSupport.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3 text-xs text-slate-200">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">モデル対応言語</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  自動検出: {allowsAutoDetect ? '利用可能' : '利用不可'} / 指定モード: {effectiveLanguageMode === 'multi' ? '複数指定' : '単一指定'}
                </p>
                <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto pr-1">
                  {modelLanguageSupport.slice(0, 40).map((language) => (
                    <span
                      key={`${language.code || 'auto'}-${language.label}`}
                      className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] text-slate-100"
                    >
                      {language.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">モデル固有の対応言語情報は現在利用できません。</p>
            )}
          </div>

          <div className="space-y-4">
            {renderSectionTitle('4. 出力音声', '使用するボイスと音響設定を切り替えます。')}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                {voiceProviderLabel}
                <select
                  value={formState.voiceId}
                  onChange={handleVoiceChange}
                  disabled={voiceOptions.length === 0}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  {voiceOptions.length > 0 ? (
                    voiceOptions.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.displayName}
                      </option>
                    ))
                  ) : (
                    <option value="">ボイス情報が利用できません</option>
                  )}
                </select>
              </label>
              {usingAzureVoiceFallback ? (
                <p className="text-[11px] text-amber-300">
                  GPT Realtime モデルでは OpenAI ボイスが推奨されます。現在は Azure ボイスを暫定利用中です。
                </p>
              ) : null}
              {selectedVoice ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3 text-xs text-slate-200">
                  <p className="text-sm font-semibold text-white">{selectedVoice.displayName}</p>
                  <p className="mt-2 leading-relaxed text-slate-200">{selectedVoice.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-100">
                      Locale: {selectedVoice.locale}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-100">
                      Provider: {selectedVoice.provider === 'openai' ? 'OpenAI' : 'Azure'}
                    </span>
                    {hasVoiceTags
                      ? voiceTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200"
                        >
                          {tag}
                        </span>
                      ))
                      : null}
                  </div>
                  {isPreviewVoice ? (
                    <p className="mt-3 text-[11px] text-amber-300">
                      Preview のボイスは仕様変更や音質調整が入る可能性があります。
                    </p>
                  ) : null}
                  {isTurboVoice ? (
                    <p className="mt-1 text-[11px] text-cyan-300">
                      Turbo タグ付きのボイスは低遅延応答向けに最適化されています。
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              カスタム音声モデル URL
              <input
                type="text"
                value={formState.customSpeechEndpoint}
                onChange={handleCustomSpeechChange}
                disabled={!capabilityFlags.customSpeech.enabled}
                placeholder="https://example.cognitiveservices.azure.com/customvoice"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </label>
            {renderCapabilityReason(capabilityFlags.customSpeech.enabled, capabilityFlags.customSpeech.reason)}
          </div>

          <div className="space-y-4">
            {renderSectionTitle('5. アバター', '映像として表示するアバターキャラクターを選択します。')}
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              アバターキャラクター
              <select
                value={formState.avatarId}
                onChange={handleAvatarChange}
                disabled={avatarOptions.length === 0}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                {avatarOptions.length > 0 ? (
                  avatarOptions.map((avatar) => (
                    <option key={avatar.id} value={avatar.id}>
                        {avatar.displayName} · {avatar.gender}
                    </option>
                  ))
                ) : (
                  <option value="">アバター情報が利用できません</option>
                )}
              </select>
            </label>
            {selectedAvatar ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-200">
                {selectedAvatar.thumbnailUrl ? (
                  <img
                    src={selectedAvatar.thumbnailUrl}
                    alt={`${selectedAvatar.displayName} thumbnail`}
                    className="mb-3 h-44 w-full rounded-xl bg-slate-950/70 object-contain"
                    loading="lazy"
                  />
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{selectedAvatar.displayName}</p>
                </div>
                <p className="mt-2 leading-relaxed text-slate-300">{selectedAvatar.description}</p>
                {selectedAvatar.recommendedUse ? (
                  <p className="mt-3 text-[11px] text-slate-400">推奨用途: {selectedAvatar.recommendedUse}</p>
                ) : null}
                {showAvatarMetaChips ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {avatarGenderLabel ? (
                      <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-100">
                        {avatarGenderLabel}
                      </span>
                    ) : null}
                    {avatarTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {renderSectionTitle('6. プロンプト', 'システム指示で会話スタイルを調整します。')}
            <textarea
              value={formState.instructions}
              onChange={handleInstructionsChange}
              disabled={!capabilityFlags.instructions.enabled}
              rows={4}
              placeholder="例: You are a friendly travel concierge..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
            />
            {renderCapabilityReason(capabilityFlags.instructions.enabled, capabilityFlags.instructions.reason)}
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-cyan-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">アバタービュー</h3>
                <p className="text-xs text-slate-400">モデル: {model.label}</p>
                {selectedAvatar ? (
                  <p className="text-xs text-slate-400">アバター: {selectedAvatar.displayName}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${sessionStatusClass}`}
                >
                  <span className="h-2 w-2 rounded-full bg-white/80" aria-hidden="true" />
                  {sessionStatusLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${formState.enableEou ? 'bg-emerald-400' : 'bg-slate-500'}`} aria-hidden="true" />
                  {formState.enableEou ? 'EOU: ON' : 'EOU: OFF'}
                </span>
              </div>
            </div>
            <div className="mt-6 aspect-video w-full rounded-2xl border border-dashed border-cyan-400/40 bg-slate-950/50" aria-label="アバター映像プレビュー">
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                {selectedAvatar
                  ? `${selectedAvatar.displayName} の映像をここに描画します。`
                  : '映像プレビュー（実装時に WebRTC ストリームを描画）'}
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleStartSession}
                disabled={startDisabled}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  startDisabled
                    ? 'cursor-not-allowed border border-white/15 bg-white/10 text-white/60'
                    : 'bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-white shadow-cyan-500/30 hover:scale-[1.01] hover:shadow-lg'
                }`}
              >
                会話開始
              </button>
              <button
                type="button"
                onClick={handleStopSession}
                disabled={stopDisabled}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  stopDisabled
                    ? 'cursor-not-allowed border border-white/15 bg-white/10 text-white/60'
                    : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                会話終了
              </button>
            </div>
            {missingAgentId ? (
              <p className="mt-2 text-xs text-amber-300">Agent ID を入力すると接続できます。</p>
            ) : null}
            {aggregatedSessionError ? (
              <p className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">
                {aggregatedSessionError}
              </p>
            ) : null}
            <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-200 sm:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">ストリーム状態</p>
                <p className={`mt-1 text-sm font-semibold ${isStreaming ? 'text-emerald-200' : 'text-slate-200'}`}>
                  {isStreaming ? '音声ストリーミング中' : 'マイク待機中'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">送信音声</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatBytes(sessionMetrics.sentAudioBytes)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">受信音声</p>
                <p className="mt-1 text-sm font-semibold text-white">{formatBytes(sessionMetrics.receivedAudioBytes)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">レスポンス</p>
                <p className="mt-1 text-sm font-semibold text-white">{sessionMetrics.responseCount}</p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">イベントログ</p>
              <div className="mt-3 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/70">
                <ul className="divide-y divide-white/5">
                  {sessionLogsToRender.length > 0 ? (
                    sessionLogsToRender.map((entry, index) => (
                      <li key={`${entry.timestamp}-${index}`} className="flex flex-col gap-1 px-3 py-2 text-xs text-slate-200">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${resolveLogLevelClass(entry.level)}`}>
                            {entry.level.toUpperCase()}
                          </span>
                          <span className="text-[11px] text-slate-400">{formatTimestamp(entry.timestamp)}</span>
                        </div>
                        <p className="text-slate-100">{entry.message}</p>
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-4 text-xs text-slate-400">ログはまだありません。</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-cyan-500/10">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">機能の有効状況</h3>
            <p className="text-xs text-slate-400">モデルで利用可能な機能と、現在の UI 設定を照合します。</p>
          </div>
          <ul className="space-y-3 text-sm text-slate-200">
            {capabilitySummary.map((item) => (
              <li key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${item.enabled ? 'bg-emerald-400/20 text-emerald-200' : 'bg-slate-700 text-slate-200'}`}>
                    {item.enabled ? (item.active ? 'Active' : 'Available') : 'Disabled'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-300">{item.status}</p>
                {!item.enabled && item.reason ? (
                  <p className="mt-2 text-xs text-amber-300">{item.reason}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-cyan-400/40 bg-cyan-400/10 p-4 text-xs text-cyan-100">
            <p className="font-semibold text-cyan-200">接続メモ</p>
            <ul className="mt-2 space-y-1">
              <li>
                •
                {requiresAgentId
                  ? ` Agent ID を指定してバックエンドで代理接続します${voiceLiveAgentId ? `（推奨 ID: ${voiceLiveAgentId}）` : ''}。`
                  : ' バックエンドで選択モデルを直接指定します。'}
              </li>
              <li>• 認識モード: {languageModeLabel}</li>
              <li>• 認識言語: {selectedLanguageOption?.label ?? (formState.language || '未設定')}</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
};
