"""Live Voice 関連 API ルーター。"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends

from app.api.deps import get_app_settings, verify_api_key
from app.config.realtime_models import RealtimeModel, get_model, list_models
from app.config.avatar_options import list_avatars
from app.config.language_options import (
    list_azure_speech_language_modes,
    list_azure_speech_languages,
    list_model_language_profiles,
)
from app.config.voice_options import (
    get_default_azure_voice_id,
    list_azure_voices,
)
from app.core.config import Settings
from app.schemas.realtime import (
    AvatarOptionSchema,
    AzureSpeechLanguagesResponse,
    LanguageModeSchema,
    LanguageOptionSchema,
    LanguageOptionsResponse,
    AvatarOptionsResponse,
    RealtimeModelsResponse,
    RealtimeModelSchema,
    ModelLanguageSupportSchema,
    VoiceOptionSchema,
    VoiceOptionsResponse,
)

router = APIRouter(
    prefix="/api/v1/realtime",
    tags=["realtime"],
    dependencies=[Depends(verify_api_key)],
)


def _merge_with_default(models: List[RealtimeModel], default_id: str) -> List[RealtimeModel]:
    """許可モデルと既定モデルを重複なく結合する。"""

    merged: List[RealtimeModel] = []
    seen_ids: set[str] = set()

    default_model = get_model(default_id)
    if default_model:
        merged.append(default_model)
        seen_ids.add(default_model.model_id)

    for model in models:
        if model.model_id in seen_ids:
            continue
        merged.append(model)
        seen_ids.add(model.model_id)

    return merged


@router.get("/models", response_model=RealtimeModelsResponse, summary="利用可能な Live Voice モデル一覧を取得")
async def list_realtime_models(settings: Settings = Depends(get_app_settings)) -> RealtimeModelsResponse:
    """環境設定に従って利用可能なモデル一覧を返却する。"""

    allowed_ids = settings.allowed_models or None
    filtered_models = list_models(allowed_ids)

    merged_models = _merge_with_default(filtered_models, settings.voice_live_deployment_id)

    if not merged_models:
        merged_models = filtered_models

    payload = [RealtimeModelSchema.from_dataclass(model) for model in merged_models]
    allowed_model_ids = [model.model_id for model in merged_models]

    return RealtimeModelsResponse(
        default_model_id=settings.voice_live_deployment_id,
        allowed_model_ids=allowed_model_ids,
        voice_live_agent_id=settings.voice_live_agent_id,
        models=payload,
    )


@router.get(
    "/voices/azure",
    response_model=VoiceOptionsResponse,
    summary="Azure ボイス一覧を取得",
)
async def list_azure_voice_options() -> VoiceOptionsResponse:
    """Azure ボイスのメタデータを返す。"""

    voices = [VoiceOptionSchema.from_dataclass(voice) for voice in list_azure_voices()]
    default_voice_id = get_default_azure_voice_id() if voices else ""

    return VoiceOptionsResponse(provider="azure", default_voice_id=default_voice_id, voices=voices)


@router.get(
    "/avatars",
    response_model=AvatarOptionsResponse,
    summary="アバターキャラクター一覧を取得",
)
async def list_avatar_options(settings: Settings = Depends(get_app_settings)) -> AvatarOptionsResponse:
    """アバターのメタデータを返す。"""

    avatars = [AvatarOptionSchema.from_dataclass(avatar) for avatar in list_avatars()]
    default_avatar_id = settings.avatar_default_character or (avatars[0].avatar_id if avatars else "")

    if avatars and default_avatar_id not in {avatar.avatar_id for avatar in avatars}:
        default_avatar_id = avatars[0].avatar_id

    return AvatarOptionsResponse(default_avatar_id=default_avatar_id, avatars=avatars)


_MULTIMODAL_LANGUAGE_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5-chat",
    "phi4-mini",
]


@router.get(
    "/languages",
    response_model=LanguageOptionsResponse,
    summary="入力音声の言語オプションを取得",
)
async def list_language_options() -> LanguageOptionsResponse:
    """Realtime モデルおよび Azure Speech の言語設定オプションを返却する。"""

    azure_modes = [LanguageModeSchema.from_dataclass(mode) for mode in list_azure_speech_language_modes()]
    azure_languages = [LanguageOptionSchema.from_dataclass(option) for option in list_azure_speech_languages()]

    realtime_model_entries: list[ModelLanguageSupportSchema] = [
        ModelLanguageSupportSchema.from_dataclass(profile) for profile in list_model_language_profiles()
    ]

    multimodal_languages = [
        LanguageOptionSchema.from_dataclass(option) for option in list_azure_speech_languages()
    ]
    for model_id in _MULTIMODAL_LANGUAGE_MODELS:
        realtime_model_entries.append(
            ModelLanguageSupportSchema(
                model_id=model_id,
                selection_mode="single",
                allow_auto_detect=True,
                languages=multimodal_languages,
            ),
        )

    azure_response = AzureSpeechLanguagesResponse(modes=azure_modes, languages=azure_languages)

    return LanguageOptionsResponse(azure_speech=azure_response, realtime_models=realtime_model_entries)
