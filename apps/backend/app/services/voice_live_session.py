"""Voice Live API とのリアルタイムセッション管理ユーティリティ。"""

from __future__ import annotations

import asyncio
import base64
import datetime as dt
import json
import logging
from contextlib import AsyncExitStack
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, Iterable, Optional, Sequence, TYPE_CHECKING

from azure.ai.voicelive.aio import connect
from azure.ai.voicelive.models import (
    AzureStandardVoice,
    InputAudioFormat,
    Modality,
    OutputAudioFormat,
    RequestSession,
    ServerVad,
)
from azure.core.credentials import AzureKeyCredential, TokenCredential
from azure.identity import DefaultAzureCredential

from app.core.config import Settings

if TYPE_CHECKING:
    from azure.ai.voicelive.aio import VoiceLiveConnection
    from azure.ai.voicelive.models import ServerEvent


@dataclass(slots=True)
class AvatarSelection:
    """アバター選択情報。"""

    character: str
    style: Optional[str] = None


@dataclass(slots=True)
class AvatarAnswerEvent:
    """Avatar answer イベントデータ。"""

    sdp: str
    description_type: str = "answer"


@dataclass(slots=True)
class LiveVoiceSessionConfig:
    """Live Voice セッションの初期構成。"""

    model_id: str
    voice_id: str
    instructions: Optional[str] = None
    language: Optional[str] = None
    phrase_list: Optional[Sequence[str]] = None
    semantic_vad: str = "azure_semantic_vad"
    enable_eou: bool = True
    agent_id: Optional[str] = None
    custom_speech_endpoint: Optional[str] = None
    avatar: Optional[AvatarSelection] = None


class VoiceLiveSessionError(RuntimeError):
    """Voice Live セッション関連の例外。"""


