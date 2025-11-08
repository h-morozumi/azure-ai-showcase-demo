"""Live Voice 関連 API ルーター。"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from json import JSONDecodeError
from typing import Any, List

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
    get_default_openai_voice_id,
    list_azure_voices,
    list_openai_voices,
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
from app.services.voice_live_session import (
    AvatarSelection,
    LiveVoiceSessionConfig,
    VoiceLiveSession,
    VoiceLiveSessionError,
)

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
    "/voices/openai",
    response_model=VoiceOptionsResponse,
    summary="OpenAI ボイス一覧を取得",
    dependencies=[Depends(verify_api_key)],
)
async def list_openai_voice_options() -> VoiceOptionsResponse:
    """OpenAI ボイスのメタデータを返す。"""

    voices = [VoiceOptionSchema.from_dataclass(voice) for voice in list_openai_voices()]
    default_voice_id = get_default_openai_voice_id() if voices else ""

    return VoiceOptionsResponse(provider="openai", default_voice_id=default_voice_id, voices=voices)


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

    print("=== WebSocket接続を受け付けました ===")
    logger.info("=== WebSocket接続を受け付けました ===")
    await websocket.accept()
    print("=== WebSocket accept完了 ===")
    logger.info("=== WebSocket accept完了 ===")
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
                    print(f"WebSocketテキストメッセージ受信: {data_text[:200]}")
                    logger.info("WebSocketテキストメッセージ受信: %s", data_text[:200])
                    try:
                        parsed = json.loads(data_text)
                        client_message = message_adapter.validate_python(parsed)
                        print(f"メッセージ解析成功: type={client_message.type}")
                        logger.info("メッセージ解析成功: type=%s", client_message.type)
                    except (JSONDecodeError, ValidationError) as error:
                        print(f"メッセージ解析エラー: {error}")
                        logger.error("メッセージ解析エラー: %s", error)
                        await _send_error(websocket, f"invalid payload: {error}")
                        continue

                    if client_message.type == "session.configure":
                        print("session.configure メッセージを受信")
                        logger.info("session.configure メッセージを受信")
                        if configured:
                            print("既に設定済みエラー")
                            await _send_error(websocket, "session already configured")
                            continue

                        try:
                            print(f"_build_session_config を呼び出します: payload={client_message.payload}")
                            config = _build_session_config(client_message.payload, settings)
                            print(f"config 作成完了: avatar={config.avatar}")
                            if config.avatar:
                                print(f"アバター有効: character={config.avatar.character}, style={config.avatar.style}")
                                logger.info("アバター機能を有効化してセッションを開始: avatar_character=%s, avatar_style=%s", 
                                          config.avatar.character, config.avatar.style)
                            print("session.open を呼び出します")
                            await session.open(config)
                            print("session.open 完了")
                        except VoiceLiveSessionError as error:
                            print(f"VoiceLiveSessionError: {error}")
                            logger.exception("voice live session open failed")
                            await _send_error(websocket, f"failed to open session: {error}")
                            break
                        except Exception as e:
                            print(f"予期しないエラー: {type(e).__name__}: {e}")
                            logger.exception("unexpected error during session open")
                            await _send_error(websocket, f"unexpected error: {e}")
                            break

                        print("イベントタスクを作成します")

                        event_task = asyncio.create_task(_relay_voice_live_events(session, websocket))
                        configured = True
                        await websocket.send_json({"type": "session.ready", "message": "Voice Live session established"})
                        continue

                    if client_message.type == "session.stop":
                        await websocket.send_json({"type": "session.log", "level": "info", "message": "session stop requested"})
                        break

                    if client_message.type == "avatar.answer":
                        if not configured:
                            await _send_error(websocket, "session not configured")
                            continue

                        try:
                            logger.info("アバターアンサーを送信: description_type=%s", 
                                      client_message.description_type or "answer")
                            await session.send_avatar_answer(
                                sdp=client_message.sdp,
                                description_type=client_message.description_type or "answer",
                            )
                            logger.info("アバターアンサー送信完了")
                        except Exception as error:
                            logger.exception("failed to send avatar answer")
                            await _send_error(websocket, f"failed to send avatar answer: {error}")
                        continue

                    if client_message.type == "avatar.ice_candidate":
                        if not configured:
                            await _send_error(websocket, "session not configured")
                            continue
                        # ICE candidate を記録（現在 Azure SDK では直接送信不要）
                        continue

                    if client_message.type == "avatar.client_offer":
                        if not configured:
                            await _send_error(websocket, "session not configured")
                            continue

                        try:
                            offer_sdp = client_message.payload.offer.sdp
                            
                            # Azure に offer を送信して answer を取得
                            answer = await session.request_avatar_answer(offer_sdp)
                            
                            # クライアントに answer を返す
                            await websocket.send_json({
                                "type": "session.event",
                                "event": "avatar.answer",
                                "data": {
                                    "answer": {
                                        "type": "answer",
                                        "sdp": answer
                                    }
                                }
                            })
                        except VoiceLiveSessionError as error:
                            logger.exception("avatar client offer processing failed")
                            await _send_error(websocket, f"avatar offer processing failed: {error}")
                        except Exception as error:
                            logger.exception("unexpected error processing avatar offer")
                            await _send_error(websocket, f"unexpected error: {error}")
                        continue

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
    print("=== _relay_voice_live_events 開始 ===")
    print(f"ServerEventType のすべてのメンバー: {[e.name for e in ServerEventType]}")
    audio_chunk_count = 0
    total_audio_bytes = 0
    async for event in session.iter_events():
        event_type = event.type
        event_name = getattr(event_type, "name", str(event_type)).upper()
        
        # 生のイベントタイプ文字列をチェック（小文字ドット区切り形式）
        raw_event_type = str(event.type) if hasattr(event, "type") else None
        if raw_event_type == "session.avatar.connecting":
            # Base64デコードされたserver_sdpを取得
            server_sdp_raw = getattr(event, "server_sdp", None)
            
            if server_sdp_raw:
                # VoiceLiveSession の _decode_server_sdp を使用
                from app.services.voice_live_session import VoiceLiveSession, AvatarAnswerEvent
                decoded_sdp = VoiceLiveSession._decode_server_sdp(server_sdp_raw)
                
                if decoded_sdp:
                    try:
                        session._avatar_answer_queue.put_nowait(
                            AvatarAnswerEvent(sdp=decoded_sdp, description_type="answer")
                        )
                    except Exception as e:
                        print(f"Error adding avatar answer to queue: {e}")
            continue

        if event_type == ServerEventType.RESPONSE_AUDIO_DELTA and hasattr(event, "delta"):
            audio_chunk_count += 1
            chunk_size = len(event.delta)
            total_audio_bytes += chunk_size
            if audio_chunk_count == 1:
                logger.info("音声データの受信を開始")
            elif audio_chunk_count % 50 == 0:
                logger.info("音声データ受信中: %dチャンク, 合計%dバイト", audio_chunk_count, total_audio_bytes)
            
            try:
                await websocket.send_bytes(event.delta)
                if audio_chunk_count == 1:
                    logger.info("最初の音声チャンクをクライアントに送信: %dバイト", chunk_size)
            except Exception as e:
                logger.error("音声データの送信に失敗: %s", e)
            continue

        if event_type == ServerEventType.SESSION_UPDATED:
            print(f"=== SESSION.UPDATED イベント受信 ===")
            session_obj = getattr(event, "session", None)
            print(f"session_obj: {session_obj}")
            print(f"session_obj の属性: {dir(session_obj) if session_obj else 'None'}")
            session_id = getattr(session_obj, "id", None)
            print(f"session_id: {session_id}")
            
            # modalitiesをチェック
            modalities = getattr(session_obj, "modalities", None)
            print(f"modalities: {modalities}")
            
            avatar_payload = _serialize_session_avatar(session_obj)
            print(f"avatar_payload: {avatar_payload}")
            logger.info("セッション更新イベント: session_id=%s, avatar=%s, modalities=%s", 
                       session_id, "有効" if avatar_payload else "無効", modalities)
            data: dict[str, Any] = {"sessionId": session_id}
            if avatar_payload:
                data["avatar"] = avatar_payload
                logger.info("アバター設定: %s", avatar_payload)
            await websocket.send_json({
                "type": "session.event",
                "event": "session.updated",
                "data": data,
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

        # SESSION_AVATAR_CONNECTING イベント - ここに answer が含まれる可能性
        if event_name == "SESSION_AVATAR_CONNECTING":
            print(f"=== SESSION_AVATAR_CONNECTING イベント受信 ===")
            print(f"event: {event}")
            print(f"event attributes: {dir(event)}")
            print(f"event as_dict: {event.as_dict() if hasattr(event, 'as_dict') else 'N/A'}")
            
            # answer が含まれているか確認
            answer_data = getattr(event, "answer", None)
            if answer_data:
                print(f"answer found in SESSION_AVATAR_CONNECTING!")
                answer_sdp = getattr(answer_data, "sdp", None)
                answer_type = getattr(answer_data, "type", "answer")
                print(f"answer SDP length: {len(answer_sdp) if answer_sdp else 0}")
                
                if answer_sdp:
                    from app.services.voice_live_session import AvatarAnswerEvent
                    try:
                        session._avatar_answer_queue.put_nowait(
                            AvatarAnswerEvent(sdp=answer_sdp, description_type=answer_type)
                        )
                        print("SESSION_AVATAR_CONNECTING から avatar.answer をキューに追加しました")
                    except Exception as e:
                        print(f"キューへの追加失敗: {e}")
            continue

        if event_name == "AVATAR_WEBRTC_OFFER":
            offer_payload = _serialize_sdp_description(getattr(event, "offer", None))
            ice_servers = _serialize_ice_servers(getattr(event, "ice_servers", None))
            logger.info("アバターWebRTCオファーを受信: ice_servers=%d個", len(ice_servers) if ice_servers else 0)
            if ice_servers:
                logger.info("ICEサーバ: %s", ice_servers)
            await websocket.send_json({
                "type": "session.event",
                "event": "avatar.offer",
                "data": {"offer": offer_payload, "iceServers": ice_servers},
            })
            continue

        if event_name == "AVATAR_WEBRTC_ANSWER" or event_name == "AVATAR.ANSWER":
            print(f"=== AVATAR_ANSWER イベント受信 ===")
            print(f"event: {event}")
            print(f"event attributes: {dir(event)}")
            
            # イベントから answer を取得
            answer_data = getattr(event, "answer", None)
            print(f"answer_data: {answer_data}")
            
            if answer_data:
                answer_sdp = getattr(answer_data, "sdp", None)
                answer_type = getattr(answer_data, "type", "answer")
                print(f"answer SDP length: {len(answer_sdp) if answer_sdp else 0}")
                
                if answer_sdp:
                    # キューに入れる
                    from app.services.voice_live_session import AvatarAnswerEvent
                    try:
                        session._avatar_answer_queue.put_nowait(
                            AvatarAnswerEvent(sdp=answer_sdp, description_type=answer_type)
                        )
                        print("avatar.answer をキューに追加しました")
                    except Exception as e:
                        print(f"キューへの追加失敗: {e}")
            continue

        # 未知のアバターイベントをキャッチ
        if "AVATAR" in event_name.upper() and event_name not in ["AVATAR_WEBRTC_OFFER", "AVATAR_WEBRTC_ANSWER", "AVATAR.ANSWER", "AVATAR_WEBRTC_ICE_CANDIDATE"]:
            print(f"=== 未知のアバターイベント: {event_name} ===")
            print(f"event attributes: {dir(event)}")
            if hasattr(event, "as_dict"):
                try:
                    print(f"event dict: {event.as_dict()}")
                except Exception as e:
                    print(f"as_dict() エラー: {e}")

        if event_name == "AVATAR_WEBRTC_ICE_CANDIDATE":
            candidate_payload = _serialize_ice_candidate(getattr(event, "candidate", None))
            if candidate_payload:
                logger.info("アバターICE候補を受信: candidate=%s", candidate_payload.get("candidate", ""))
                await websocket.send_json({
                    "type": "session.event",
                    "event": "avatar.ice_candidate",
                    "data": candidate_payload,
                })
            continue

        if event_name in {"AVATAR_STREAM_STARTED", "AVATAR_STREAM_STOPPED", "AVATAR_READY"}:
            logger.info("アバターイベント受信: %s", event_name)
            await websocket.send_json({
                "type": "session.event",
                "event": "avatar." + event_name.lower().replace("avatar_", ""),
            })
            continue

        logger.debug("Unhandled Voice Live event: %s", event_type)


async def _send_error(websocket: WebSocket, message: str) -> None:
    await websocket.send_json({"type": "session.error", "message": message})


def _build_session_config(payload: LiveVoiceSessionConfigPayload, settings: Settings) -> LiveVoiceSessionConfig:
    print(f"=== _build_session_config 開始: payload.avatar_id={payload.avatar_id} ===")
    phrase_list = payload.phrase_list or []
    
    print(f"セッション設定を構築: model_id={payload.model_id}, avatar_id={payload.avatar_id or '(なし)'}")
    logger.info("セッション設定を構築: model_id=%s, avatar_id=%s", payload.model_id, payload.avatar_id or "(なし)")

    avatar_selection = _resolve_avatar_selection(payload.avatar_id, settings=settings)
    print(f"avatar_selection の結果: {avatar_selection}")
    if avatar_selection:
        print(f"アバター選択を解決: character={avatar_selection.character}, style={avatar_selection.style}")
        logger.info("アバター選択を解決: character=%s, style=%s", avatar_selection.character, avatar_selection.style)
    else:
        logger.info("アバターなしでセッションを構築")

    return LiveVoiceSessionConfig(
        model_id=payload.model_id,
        voice_id=payload.voice_id or "verse",
        instructions=payload.instructions,
        language=payload.language,
        phrase_list=phrase_list,
        semantic_vad=payload.semantic_vad,
        enable_eou=payload.enable_eou,
        agent_id=payload.agent_id,
        custom_speech_endpoint=payload.custom_speech_endpoint,
        avatar=avatar_selection,
    )


def _resolve_avatar_selection(avatar_id: str | None, *, settings: Settings) -> AvatarSelection | None:
    logger.info("アバター選択を解決中: avatar_id=%s", avatar_id or "(なし)")
    
    if not avatar_id:
        default_id = settings.avatar_default_character
        avatar_id = default_id if default_id else None
        if avatar_id:
            logger.info("デフォルトアバターを使用: %s", avatar_id)

    if not avatar_id:
        logger.info("アバターIDが指定されていません")
        return None

    available_avatars = list_avatars()
    logger.info("利用可能なアバター: %s", [a.avatar_id for a in available_avatars])
    
    for option in available_avatars:
        if option.avatar_id == avatar_id:
            logger.info("アバターが見つかりました: %s (character=%s, style=%s)", 
                       avatar_id, option.character, option.style)
            return AvatarSelection(character=option.character, style=option.style)

    logger.warning("指定されたアバターID '%s' が見つかりませんでした", avatar_id)
    return None


def _serialize_session_avatar(session_obj: Any) -> dict[str, Any] | None:
    if session_obj is None:
        logger.warning("_serialize_session_avatar: session_obj が None です")
        return None

    avatar_obj = getattr(session_obj, "avatar", None)
    if avatar_obj is None:
        logger.warning("_serialize_session_avatar: session_obj に avatar 属性がありません")
        logger.info("session_obj の属性: %s", dir(session_obj))
        return None

    logger.info("_serialize_session_avatar: avatar_obj を取得しました")
    
    payload: dict[str, Any] = {}
    for attr in ("id", "character", "style", "state"):
        value = getattr(avatar_obj, attr, None)
        if value:
            payload[attr] = value
            logger.info("avatar 属性 %s = %s", attr, value)

    ice_servers = _serialize_ice_servers(getattr(avatar_obj, "ice_servers", None))
    if ice_servers:
        payload["iceServers"] = ice_servers

    offer_payload = _serialize_sdp_description(getattr(avatar_obj, "offer", None))
    if offer_payload:
        payload["offer"] = offer_payload

    video_obj = getattr(avatar_obj, "video", None)
    if video_obj:
        video_payload = {}
        for attr in ("width", "height", "frame_rate", "bitrate"):
            key = "frameRate" if attr == "frame_rate" else attr
            value = getattr(video_obj, attr, None)
            if value:
                video_payload[key] = value
        if video_payload:
            payload["video"] = video_payload

    return payload or None


def _serialize_ice_servers(ice_servers_obj: Any) -> list[dict[str, Any]]:
    if not ice_servers_obj:
        return []

    serialized: list[dict[str, Any]] = []
    for server in ice_servers_obj:
        if server is None:
            continue

        urls_attr = getattr(server, "urls", None) or getattr(server, "url", None)
        if isinstance(urls_attr, (list, tuple)):
            urls = [str(item) for item in urls_attr if item]
        elif urls_attr:
            urls = [str(urls_attr)]
        else:
            urls = []

        entry: dict[str, Any] = {"urls": urls}
        username = getattr(server, "username", None)
        if username:
            entry["username"] = username
        credential = getattr(server, "credential", None) or getattr(server, "password", None)
        if credential:
            entry["credential"] = credential
        serialized.append(entry)

    return serialized


def _serialize_sdp_description(description_obj: Any) -> dict[str, Any] | None:
    if description_obj is None:
        return None

    sdp = getattr(description_obj, "sdp", None) or getattr(description_obj, "session_description", None)
    if not sdp:
        return None

    description_type = getattr(description_obj, "type", None) or "offer"
    return {"type": description_type, "sdp": sdp}


def _serialize_ice_candidate(candidate_obj: Any) -> dict[str, Any] | None:
    if candidate_obj is None:
        return None

    candidate_value = getattr(candidate_obj, "candidate", None) or getattr(candidate_obj, "value", None)
    if not candidate_value:
        return None

    payload: dict[str, Any] = {"candidate": candidate_value}
    sdp_mid = getattr(candidate_obj, "sdp_mid", None) or getattr(candidate_obj, "sdpMid", None)
    if sdp_mid is not None:
        payload["sdpMid"] = sdp_mid
    sdp_m_line = getattr(candidate_obj, "sdp_m_line_index", None) or getattr(candidate_obj, "sdpMLineIndex", None)
    if sdp_m_line is not None:
        payload["sdpMLineIndex"] = sdp_m_line
    return payload
