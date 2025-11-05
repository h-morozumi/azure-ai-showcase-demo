import { useEffect, useMemo, useState } from 'react';
import { useRealtimeCapabilities } from '../hooks/useRealtimeCapabilities';
import type { ModelCategory } from '../types/realtimeAvatar';
import { MODEL_CATEGORY_LABELS, MODEL_GROUPS, MODEL_CONFIGS, DEFAULT_MODEL_ID } from '../utils/realtimeModelConfigs';
import type { ModelMetadata } from '../types/realtimeAvatar';
import { AZURE_VOICE_OPTIONS, DEFAULT_AZURE_VOICE_ID, getAzureVoiceById } from '../utils/voiceOptions';
import { AVATAR_OPTIONS, DEFAULT_AVATAR_ID, getAvatarById } from '../utils/avatarOptions';

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
  customSpeechEndpoint: string;
  agentId: string;
  azureVoiceId: string;
  avatarId: string;
}

const initialModel: ModelMetadata = MODEL_CONFIGS.find((model) => model.id === DEFAULT_MODEL_ID) ?? MODEL_CONFIGS[0];

export const RealtimeConfigurator = () => {
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModel.id);
  const { model, capabilityFlags, requiresAgentId } = useRealtimeCapabilities(selectedModelId);

  const [formState, setFormState] = useState<FormState>(() => ({
    instructions: '',
    phraseList: '',
    enableEou: false,
    semanticVad: 'azure_semantic_vad',
    language: 'ja-JP',
    customSpeechEndpoint: '',
    agentId: '',
    azureVoiceId: DEFAULT_AZURE_VOICE_ID,
    avatarId: DEFAULT_AVATAR_ID,
  }));

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

      if (!AVATAR_OPTIONS.some((avatar) => avatar.id === prev.avatarId)) {
        next.avatarId = DEFAULT_AVATAR_ID;
        changed = true;
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

  const handleLanguageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, language: value }));
  };

  const handleCustomSpeechChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, customSpeechEndpoint: value }));
  };

  const handleAgentIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, agentId: value }));
  };

  const handleAzureVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, azureVoiceId: value }));
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, avatarId: value }));
  };

  const selectedAzureVoice = useMemo(
    () => getAzureVoiceById(formState.azureVoiceId) ?? getAzureVoiceById(DEFAULT_AZURE_VOICE_ID),
    [formState.azureVoiceId],
  );

  const selectedAvatar = useMemo(
    () => getAvatarById(formState.avatarId) ?? getAvatarById(DEFAULT_AVATAR_ID),
    [formState.avatarId],
  );

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
      status:
        `Azure: ${selectedAzureVoice?.displayName ?? formState.azureVoiceId}`,
    },
    {
      label: 'アバター',
      enabled: true,
      active: true,
      status: selectedAvatar ? `${selectedAvatar.displayName} (${selectedAvatar.character})` : '未選択',
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
    capabilityFlags.customSpeech.enabled,
    capabilityFlags.customSpeech.reason,
    formState.customSpeechEndpoint,
    formState.azureVoiceId,
    selectedAzureVoice?.displayName,
    selectedAvatar,
  ]);

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
                {(Object.keys(MODEL_CATEGORY_LABELS) as ModelCategory[]).map((category) => (
                  <optgroup key={category} label={MODEL_CATEGORY_LABELS[category]}>
                    {MODEL_GROUPS[category].map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
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
              <input
                type="text"
                value={formState.language}
                onChange={handleLanguageChange}
                disabled={!capabilityFlags.azureLanguage.enabled}
                placeholder="ja-JP"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              />
            </label>
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
          </div>

          <div className="space-y-4">
            {renderSectionTitle('4. 出力音声', '使用するボイスと音響設定を切り替えます。')}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Azure ボイスキャラクター
                <select
                  value={formState.azureVoiceId}
                  onChange={handleAzureVoiceChange}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                >
                  {AZURE_VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.displayName} · {voice.locale}
                    </option>
                  ))}
                </select>
              </label>
              {selectedAzureVoice ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-3 text-xs text-slate-200">
                  <p>{selectedAzureVoice.description}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Locale: {selectedAzureVoice.locale}
                    {selectedAzureVoice.tags && selectedAzureVoice.tags.length > 0 ? ` ・ ${selectedAzureVoice.tags.join(' / ')}` : ''}
                  </p>
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
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                {AVATAR_OPTIONS.map((avatar) => (
                  <option key={avatar.id} value={avatar.id}>
                    {avatar.displayName}
                  </option>
                ))}
              </select>
            </label>
            {selectedAvatar ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-200">
                <p className="font-semibold text-white">{selectedAvatar.displayName}</p>
                <p className="mt-2 leading-relaxed text-slate-300">{selectedAvatar.description}</p>
                {selectedAvatar.recommendedUse ? (
                  <p className="mt-3 text-[11px] text-slate-400">推奨用途: {selectedAvatar.recommendedUse}</p>
                ) : null}
                {selectedAvatar.tags && selectedAvatar.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedAvatar.tags.map((tag) => (
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
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                <span className={`h-2 w-2 rounded-full ${formState.enableEou ? 'bg-emerald-400' : 'bg-slate-500'}`} aria-hidden="true" />
                {formState.enableEou ? 'EOU: ON' : 'EOU: OFF'}
              </span>
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
                className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-cyan-500/30 transition hover:scale-[1.01] hover:shadow-lg"
              >
                会話開始
              </button>
              <button
                type="button"
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                会話終了
              </button>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">リアルタイム字幕</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-slate-950/70 px-3 py-2 text-slate-100">ユーザー: （マイク入力待機中）</div>
                <div className="rounded-xl bg-cyan-500/10 px-3 py-2 text-cyan-100">アバター: 応答がここにストリーミングされます。</div>
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
              <li>• {requiresAgentId ? 'Agent ID を指定してバックエンドで代理接続します。' : 'バックエンドで選択モデルを直接指定します。'}</li>
              <li>• 認識言語: {formState.language || '未設定'}</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
};