class VoiceLiveSession:
    """Azure Voice Live API との接続を管理するヘルパークラス。"""

    def __init__(self, settings: Settings, *, logger: Optional[logging.Logger] = None) -> None:
        self._settings = settings
        self._logger = logger or logging.getLogger("app.voice_live_session")
        self._exit_stack = AsyncExitStack()
        self._connection: Optional["VoiceLiveConnection"] = None
        self._credential: Optional[TokenCredential | AzureKeyCredential] = None
        self._send_lock = asyncio.Lock()
        self._avatar_answer_queue: asyncio.Queue[AvatarAnswerEvent] = asyncio.Queue(maxsize=1)

    @staticmethod
    def _encode_client_sdp(client_sdp: str) -> str:
        """クライアント SDP を Base64 エンコードする（サンプルと同じ形式）。"""
        payload = json.dumps({"type": "offer", "sdp": client_sdp})
        return base64.b64encode(payload.encode("utf-8")).decode("ascii")

    @staticmethod
    def _decode_server_sdp(server_sdp_raw: Optional[str]) -> Optional[str]:
        """サーバー SDP を Base64 デコードする（サンプルと同じロジック）。"""
        if not server_sdp_raw:
            return None
        # 生の SDP（v=0 で始まる）ならそのまま返す
        if server_sdp_raw.startswith("v=0"):
            return server_sdp_raw
        try:
            decoded_bytes = base64.b64decode(server_sdp_raw)
        except Exception:
            return server_sdp_raw
        try:
            decoded_text = decoded_bytes.decode("utf-8")
        except Exception:
            return server_sdp_raw
        try:
            payload = json.loads(decoded_text)
        except json.JSONDecodeError:
            return decoded_text
        if isinstance(payload, dict):
            sdp_value = payload.get("sdp")
            if isinstance(sdp_value, str) and sdp_value:
                return sdp_value
        return decoded_text

    @staticmethod
    def _generate_event_id(prefix: str = "evt_") -> str:
        """イベント ID を生成する（サンプルと同じ）。"""
        return f"{prefix}{int(dt.datetime.utcnow().timestamp() * 1000)}"

    async def open(self, config: LiveVoiceSessionConfig) -> None:
        """Live Voice API へ接続しセッションを初期化する。"""

        print(f"=== VoiceLiveSession.open 開始: avatar={config.avatar} ===")
        if self._connection is not None:
            raise VoiceLiveSessionError("session already open")

        credential = self._resolve_credential()
        endpoint = self._settings.voice_live_endpoint
        print(f"Voice Live APIへ接続: endpoint={endpoint}, model={config.model_id}")
        self._logger.info("Voice Live APIへ接続開始: endpoint=%s, model=%s", endpoint, config.model_id)
        connection_ctx = connect(
            endpoint=endpoint,
            credential=credential,
            model=config.model_id,
            connection_options={
                "max_msg_size": 10 * 1024 * 1024,
                "heartbeat": 20,
                "timeout": 30,
            },
        )

        try:
            self._connection = await self._exit_stack.enter_async_context(connection_ctx)
            print("Voice Live API接続成功")
            self._logger.info("Voice Live API接続成功")
        except Exception as error:  # noqa: BLE001
            await self._exit_stack.aclose()
            print(f"Voice Live API接続失敗: {error}")
            self._logger.error("Voice Live API接続失敗: %s", error)
            raise VoiceLiveSessionError(f"failed to connect Voice Live endpoint: {error}") from error

        print("_configure_session を呼び出します")
        await self._configure_session(config)
        print("_configure_session 完了")
        self._logger.info("セッション設定完了")
        
        # アバターが有効な場合、session リソースを確認
        if config.avatar:
            print("=== session リソースを確認 ===")
            session_resource = self._connection.session
            print(f"session リソースの型: {type(session_resource)}")
            print(f"session リソースの属性: {dir(session_resource)}")
            
            # session リソースのパブリック属性/メソッドを確認
            print("session リソースのパブリック属性:")
            for attr in dir(session_resource):
                if not attr.startswith('_'):
                    try:
                        value = getattr(session_resource, attr)
                        print(f"  {attr}: {type(value)}")
                    except Exception as e:
                        print(f"  {attr}: アクセス失敗 ({e})")
            
            # avatar 属性があるか確認
            if hasattr(session_resource, "avatar"):
                print("session.avatar が存在します")
                avatar_obj = session_resource.avatar
                print(f"session.avatar の型: {type(avatar_obj)}")
                print(f"session.avatar の属性: {dir(avatar_obj)}")
                
                # offer メソッドを探す
                for attr in ["offer", "get_offer", "webrtc_offer", "create_offer"]:
                    if hasattr(avatar_obj, attr):
                        print(f"avatar.{attr} メソッドが見つかりました")
                        try:
                            method = getattr(avatar_obj, attr)
                            print(f"メソッドを呼び出します: {method}")
                            result = await method()
                            print(f"結果: {result}")
                        except Exception as e:
                            print(f"avatar.{attr} の呼び出しに失敗: {e}")
            else:
                print("session.avatar は存在しません")

    async def close(self) -> None:
        """接続をクローズしリソースを解放する。"""

        self._logger.info("セッションのクローズを開始")
        credential = self._credential
        try:
            await self._exit_stack.aclose()
            self._logger.info("セッションのクローズ完了")
        finally:
            if credential is not None:
                close_method = getattr(credential, "close", None)
                if callable(close_method):
                    try:
                        maybe_coro = close_method()
                        if asyncio.iscoroutine(maybe_coro):
                            await maybe_coro
                    except Exception as error:  # noqa: BLE001
                        self._logger.debug("credential close failed: %s", error)
            self._connection = None
            self._credential = None

    def iter_events(self) -> AsyncIterator["ServerEvent"]:
        """Voice Live からのイベントストリームを返す。"""

        connection = self._ensure_connection()
        return connection

    async def send_audio_chunk(self, chunk: bytes) -> None:
        """エンコード済み音声を送信する。"""

        if not chunk:
            return

        connection = self._ensure_connection()
        encoded = base64.b64encode(chunk).decode("ascii")
        async with self._send_lock:
            await connection.input_audio_buffer.append(audio=encoded)

    async def cancel_response(self) -> None:
        """アシスタントの現在の出力をキャンセルする。"""

        connection = self._ensure_connection()
        try:
            await connection.response.cancel()
        except Exception as error:  # noqa: BLE001
            self._logger.debug("response cancellation failed: %s", error)

    async def send_avatar_answer(self, *, sdp: str, description_type: str = "answer") -> None:
        """アバター用 WebRTC SDP アンサーを送信する。"""

        connection = self._ensure_connection()
        avatar_channel = getattr(connection, "avatar", None)
        if avatar_channel is None:
            raise VoiceLiveSessionError("avatar channel is not available")

        payload = {"type": description_type or "answer", "sdp": sdp}
        await avatar_channel.answer(payload)

    async def request_avatar_answer(self, offer_sdp: str) -> str:
        """SDK内部のWebSocketから直接 session.avatar.connect を送信してアバターanswerを取得する。
        
        Args:
            offer_sdp: クライアントが作成した SDP offer
            
        Returns:
            str: Azure が生成した SDP answer
            
        Raises:
            VoiceLiveSessionError: 接続が無い、またはタイムアウト
        """
        connection = self._ensure_connection()
        
        # SDK内部のWebSocketを取得
        raw_ws = getattr(connection, "_connection", None)
        if raw_ws is None:
            raise VoiceLiveSessionError("Cannot access internal WebSocket (_connection) from SDK")
        
        # サンプルと同じ形式でSDPをBase64エンコード
        encoded_sdp = self._encode_client_sdp(offer_sdp)
        
        # サンプルと同じメッセージ形式で送信
        message = {
            "event_id": self._generate_event_id(),
            "type": "session.avatar.connect",
            "client_sdp": encoded_sdp,
            "rtc_configuration": {"bundle_policy": "max-bundle"},
        }
        
        # 生のWebSocketで送信 (aiohttp uses send_str() not send())
        try:
            message_str = json.dumps(message)
            await raw_ws.send_str(message_str)
        except Exception as e:
            raise VoiceLiveSessionError(f"Failed to send avatar connect message: {e}") from e
        
        # session.avatar.connecting イベントを待機（キュー経由）
        try:
            answer_event = await asyncio.wait_for(
                self._avatar_answer_queue.get(),
                timeout=60.0
            )
            return answer_event.sdp
        except asyncio.TimeoutError:
            print("タイムアウト: 60秒待機しましたが session.avatar.connecting イベントが届きませんでした")
            raise VoiceLiveSessionError(
                "Timeout waiting for avatar answer (session.avatar.connecting event not received)"
            )

    async def send_avatar_ice_candidate(
        self,
        *,
        candidate: str,
        sdp_mid: Optional[str],
        sdp_m_line_index: Optional[int],
    ) -> None:
        """アバター用 ICE Candidate を送信する。"""

        connection = self._ensure_connection()
        avatar_channel = getattr(connection, "avatar", None)
        if avatar_channel is None:
            raise VoiceLiveSessionError("avatar channel is not available")

        payload = {
            "candidate": candidate,
            "sdp_mid": sdp_mid,
            "sdp_m_line_index": sdp_m_line_index,
        }

        await _invoke_avatar_method(
            avatar_channel,
            (
                ("add_ice_candidate", payload),
                ("add_ice_candidate", {"__call_args__": (payload,)}),
                ("ice_candidate", {"candidate": payload}),
                ("send_ice_candidate", {"candidate": payload}),
            ),
            logger=self._logger,
        )

    async def _configure_session(self, config: LiveVoiceSessionConfig) -> None:
        connection = self._ensure_connection()
        voice_payload = self._resolve_voice(config.voice_id)
        turn_detection = self._resolve_turn_detection(config)

        modalities: list[Modality] = [Modality.TEXT, Modality.AUDIO]
        if config.avatar:
            modalities.append(Modality.AVATAR)
            self._logger.info("アバターモードを有効化: character=%s, style=%s", 
                            config.avatar.character, config.avatar.style)
        
        self._logger.info("設定するモダリティ: %s", [str(m) for m in modalities])

        session_config = RequestSession(
            modalities=modalities,
            instructions=(config.instructions or "").strip(),
            voice=voice_payload,
            input_audio_format=InputAudioFormat.PCM16,
            output_audio_format=OutputAudioFormat.PCM16,
            turn_detection=turn_detection,
        )
        
        self._logger.info("RequestSession 作成完了: modalities=%s", 
                         getattr(session_config, 'modalities', 'N/A'))

        if config.avatar:
            avatar_payload: dict[str, str] = {"character": config.avatar.character}
            if config.avatar.style:
                avatar_payload["style"] = config.avatar.style
            self._logger.info("アバター設定ペイロードを作成: %s", avatar_payload)
            if hasattr(session_config, "avatar"):
                setattr(session_config, "avatar", avatar_payload)
                self._logger.info("アバター設定を適用しました: %s", avatar_payload)
                self._logger.info("適用後の session_config.avatar: %s", 
                                getattr(session_config, "avatar", "N/A"))
            else:
                self._logger.warning("現在のSDKバージョンはavatar設定をサポートしていません")

        # オプション項目は SDK のバージョン差異に備えて存在確認を行う
        if config.language:
            if hasattr(session_config, "language"):
                setattr(session_config, "language", config.language)
            elif hasattr(session_config, "input_audio_language"):
                setattr(session_config, "input_audio_language", config.language)
            else:
                self._logger.debug("language field is not supported by current SDK")

        if config.phrase_list:
            phrases = [item for item in _normalize_phrase_list(config.phrase_list) if item]
            if phrases and hasattr(session_config, "speech_recognition"):
                speech_section = getattr(session_config, "speech_recognition")
                if speech_section and hasattr(speech_section, "phrases"):
                    setattr(speech_section, "phrases", phrases)
                else:
                    self._logger.debug("phrase list is not supported by current SDK")

        print(f"session.update を呼び出します: modalities={getattr(session_config, 'modalities', 'N/A')}, avatar={getattr(session_config, 'avatar', 'N/A')}")
        self._logger.info("session.update を呼び出します: modalities=%s, avatar=%s",
                         getattr(session_config, 'modalities', 'N/A'),
                         getattr(session_config, 'avatar', 'N/A'))
        await connection.session.update(session=session_config)
        print("session.update が完了しました")
        self._logger.info("session.update が完了しました")

    def _resolve_credential(self) -> TokenCredential | AzureKeyCredential:
        if self._credential:
            return self._credential

        if self._settings.voice_live_api_key:
            credential = AzureKeyCredential(self._settings.voice_live_api_key)
            self._credential = credential
            return credential

        credential = DefaultAzureCredential(exclude_interactive_browser_credential=False)
        self._credential = credential
        return credential

    def _ensure_connection(self) -> "VoiceLiveConnection":
        if self._connection is None:
            raise VoiceLiveSessionError("session is not connected")
        return self._connection

    @staticmethod
    def _resolve_voice(voice_id: str) -> AzureStandardVoice | str:
        normalized = voice_id.strip()
        if not normalized:
            return "alloy"
        if "-" in normalized:
            return AzureStandardVoice(name=normalized, type="azure-standard")
        return normalized

    @staticmethod
    def _resolve_turn_detection(config: LiveVoiceSessionConfig) -> Optional[ServerVad]:
        if not config.enable_eou:
            return None

        threshold = 0.5
        silence_ms = 500
        if config.semantic_vad == "semantic_vad":
            threshold = 0.45
            silence_ms = 400
        return ServerVad(threshold=threshold, prefix_padding_ms=300, silence_duration_ms=silence_ms)


