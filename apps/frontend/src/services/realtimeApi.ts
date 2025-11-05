export interface RealtimeModelsApiResponse {
  default_model_id: string;
  allowed_model_ids: string[];
  voice_live_agent_id?: string | null;
  models: Array<{
    model_id: string;
    label: string;
    category: string;
    latency_profile: string;
    description: string;
    notes?: string | null;
  }>;
}

export interface VoiceOptionsApiResponse {
  provider: string;
  default_voice_id: string;
  voices: Array<{
    voice_id: string;
    provider: string;
    display_name: string;
    locale: string;
    description: string;
    tags?: string[] | null;
  }>;
}

export interface AvatarOptionsApiResponse {
  default_avatar_id: string;
  avatars: Array<{
    avatar_id: string;
    provider: string;
    display_name: string;
    character: string;
    description: string;
    style?: string | null;
    recommended_use?: string | null;
    tags?: string[] | null;
    thumbnail_url?: string | null;
  }>;
}

export interface LanguageOptionsApiResponse {
  azure_speech: {
    provider: string;
    modes: Array<{
      mode: string;
      label: string;
      description: string;
    }>;
    languages: Array<{
      code: string;
      label: string;
      note?: string | null;
    }>;
  };
  realtime_models: Array<{
    model_id: string;
    selection_mode: 'single' | 'multi';
    allow_auto_detect: boolean;
    languages: Array<{
      code: string;
      label: string;
      note?: string | null;
    }>;
  }>;
}

const resolveBaseUrl = (): string => {
  const rawBase = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined) ?? '';
  if (!rawBase) {
    return '';
  }
  return rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
};

const API_BASE_URL = resolveBaseUrl();
const API_KEY = (import.meta.env.VITE_APP_API_KEY as string | undefined) ?? '';

const buildHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (API_KEY) {
    headers['x-app-api-key'] = API_KEY;
  }
  return headers;
};

const toUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalizedPath;
  }
  return `${API_BASE_URL}${normalizedPath}`;
};

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(toUrl(path), {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Request failed (${response.status}): ${detail || response.statusText}`);
  }

  return (await response.json()) as T;
};

export const fetchRealtimeModels = async (): Promise<RealtimeModelsApiResponse> =>
  request<RealtimeModelsApiResponse>('/api/v1/realtime/models');

export const fetchAzureVoices = async (): Promise<VoiceOptionsApiResponse> =>
  request<VoiceOptionsApiResponse>('/api/v1/realtime/voices/azure');

export const fetchAvatars = async (): Promise<AvatarOptionsApiResponse> =>
  request<AvatarOptionsApiResponse>('/api/v1/realtime/avatars');

export const fetchLanguageOptions = async (): Promise<LanguageOptionsApiResponse> =>
  request<LanguageOptionsApiResponse>('/api/v1/realtime/languages');
