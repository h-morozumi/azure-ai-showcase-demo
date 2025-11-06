"""音声入力言語設定のマスターデータ。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal


@dataclass(frozen=True)
class LanguageOption:
    """言語の表示名とコードの組み合わせ。"""

    code: str
    label: str
    note: str | None = None


@dataclass(frozen=True)
class LanguageMode:
    """言語構成モードのメタデータ。"""

    mode: str
    label: str
    description: str


@dataclass(frozen=True)
class ModelLanguageProfile:
    """モデル固有の言語構成プロファイル。"""

    model_id: str
    selection_mode: Literal["single", "multi"]
    allow_auto_detect: bool
    languages: List[LanguageOption]


AZURE_SPEECH_LANGUAGE_MODES: List[LanguageMode] = [
    LanguageMode(
        mode="single",
        label="言語指定",
        description="下記リストから 1 つの言語コードを指定します。自動検出 (空文字) を選ぶことも可能です。",
    ),
    LanguageMode(
        mode="multi",
        label="最大 10 言語の多言語指定",
        description="下記リストから最大 10 件までカンマ区切りで指定し、モデルにヒントを与えます。",
    ),
]

AZURE_SPEECH_LANGUAGES: List[LanguageOption] = [
    LanguageOption(code="", label="自動検出 (多言語モデル)", note="language フィールドは空文字にしてください。"),
    LanguageOption(code="zh-CN", label="中国語 (中国)"),
    LanguageOption(code="en-AU", label="英語 (オーストラリア)"),
    LanguageOption(code="en-CA", label="英語 (カナダ)"),
    LanguageOption(code="en-IN", label="英語 (インド)"),
    LanguageOption(code="en-GB", label="英語 (イギリス)"),
    LanguageOption(code="en-US", label="英語 (米国)"),
    LanguageOption(code="fr-CA", label="フランス語 (カナダ)"),
    LanguageOption(code="fr-FR", label="フランス語 (フランス)"),
    LanguageOption(code="de-DE", label="ドイツ語 (ドイツ)"),
    LanguageOption(code="hi-IN", label="ヒンディー語 (インド)"),
    LanguageOption(code="it-IT", label="イタリア語 (イタリア)"),
    LanguageOption(code="ja-JP", label="日本語 (日本)"),
    LanguageOption(code="ko-KR", label="韓国語 (韓国)"),
    LanguageOption(code="es-MX", label="スペイン語 (メキシコ)"),
    LanguageOption(code="es-ES", label="スペイン語 (スペイン)"),
]


GPT_REALTIME_LANGUAGES: List[LanguageOption] = [
    LanguageOption(code="ja", label="日本語"),
    LanguageOption(code="af", label="アフリカーンス語"),
    LanguageOption(code="ar", label="アラビア語"),
    LanguageOption(code="hy", label="アルメニア語"),
    LanguageOption(code="az", label="アゼルバイジャン語"),
    LanguageOption(code="be", label="ベラルーシ語"),
    LanguageOption(code="bs", label="ボスニア語"),
    LanguageOption(code="bg", label="ブルガリア語"),
    LanguageOption(code="ca", label="カタルーニャ語"),
    LanguageOption(code="zh", label="中国語"),
    LanguageOption(code="hr", label="クロアチア語"),
    LanguageOption(code="cs", label="チェコ語"),
    LanguageOption(code="da", label="デンマーク語"),
    LanguageOption(code="nl", label="オランダ語"),
    LanguageOption(code="en", label="英語"),
    LanguageOption(code="et", label="エストニア語"),
    LanguageOption(code="fi", label="フィンランド語"),
    LanguageOption(code="fr", label="フランス語"),
    LanguageOption(code="gl", label="ガリシア語"),
    LanguageOption(code="de", label="ドイツ語"),
    LanguageOption(code="el", label="ギリシャ語"),
    LanguageOption(code="he", label="ヘブライ語"),
    LanguageOption(code="hi", label="ヒンディー語"),
    LanguageOption(code="hu", label="ハンガリー語"),
    LanguageOption(code="is", label="アイスランド語"),
    LanguageOption(code="id", label="インドネシア語"),
    LanguageOption(code="it", label="イタリア語"),
    LanguageOption(code="kn", label="カンナダ語"),
    LanguageOption(code="kk", label="カザフ語"),
    LanguageOption(code="ko", label="韓国語"),
    LanguageOption(code="lv", label="ラトビア語"),
    LanguageOption(code="lt", label="リトアニア語"),
    LanguageOption(code="mk", label="マケドニア語"),
    LanguageOption(code="ms", label="マレー語"),
    LanguageOption(code="mr", label="マラーティー語"),
    LanguageOption(code="mi", label="マオリ語"),
    LanguageOption(code="ne", label="ネパール語"),
    LanguageOption(code="no", label="ノルウェー語"),
    LanguageOption(code="fa", label="ペルシア語"),
    LanguageOption(code="pl", label="ポーランド語"),
    LanguageOption(code="pt", label="ポルトガル語"),
    LanguageOption(code="ro", label="ルーマニア語"),
    LanguageOption(code="ru", label="ロシア語"),
    LanguageOption(code="sr", label="セルビア語"),
    LanguageOption(code="sk", label="スロバキア語"),
    LanguageOption(code="sl", label="スロベニア語"),
    LanguageOption(code="es", label="スペイン語"),
    LanguageOption(code="sw", label="スワヒリ語"),
    LanguageOption(code="sv", label="スウェーデン語"),
    LanguageOption(code="tl", label="タガログ語"),
    LanguageOption(code="ta", label="タミル語"),
    LanguageOption(code="th", label="タイ語"),
    LanguageOption(code="tr", label="トルコ語"),
    LanguageOption(code="uk", label="ウクライナ語"),
    LanguageOption(code="ur", label="ウルドゥー語"),
    LanguageOption(code="vi", label="ベトナム語"),
    LanguageOption(code="cy", label="ウェールズ語"),
]


PHI4_MM_LANGUAGES: List[LanguageOption] = [
    LanguageOption(code="ja", label="日本語"),
    LanguageOption(code="zh", label="中国語"),
    LanguageOption(code="en", label="英語"),
    LanguageOption(code="fr", label="フランス語"),
    LanguageOption(code="de", label="ドイツ語"),
    LanguageOption(code="it", label="イタリア語"),
    LanguageOption(code="pt", label="ポルトガル語"),
    LanguageOption(code="es", label="スペイン語"),
]


MODEL_LANGUAGE_PROFILES: List[ModelLanguageProfile] = [
    ModelLanguageProfile(
        model_id="gpt-realtime",
        selection_mode="single",
        allow_auto_detect=False,
        languages=GPT_REALTIME_LANGUAGES,
    ),
    ModelLanguageProfile(
        model_id="gpt-realtime-mini",
        selection_mode="single",
        allow_auto_detect=False,
        languages=GPT_REALTIME_LANGUAGES,
    ),
    ModelLanguageProfile(
        model_id="phi4-mm-realtime",
        selection_mode="single",
        allow_auto_detect=False,
        languages=PHI4_MM_LANGUAGES,
    ),
]


def list_azure_speech_language_modes() -> List[LanguageMode]:
    """Azure Speech の言語構成モード一覧を取得する。"""

    return AZURE_SPEECH_LANGUAGE_MODES


def list_azure_speech_languages() -> List[LanguageOption]:
    """Azure Speech で利用可能な言語を取得する。"""

    return AZURE_SPEECH_LANGUAGES


def list_gpt_realtime_languages() -> List[LanguageOption]:
    """GPT Realtime 系モデルがサポートする言語を取得する。"""

    return GPT_REALTIME_LANGUAGES


def list_phi4_mm_languages() -> List[LanguageOption]:
    """Phi-4 MM Realtime がサポートする言語を取得する。"""

    return PHI4_MM_LANGUAGES


def list_model_language_profiles() -> List[ModelLanguageProfile]:
    """モデル固有の言語構成プロファイル一覧を取得する。"""

    return MODEL_LANGUAGE_PROFILES