def _normalize_phrase_list(values: Iterable[str]) -> list[str]:
    """重複を排除しつつ語句ブーストの候補を整形する。"""

    normalized: list[str] = []
    seen: set[str] = set()
    for value in values:
        raw = value.strip()
        if not raw:
            continue
        key = raw.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(raw)
    return normalized


async def _invoke_avatar_method(
    avatar_channel: object,
    candidates: Sequence[tuple[str, object]],
    *,
    logger: logging.Logger,
) -> None:
    """Avatar チャネルの API 呼び出しを互換性を考慮しつつ実行する。"""

    last_error: Exception | None = None
    for method_name, payload in candidates:
        method = getattr(avatar_channel, method_name, None)
        if method is None or not callable(method):
            continue

        call_args: tuple[object, ...]
        call_kwargs: dict[str, object]
        if isinstance(payload, dict) and "__call_args__" in payload:
            raw_args = payload.get("__call_args__", ())
            if not isinstance(raw_args, Sequence):  # type: ignore[arg-type]
                raise VoiceLiveSessionError("__call_args__ must be a sequence")
            call_args = tuple(raw_args)  # type: ignore[arg-type]

            raw_kwargs = payload.get("__call_kwargs__", {})
            if not isinstance(raw_kwargs, dict):
                raise VoiceLiveSessionError("__call_kwargs__ must be a mapping")
            call_kwargs = dict(raw_kwargs)
        elif isinstance(payload, dict):
            call_args = ()
            call_kwargs = dict(payload)
        else:
            call_args = (payload,)
            call_kwargs = {}

        try:
            result = method(*call_args, **call_kwargs)
        except Exception as error:  # noqa: BLE001
            last_error = error
            continue

        if asyncio.iscoroutine(result):
            try:
                await result
                return
            except Exception as error:  # noqa: BLE001
                last_error = error
                continue
        return

    if last_error is not None:
        logger.debug("avatar method invocation failed: %s", last_error)
        raise VoiceLiveSessionError(f"avatar method {candidates[0][0]} is not supported") from last_error

    raise VoiceLiveSessionError("avatar operation is not supported by current SDK")
