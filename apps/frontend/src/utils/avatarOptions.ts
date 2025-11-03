import type { AvatarOption } from '../types/realtimeAvatar';

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'ava-hd',
    provider: 'azure',
    displayName: 'Ava (HD)',
    character: 'ava',
    style: 'professional',
    description: '落ち着いたビジネススタイルの HD アバター。企業紹介やチュートリアルに最適です。',
    recommendedUse: 'ビジネスプレゼン、製品デモ',
    tags: ['HD', 'Business'],
  },
  {
    id: 'yuki-real',
    provider: 'azure',
    displayName: 'Yuki (リアル)',
    character: 'yuki',
    style: 'casual',
    description: '親しみやすい日本人キャラクター。受付や観光案内のシナリオ向け。',
    recommendedUse: '接客、案内役',
    tags: ['日本語', 'Casual'],
  },
  {
    id: 'luna-studio',
    provider: 'azure',
    displayName: 'Luna (スタジオ)',
    character: 'luna',
    style: 'studio',
    description: '明るいスタジオライティングが特徴のアバター。プロモーションに使いやすい雰囲気です。',
    recommendedUse: 'プロモーション動画、イベント案内',
    tags: ['Studio', 'Bright'],
  },
  {
    id: 'kai-digital',
    provider: 'azure',
    displayName: 'Kai (デジタル)',
    character: 'kai',
    style: 'digital',
    description: 'デジタル風の映像表現で未来感を演出。テックカンファレンスにフィットします。',
    recommendedUse: 'テクノロジー紹介、未来志向デモ',
    tags: ['Digital', 'Tech'],
  },
];

export const DEFAULT_AVATAR_ID = AVATAR_OPTIONS[0]?.id ?? '';

export const getAvatarById = (avatarId: string): AvatarOption | undefined =>
  AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId);
