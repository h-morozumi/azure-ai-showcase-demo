"""FastAPI ルーターで利用する共通依存関係。"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from app.core.config import Settings, get_settings

_api_key_header = APIKeyHeader(name="x-app-api-key", auto_error=False)


def get_app_settings() -> Settings:
    """設定オブジェクトを DI 用にラップする。"""

    return get_settings()


async def verify_api_key(
    provided_key: str | None = Depends(_api_key_header),
    settings: Settings = Depends(get_app_settings),
) -> None:
    """APP_API_KEY が設定されている場合のみヘッダーを検証する。"""

    if not settings.app_api_key:
        return

    if provided_key != settings.app_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")
