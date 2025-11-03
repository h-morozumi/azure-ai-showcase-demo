"""API ルーターの集約ポイント。"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import realtime

api_router = APIRouter()
api_router.include_router(realtime.router)
