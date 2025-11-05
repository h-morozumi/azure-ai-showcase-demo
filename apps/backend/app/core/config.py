"""アプリケーション設定のロードロジック。"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Optional


def _split_csv(value: str | None) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _to_optional(value: str | None) -> Optional[str]:
    value = value or ""
    trimmed = value.strip()
    return trimmed or None


@dataclass(slots=True)
class Settings:
    """バックエンド全体で共有するアプリ設定。"""

    app_env: str
    log_level: str
    allowed_origins: List[str]
    app_api_key: Optional[str]
    allowed_models: List[str]

    speech_region: Optional[str]
    speech_key: Optional[str]
    voice_live_deployment_id: str
    voice_live_agent_id: Optional[str]
    avatar_default_character: str

    openai_endpoint: Optional[str]
    openai_api_key: Optional[str]
    openai_api_version: Optional[str]
    openai_chat_deployment_id: Optional[str]
    openai_realtime_deployment_id: Optional[str]

    agent_endpoint: Optional[str]
    agent_api_key: Optional[str]
    agent_id: Optional[str]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """環境変数から設定を読み取って Settings を生成する。"""

    return Settings(
        app_env=os.getenv("APP_ENV", "local"),
        log_level=os.getenv("APP_LOG_LEVEL", "info"),
        allowed_origins=_split_csv(os.getenv("APP_ALLOWED_ORIGINS", "http://localhost:5173")),
        app_api_key=_to_optional(os.getenv("APP_API_KEY")),
        allowed_models=_split_csv(os.getenv("APP_ALLOWED_MODELS")),
        speech_region=_to_optional(os.getenv("AZURE_SPEECH_REGION")),
        speech_key=_to_optional(os.getenv("AZURE_SPEECH_KEY")),
        voice_live_deployment_id=os.getenv("AZURE_VOICE_LIVE_DEPLOYMENT_ID", "gpt-realtime"),
        voice_live_agent_id=_to_optional(os.getenv("AZURE_VOICE_LIVE_AGENT_ID")),
        avatar_default_character=os.getenv("AZURE_AVATAR_DEFAULT_CHARACTER", "lisa-casual-sitting"),
        openai_endpoint=_to_optional(os.getenv("AZURE_OPENAI_ENDPOINT")),
        openai_api_key=_to_optional(os.getenv("AZURE_OPENAI_API_KEY")),
        openai_api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-06-01"),
        openai_chat_deployment_id=_to_optional(os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_ID")),
        openai_realtime_deployment_id=_to_optional(os.getenv("AZURE_OPENAI_REALTIME_DEPLOYMENT_ID")),
        agent_endpoint=_to_optional(os.getenv("AZURE_AGENT_ENDPOINT")),
        agent_api_key=_to_optional(os.getenv("AZURE_AGENT_API_KEY")),
        agent_id=_to_optional(os.getenv("AZURE_AGENT_ID")),
    )
