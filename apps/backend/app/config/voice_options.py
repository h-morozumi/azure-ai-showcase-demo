"""Azure ボイスのマスターデータ。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional


@dataclass(frozen=True)
class VoiceOption:
    """音声キャラクターのメタ情報。"""

    voice_id: str
    provider: str
    display_name: str
    locale: str
    description: str
    tags: Optional[List[str]] = None


AZURE_VOICE_OPTIONS: List[VoiceOption] = [
    VoiceOption(
        voice_id="ja-JP-AoiNeural",
        provider="azure",
        display_name="青井 (ja-JP)",
        locale="ja-JP",
        description="日本語ネイティブの自然な女性ボイス。受付やガイダンスに適しています。",
        tags=["日本語", "Neural"],
    ),
    VoiceOption(
        voice_id="en-US-JennyNeural",
        provider="azure",
        display_name="Jenny (en-US)",
        locale="en-US",
        description="温かみのある英語ボイス。グローバルな案内役に親和性が高いです。",
        tags=["English", "Neural"],
    ),
    VoiceOption(
        voice_id="zh-CN-XiaoxiaoNeural",
        provider="azure",
        display_name="晓晓 (zh-CN)",
        locale="zh-CN",
        description="中国語の標準語ボイス。多言語デモでの切替用途に。",
        tags=["Chinese", "Multilingual"],
    ),
    VoiceOption(
        voice_id="en-US-DavisNeural",
        provider="azure",
        display_name="Davis (en-US)",
        locale="en-US",
        description="低めで落ち着いた男性ボイス。技術サポートや FAQ に適しています。",
        tags=["Calm", "Neural"],
    ),
]


def list_azure_voices() -> List[VoiceOption]:
    """Azure ボイス一覧を返却する。"""

    return AZURE_VOICE_OPTIONS


def get_default_azure_voice_id() -> str:
    """Azure ボイスの既定 ID を取得する。"""

    return AZURE_VOICE_OPTIONS[0].voice_id if AZURE_VOICE_OPTIONS else ""
