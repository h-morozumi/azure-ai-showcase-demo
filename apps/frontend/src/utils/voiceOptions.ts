import type { VoiceCharacterOption } from '../types/realtimeAvatar';

export const OPENAI_VOICE_OPTIONS: VoiceCharacterOption[] = [
  {
    id: 'verse',
    provider: 'openai',
    displayName: 'Verse',
    locale: 'en-US',
    description: '軽快でニュートラルなトーン。リアルタイム会話に向いたバランス型。',
    tags: ['Default', 'Conversational'],
  },
  {
    id: 'aria',
    provider: 'openai',
    displayName: 'Aria',
    locale: 'en-GB',
    description: '明るく親しみやすい女性ボイス。案内役やコンシェルジュに最適。',
    tags: ['Friendly'],
  },
  {
    id: 'alloy',
    provider: 'openai',
    displayName: 'Alloy',
    locale: 'en-US',
    description: '落ち着いた男性ボイス。トラブルシュートや司会進行向け。',
    tags: ['Calm'],
  },
  {
    id: 'coral',
    provider: 'openai',
    displayName: 'Coral',
    locale: 'en-US',
    description: '感情表現が豊かなドラマチックボイス。プレゼンテーションに活用。',
    tags: ['Expressive'],
  },
];

export const AZURE_VOICE_OPTIONS: VoiceCharacterOption[] = [
  {
    id: 'ja-JP-AoiNeural',
    provider: 'azure',
    displayName: '青井 (ja-JP)',
    locale: 'ja-JP',
    description: '日本語ネイティブの自然な女性ボイス。受付やガイダンスに適しています。',
    tags: ['日本語', 'Neural'],
  },
  {
    id: 'en-US-JennyNeural',
    provider: 'azure',
    displayName: 'Jenny (en-US)',
    locale: 'en-US',
    description: '温かみのある英語ボイス。グローバルな案内役に親和性が高いです。',
    tags: ['English', 'Neural'],
  },
  {
    id: 'zh-CN-XiaoxiaoNeural',
    provider: 'azure',
    displayName: '晓晓 (zh-CN)',
    locale: 'zh-CN',
    description: '中国語の標準語ボイス。多言語デモでの切替用途に。',
    tags: ['Chinese', 'Multilingual'],
  },
  {
    id: 'en-US-DavisNeural',
    provider: 'azure',
    displayName: 'Davis (en-US)',
    locale: 'en-US',
    description: '低めで落ち着いた男性ボイス。技術サポートや FAQ に適しています。',
    tags: ['Calm', 'Neural'],
  },
];

export const DEFAULT_OPENAI_VOICE_ID = OPENAI_VOICE_OPTIONS[0]?.id ?? '';
export const DEFAULT_AZURE_VOICE_ID = AZURE_VOICE_OPTIONS[0]?.id ?? '';

export const getOpenAIVoiceById = (voiceId: string): VoiceCharacterOption | undefined =>
  OPENAI_VOICE_OPTIONS.find((voice) => voice.id === voiceId);

export const getAzureVoiceById = (voiceId: string): VoiceCharacterOption | undefined =>
  AZURE_VOICE_OPTIONS.find((voice) => voice.id === voiceId);
