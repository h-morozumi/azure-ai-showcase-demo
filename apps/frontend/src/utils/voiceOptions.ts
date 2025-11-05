import type { VoiceCharacterOption } from '../types/realtimeAvatar';

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

export const DEFAULT_AZURE_VOICE_ID = AZURE_VOICE_OPTIONS[0]?.id ?? '';

export const getAzureVoiceById = (voiceId: string): VoiceCharacterOption | undefined =>
  AZURE_VOICE_OPTIONS.find((voice) => voice.id === voiceId);
