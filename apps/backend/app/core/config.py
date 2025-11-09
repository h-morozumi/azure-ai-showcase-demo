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


def _resolve_voice_live_endpoint() -> str:
    """環境変数の名称揺れを吸収して Voice Live エンドポイントを決定する。"""

    endpoint = os.getenv("AZURE_VOICE_LIVE_ENDPOINT")
    if endpoint and endpoint.strip():
        return endpoint.strip()

    # legacy = os.getenv("AZURE_VOICELIVE_ENDPOINT")
    # if legacy and legacy.strip():
    #     return legacy.strip()

    return "wss://api.voicelive.com/v1"


@dataclass(slots=True)
class Settings:
    """バックエンド全体で共有するアプリ設定。"""

    app_env: str
    log_level: str
    allowed_origins: List[str]
    app_api_key: Optional[str]
    allowed_models: List[str]

    voice_live_deployment_id: str
    voice_live_agent_id: Optional[str]
    voice_live_endpoint: str
    voice_live_api_key: Optional[str]
    avatar_default_character: str


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """環境変数から設定を読み取って Settings を生成する。"""

    return Settings(
        app_env=os.getenv("APP_ENV", "local"),
        log_level=os.getenv("APP_LOG_LEVEL", "info"),
        allowed_origins=_split_csv(os.getenv("APP_ALLOWED_ORIGINS", "http://localhost:5173")),
        app_api_key=_to_optional(os.getenv("APP_API_KEY")),
        allowed_models=_split_csv(os.getenv("AZURE_VOICE_LIVE_ALLOWED_MODELS","gpt-realtime")),
        voice_live_deployment_id=os.getenv("AZURE_VOICE_LIVE_DEPLOYMENT_ID", "gpt-realtime"),
        voice_live_agent_id=_to_optional(os.getenv("AZURE_VOICE_LIVE_AGENT_ID")),
        voice_live_endpoint=_resolve_voice_live_endpoint(),
        voice_live_api_key=_to_optional(os.getenv("AZURE_VOICE_LIVE_API_KEY")),
        avatar_default_character=os.getenv("AZURE_AVATAR_DEFAULT_CHARACTER", "lisa-casual-sitting"),
    )
