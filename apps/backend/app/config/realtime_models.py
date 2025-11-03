"""Live Voice API で利用可能なモデル定義とヘルパー。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Optional


@dataclass(frozen=True)
class RealtimeModel:
    """Voice Live / Realtime API で利用可能なモデルのメタ情報。"""

    model_id: str
    label: str
    category: str
    latency_profile: str
    description: str
    notes: Optional[str] = None


# メンテナンスしやすいように、モデルはマスターデータとして列挙する。
REALTIME_MODELS: List[RealtimeModel] = [
    RealtimeModel(
        model_id="gpt-realtime",
        label="GPT Realtime",
        category="realtime",
        latency_profile="low",
        description="GPT Realtime と Azure Text to Speech（カスタム音声含む）を利用する標準モデル。",
        notes="semantic_vad 対応。",
    ),
    RealtimeModel(
        model_id="gpt-realtime-mini",
        label="GPT Realtime Mini",
        category="realtime",
        latency_profile="ultra_low",
        description="軽量版の GPT Realtime。低遅延で会話品質よりも反応速度を優先。",
        notes="semantic_vad 対応。",
    ),
    RealtimeModel(
        model_id="gpt-4o",
        label="GPT-4o",
        category="multimodal",
        latency_profile="medium",
        description="GPT-4o + Azure Speech STT/TTS（カスタム音声含む）。高品質なマルチモーダル体験向け。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="gpt-4o-mini",
        label="GPT-4o Mini",
        category="multimodal",
        latency_profile="low",
        description="GPT-4o ミニ + Azure Speech STT/TTS。軽量マルチモーダル体験に適する。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="gpt-4.1",
        label="GPT-4.1",
        category="multimodal",
        latency_profile="medium",
        description="GPT-4.1 + Azure Speech STT/TTS。精度重視のユースケースに。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="gpt-4.1-mini",
        label="GPT-4.1 Mini",
        category="multimodal",
        latency_profile="low",
        description="GPT-4.1 Mini + Azure Speech STT/TTS。コストと品質のバランスが良い。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="gpt-5",
        label="GPT-5",
        category="multimodal",
        latency_profile="medium",
        description="GPT-5 + Azure Speech STT/TTS。最新世代の高品質モデル。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="gpt-5-mini",
        label="GPT-5 Mini",
        category="multimodal",
        latency_profile="low",
        description="GPT-5 Mini + Azure Speech STT/TTS。軽量かつ高性能なリアルタイム応答。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="gpt-5-nano",
        label="GPT-5 Nano",
        category="multimodal",
        latency_profile="ultra_low",
        description="GPT-5 Nano + Azure Speech STT/TTS。最も軽量な GPT-5 系モデル。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="gpt-5-chat",
        label="GPT-5 Chat",
        category="multimodal",
        latency_profile="medium",
        description="GPT-5 Chat + Azure Speech STT/TTS。対話特化の安定モデル。",
        notes="EOU/phrase list 対応。",
    ),
    RealtimeModel(
        model_id="phi4-mm-realtime",
        label="Phi-4 MM Realtime",
        category="multimodal",
        latency_profile="medium",
        description="Phi4-mm + Azure Text to Speech（カスタム音声含む）。コスト効率重視のマルチモーダル。",
        notes="semantic_vad 非対応。",
    ),
    RealtimeModel(
        model_id="phi4-mini",
        label="Phi-4 Mini",
        category="multimodal",
        latency_profile="low",
        description="Phi4-mm Mini + Azure Speech STT/TTS。軽量なヒューマノイド対話向け。",
        notes="semantic_vad 非対応。",
    ),
]


def list_models(allowed_ids: Optional[Iterable[str]] = None) -> List[RealtimeModel]:
    """許可されたモデルのみを返却する。"""

    if allowed_ids is None:
        return REALTIME_MODELS

    allowed = set(allowed_ids)
    return [model for model in REALTIME_MODELS if model.model_id in allowed]


def get_model(model_id: str) -> Optional[RealtimeModel]:
    """モデル ID に該当するメタ情報を取得する。"""

    return next((model for model in REALTIME_MODELS if model.model_id == model_id), None)
