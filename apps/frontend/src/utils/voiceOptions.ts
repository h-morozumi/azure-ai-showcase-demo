import type { VoiceCharacterOption } from '../types/realtimeAvatar';

export const findVoiceById = (
  voices: VoiceCharacterOption[],
  voiceId: string,
): VoiceCharacterOption | undefined => voices.find((voice) => voice.id === voiceId);
