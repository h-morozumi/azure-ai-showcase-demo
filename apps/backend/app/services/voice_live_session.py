"""Voice Live API とのリアルタイムセッション管理ユーティリティ。"""

from __future__ import annotations

import asyncio
import base64
import logging
from contextlib import AsyncExitStack
from dataclasses import dataclass
from typing import AsyncIterator, Iterable, Optional, Sequence, TYPE_CHECKING

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
    avatar_id: Optional[str] = None


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

    async def open(self, config: LiveVoiceSessionConfig) -> None:
        """Live Voice API へ接続しセッションを初期化する。"""

        if self._connection is not None:
            raise VoiceLiveSessionError("session already open")

        credential = self._resolve_credential()
        endpoint = self._settings.voice_live_endpoint
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
        except Exception as error:  # noqa: BLE001
            await self._exit_stack.aclose()
            raise VoiceLiveSessionError(f"failed to connect Voice Live endpoint: {error}") from error

        await self._configure_session(config)

    async def close(self) -> None:
        """接続をクローズしリソースを解放する。"""

        credential = self._credential
        try:
            await self._exit_stack.aclose()
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

    async def _configure_session(self, config: LiveVoiceSessionConfig) -> None:
        connection = self._ensure_connection()
        voice_payload = self._resolve_voice(config.voice_id)
        turn_detection = self._resolve_turn_detection(config)

        session_config = RequestSession(
            modalities=[Modality.TEXT, Modality.AUDIO],
            instructions=(config.instructions or "").strip(),
            voice=voice_payload,
            input_audio_format=InputAudioFormat.PCM16,
            output_audio_format=OutputAudioFormat.PCM16,
            turn_detection=turn_detection,
        )

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

        await connection.session.update(session=session_config)

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
