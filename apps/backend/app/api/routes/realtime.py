"""Live Voice 関連 API ルーター。"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends

from app.api.deps import get_app_settings, verify_api_key
from app.config.realtime_models import RealtimeModel, get_model, list_models
from app.core.config import Settings
from app.schemas.realtime import RealtimeModelsResponse, RealtimeModelSchema

router = APIRouter(
    prefix="/api/v1/realtime",
    tags=["realtime"],
    dependencies=[Depends(verify_api_key)],
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


@router.get("/models", response_model=RealtimeModelsResponse, summary="利用可能な Live Voice モデル一覧を取得")
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
        default_avatar_character=settings.avatar_default_character,
        voice_live_agent_id=settings.voice_live_agent_id,
        models=payload,
    )
