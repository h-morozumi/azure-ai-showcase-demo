"""FastAPI エントリポイント。

将来的に Azure AI サービスとの連携機能を追加するための土台を提供する。
"""

from collections.abc import Mapping

from fastapi import FastAPI


def create_app() -> FastAPI:
    """FastAPI アプリケーションを構築して返却する。

    Returns:
        FastAPI: アプリケーション インスタンス。
    """

    app = FastAPI(title="Azure AI Showcase Backend", version="0.1.0")

    @app.get("/healthz", summary="ヘルスチェック", tags=["system"])
    async def health_check() -> Mapping[str, str]:
        """稼働確認用のエンドポイント。"""

        return {"status": "ok"}

    return app


app = create_app()
