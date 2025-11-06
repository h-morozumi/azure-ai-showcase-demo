"""Live Voice 関連 API ルーター。"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from json import JSONDecodeError
from typing import List

from azure.ai.voicelive.models import ServerEventType
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import TypeAdapter, ValidationError
from starlette.websockets import WebSocketState

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
from app.schemas.realtime import (
    LiveVoiceSessionClientMessage,
    LiveVoiceSessionConfigPayload,
)
from app.services.voice_live_session import LiveVoiceSessionConfig, VoiceLiveSession, VoiceLiveSessionError

logger = logging.getLogger("app.api.realtime")

router = APIRouter(
    prefix="/api/v1/realtime",
    tags=["realtime"],
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


@router.get(
    "/models",
    response_model=RealtimeModelsResponse,
    summary="利用可能な Live Voice モデル一覧を取得",
    dependencies=[Depends(verify_api_key)],
)
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
    dependencies=[Depends(verify_api_key)],
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
    dependencies=[Depends(verify_api_key)],
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
    dependencies=[Depends(verify_api_key)],
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


@router.websocket("/session")
async def establish_realtime_session(websocket: WebSocket, settings: Settings = Depends(get_app_settings)) -> None:
    """Live Voice と接続するための WebSocket エンドポイント。"""

    await websocket.accept()
    try:
        provided_key = _extract_api_key(websocket)
        await verify_api_key(provided_key=provided_key, settings=settings)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid API key")
        return

    session = VoiceLiveSession(settings)
    message_adapter = TypeAdapter(LiveVoiceSessionClientMessage)

    event_task: asyncio.Task[None] | None = None
    configured = False

    try:
        await websocket.send_json({"type": "session.log", "level": "info", "message": "WebSocket handshake completed"})

        while True:
            message = await websocket.receive()
            message_type = message.get("type")

            if message_type == "websocket.disconnect":
                break

            if message_type == "websocket.receive":
                data_text = message.get("text")
                data_bytes = message.get("bytes")

                if data_text is not None:
                    try:
                        parsed = json.loads(data_text)
                        client_message = message_adapter.validate_python(parsed)
                    except (JSONDecodeError, ValidationError) as error:
                        await _send_error(websocket, f"invalid payload: {error}")
                        continue

                    if client_message.type == "session.configure":
                        if configured:
                            await _send_error(websocket, "session already configured")
                            continue

                        try:
                            config = _build_session_config(client_message.payload, settings)
                            await session.open(config)
                        except VoiceLiveSessionError as error:
                            logger.exception("voice live session open failed")
                            await _send_error(websocket, f"failed to open session: {error}")
                            break

                        event_task = asyncio.create_task(_relay_voice_live_events(session, websocket))
                        configured = True
                        await websocket.send_json({"type": "session.ready", "message": "Voice Live session established"})
                        continue

                    if client_message.type == "session.stop":
                        await websocket.send_json({"type": "session.log", "level": "info", "message": "session stop requested"})
                        break

                if data_bytes is not None:
                    if not configured:
                        await _send_error(websocket, "session not configured")
                        continue

                    try:
                        await session.send_audio_chunk(data_bytes)
                    except VoiceLiveSessionError as error:
                        logger.exception("voice live audio send failed")
                        await _send_error(websocket, f"audio send failed: {error}")
                        break

            else:
                logger.debug("Unhandled websocket event: %s", message_type)

    except WebSocketDisconnect:
        logger.debug("client disconnected")
    except Exception as error:  # noqa: BLE001
        logger.exception("unexpected error during websocket session: %s", error)
        if websocket.client_state == WebSocketState.CONNECTED:
            await _send_error(websocket, f"internal server error: {error}")
    finally:
        if event_task is not None:
            event_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await event_task
        await session.close()
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.close(code=status.WS_1000_NORMAL_CLOSURE)
        except RuntimeError as error:
            if "Cannot call \"send\" once a close message has been sent" not in str(error):
                logger.debug("websocket close raised runtime error: %s", error)


def _extract_api_key(websocket: WebSocket) -> str | None:
    header_key = websocket.headers.get("x-app-api-key")
    if header_key:
        return header_key
    query_key = websocket.query_params.get("api_key") or websocket.query_params.get("x-app-api-key")
    return query_key


async def _relay_voice_live_events(session: VoiceLiveSession, websocket: WebSocket) -> None:
    async for event in session.iter_events():
        event_type = event.type

        if event_type == ServerEventType.RESPONSE_AUDIO_DELTA and hasattr(event, "delta"):
            await websocket.send_bytes(event.delta)
            continue

        if event_type == ServerEventType.SESSION_UPDATED:
            session_id = getattr(getattr(event, "session", None), "id", None)
            await websocket.send_json({
                "type": "session.event",
                "event": "session.updated",
                "data": {"sessionId": session_id},
            })
            continue

        if event_type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STARTED:
            await websocket.send_json({"type": "session.event", "event": "input.speech_started"})
            continue

        if event_type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STOPPED:
            await websocket.send_json({"type": "session.event", "event": "input.speech_stopped"})
            continue

        if event_type == ServerEventType.RESPONSE_AUDIO_DONE:
            await websocket.send_json({"type": "session.event", "event": "response.audio_done"})
            continue

        if event_type == ServerEventType.RESPONSE_DONE:
            await websocket.send_json({"type": "session.event", "event": "response.done"})
            continue

        if event_type == ServerEventType.ERROR:
            detail = getattr(getattr(event, "error", None), "message", "Voice Live error")
            await websocket.send_json({"type": "session.error", "message": detail})
            continue

        if event_type == ServerEventType.CONVERSATION_ITEM_CREATED:
            item_id = getattr(getattr(event, "item", None), "id", None)
            await websocket.send_json({
                "type": "session.event",
                "event": "conversation.item_created",
                "data": {"itemId": item_id},
            })
            continue

        logger.debug("Unhandled Voice Live event: %s", event_type)


async def _send_error(websocket: WebSocket, message: str) -> None:
    await websocket.send_json({"type": "session.error", "message": message})


def _build_session_config(payload: LiveVoiceSessionConfigPayload, settings: Settings) -> LiveVoiceSessionConfig:
    phrase_list = payload.phrase_list or []

    return LiveVoiceSessionConfig(
        model_id=payload.model_id,
        voice_id=payload.voice_id or "alloy",
        instructions=payload.instructions,
        language=payload.language,
        phrase_list=phrase_list,
        semantic_vad=payload.semantic_vad,
        enable_eou=payload.enable_eou,
        agent_id=payload.agent_id,
        custom_speech_endpoint=payload.custom_speech_endpoint,
        avatar_id=payload.avatar_id,
    )
