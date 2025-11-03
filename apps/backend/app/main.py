"""FastAPI エントリポイント。

将来的に Azure AI サービスとの連携機能を追加するための土台を提供する。
"""

from collections.abc import Mapping
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.config import get_settings

# アプリ起動時に .env を読み込む
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env", override=False)


def create_app() -> FastAPI:
    """FastAPI アプリケーションを構築して返却する。

    Returns:
        FastAPI: アプリケーション インスタンス。
    """

    app = FastAPI(title="Azure AI Showcase Backend", version="0.1.0")

    settings = get_settings()
    allow_origins = settings.allowed_origins or ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)

    @app.get("/healthz", summary="ヘルスチェック", tags=["system"])
    async def health_check() -> Mapping[str, str]:
        """稼働確認用のエンドポイント。"""

        return {"status": "ok"}

    return app


app = create_app()
