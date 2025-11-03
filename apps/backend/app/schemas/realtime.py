"""Live Voice API 向けのスキーマ定義。"""

from __future__ import annotations

from dataclasses import asdict
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.config.realtime_models import RealtimeModel


class RealtimeModelSchema(BaseModel):
    """フロントエンドへ返却するモデルメタデータ。"""

    model_config = ConfigDict(from_attributes=True)

    model_id: str = Field(..., description="Live Voice モデル ID")
    label: str = Field(..., description="表示名")
    category: str = Field(..., description="モデルカテゴリ")
    latency_profile: str = Field(..., description="遅延プロファイル")
    description: str = Field(..., description="概要")
    notes: Optional[str] = Field(default=None, description="補足情報")

    @classmethod
    def from_dataclass(cls, model: RealtimeModel) -> "RealtimeModelSchema":
        """RealtimeModel dataclass からスキーマを生成する。"""

        return cls(**asdict(model))


class RealtimeModelsResponse(BaseModel):
    """Live Voice モデル一覧 API のレスポンス。"""

    default_model_id: str = Field(..., description="初期選択に使うモデル ID")
    allowed_model_ids: List[str] = Field(..., description="利用を許可しているモデル ID 一覧")
    default_avatar_character: str = Field(..., description="デフォルトのアバターキャラクター ID")
    voice_live_agent_id: Optional[str] = Field(default=None, description="Agent 利用時に参照する ID")
    models: List[RealtimeModelSchema] = Field(..., description="提供するモデルのメタデータ")
