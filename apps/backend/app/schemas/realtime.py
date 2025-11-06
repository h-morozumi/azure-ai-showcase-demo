"""Live Voice API 向けのスキーマ定義。"""

from __future__ import annotations

from dataclasses import asdict
from typing import Annotated, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from app.config.avatar_options import AvatarOption
from app.config.realtime_models import RealtimeModel
from app.config.voice_options import VoiceOption
from app.config.language_options import LanguageMode, LanguageOption, ModelLanguageProfile


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


class VoiceOptionSchema(BaseModel):
    """ボイスのメタデータスキーマ。"""

    model_config = ConfigDict(from_attributes=True)

    voice_id: str = Field(..., description="ボイス ID")
    provider: str = Field(..., description="ボイス提供元")
    display_name: str = Field(..., description="表示名")
    locale: str = Field(..., description="ロケール")
    description: str = Field(..., description="説明")
    tags: Optional[List[str]] = Field(default=None, description="タグ")

    @classmethod
    def from_dataclass(cls, voice: VoiceOption) -> "VoiceOptionSchema":
        """VoiceOption dataclass からスキーマを生成する。"""

        return cls(**asdict(voice))


class AvatarOptionSchema(BaseModel):
    """アバターキャラクタースキーマ。"""

    model_config = ConfigDict(from_attributes=True)

    avatar_id: str = Field(..., description="アバター ID")
    provider: str = Field(..., description="提供元")
    display_name: str = Field(..., description="表示名")
    character: str = Field(..., description="Voice Live で利用するキャラクター ID")
    gender: str = Field(..., description="アバターの性別カテゴリ")
    description: str = Field(..., description="説明")
    style: Optional[str] = Field(default=None, description="スタイル分類")
    recommended_use: Optional[str] = Field(default=None, description="推奨用途")
    tags: Optional[List[str]] = Field(default=None, description="タグ")
    thumbnail_url: Optional[str] = Field(default=None, description="サムネイル画像 URL")

    @classmethod
    def from_dataclass(cls, avatar: AvatarOption) -> "AvatarOptionSchema":
        """AvatarOption dataclass からスキーマを生成する。"""

        return cls(**asdict(avatar))


class LanguageOptionSchema(BaseModel):
    """言語選択肢のスキーマ。"""

    model_config = ConfigDict(from_attributes=True)

    code: str = Field(..., description="BCP-47 もしくは ISO 言語コード。Azure の自動検出時は空文字。")
    label: str = Field(..., description="表示名")
    note: Optional[str] = Field(default=None, description="補足情報")

    @classmethod
    def from_dataclass(cls, option: LanguageOption) -> "LanguageOptionSchema":
        """LanguageOption dataclass からスキーマを生成する。"""

        return cls(**asdict(option))


class LanguageModeSchema(BaseModel):
    """言語構成モードのスキーマ。"""

    model_config = ConfigDict(from_attributes=True)

    mode: str = Field(..., description="モード識別子")
    label: str = Field(..., description="表示ラベル")
    description: str = Field(..., description="説明")

    @classmethod
    def from_dataclass(cls, mode: LanguageMode) -> "LanguageModeSchema":
        """LanguageMode dataclass からスキーマを生成する。"""

        return cls(**asdict(mode))


class RealtimeModelsResponse(BaseModel):
    """Live Voice モデル一覧 API のレスポンス。"""

    default_model_id: str = Field(..., description="初期選択に使うモデル ID")
    allowed_model_ids: List[str] = Field(..., description="利用を許可しているモデル ID 一覧")
    voice_live_agent_id: Optional[str] = Field(default=None, description="Agent 利用時に参照する ID")
    models: List[RealtimeModelSchema] = Field(..., description="提供するモデルのメタデータ")


class VoiceOptionsResponse(BaseModel):
    """ボイス一覧レスポンス。"""

    provider: str = Field(..., description="ボイス提供元")
    default_voice_id: str = Field(..., description="既定ボイス ID")
    voices: List[VoiceOptionSchema] = Field(..., description="ボイスメタデータ一覧")


class AvatarOptionsResponse(BaseModel):
    """アバター一覧レスポンス。"""

    default_avatar_id: str = Field(..., description="既定のアバター ID")
    avatars: List[AvatarOptionSchema] = Field(..., description="アバターメタデータ一覧")


class AzureSpeechLanguagesResponse(BaseModel):
    """Azure Speech 言語構成レスポンス。"""

    provider: str = Field(default="azure-speech", description="プロバイダー識別子")
    modes: List[LanguageModeSchema] = Field(..., description="構成モードの一覧")
    languages: List[LanguageOptionSchema] = Field(..., description="利用可能な言語リスト")


class ModelLanguageSupportSchema(BaseModel):
    """Realtime モデル固有の言語サポート情報。"""

    model_id: str = Field(..., description="対象モデル ID")
    selection_mode: Literal["single", "multi"] = Field(..., description="選択モード")
    allow_auto_detect: bool = Field(..., description="自動検出を許可するかどうか")
    languages: List[LanguageOptionSchema] = Field(..., description="選択可能な言語")

    @classmethod
    def from_dataclass(cls, profile: ModelLanguageProfile) -> "ModelLanguageSupportSchema":
        """ModelLanguageProfile dataclass からスキーマを生成する。"""

        return cls(
            model_id=profile.model_id,
            selection_mode=profile.selection_mode,
            allow_auto_detect=profile.allow_auto_detect,
            languages=[LanguageOptionSchema.from_dataclass(lang) for lang in profile.languages],
        )


class LanguageOptionsResponse(BaseModel):
    """言語選択肢をまとめたレスポンス。"""

    azure_speech: AzureSpeechLanguagesResponse = Field(..., description="Azure Speech 入力音声設定")
    realtime_models: List[ModelLanguageSupportSchema] = Field(..., description="Realtime モデル個別の言語サポート")


class LiveVoiceSessionConfigPayload(BaseModel):
    """WebSocket 経由で受け取るセッション構成。"""

    model_config = ConfigDict(populate_by_name=True)

    model_id: str = Field(..., alias="modelId", description="Live Voice モデル ID")
    voice_id: str = Field(..., alias="voiceId", description="使用するボイス ID")
    instructions: Optional[str] = Field(default=None, description="システムプロンプト")
    language: Optional[str] = Field(default=None, description="Azure Speech の認識言語")
    phrase_list: Optional[List[str]] = Field(default=None, alias="phraseList", description="語句ブースト候補")
    semantic_vad: str = Field(default="azure_semantic_vad", alias="semanticVad", description="VAD モード")
    enable_eou: bool = Field(default=True, alias="enableEou", description="EOU を有効化するか")
    agent_id: Optional[str] = Field(default=None, alias="agentId", description="Agent Service の ID")
    custom_speech_endpoint: Optional[str] = Field(default=None, alias="customSpeechEndpoint", description="Custom Speech エンドポイント")
    avatar_id: Optional[str] = Field(default=None, alias="avatarId", description="クライアント側で参照するアバター ID")


class LiveVoiceSessionConfigureMessage(BaseModel):
    """セッション構成メッセージ。"""

    type: Literal["session.configure"]
    payload: LiveVoiceSessionConfigPayload


class LiveVoiceSessionStopMessage(BaseModel):
    """セッション停止メッセージ。"""

    type: Literal["session.stop"]


LiveVoiceSessionClientMessage = Annotated[
    Union[LiveVoiceSessionConfigureMessage, LiveVoiceSessionStopMessage],
    Field(discriminator="type"),
]
