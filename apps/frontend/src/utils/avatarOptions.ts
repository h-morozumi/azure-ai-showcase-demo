import type { AvatarOption } from '../types/realtimeAvatar';

export const findAvatarById = (
  avatars: AvatarOption[],
  avatarId: string,
): AvatarOption | undefined => avatars.find((avatar) => avatar.id === avatarId);
