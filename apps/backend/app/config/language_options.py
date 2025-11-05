"""音声入力言語設定のマスターデータ。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List


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


AZURE_SPEECH_LANGUAGE_MODES: List[LanguageMode] = [
    LanguageMode(
        mode="auto",
        label="自動多言語検出 (既定)",
        description="model=azure-speech を指定し language を空文字にすることで自動検出を有効化します。",
    ),
    LanguageMode(
        mode="single",
        label="単一言語構成",
        description="model=azure-speech を指定し、下記リストから 1 つの言語コードを設定します。",
    ),
    LanguageMode(
        mode="multi",
        label="最大 10 言語の多言語構成",
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
    LanguageOption(code="af", label="Afrikaans"),
    LanguageOption(code="ar", label="Arabic"),
    LanguageOption(code="hy", label="Armenian"),
    LanguageOption(code="az", label="Azerbaijani"),
    LanguageOption(code="be", label="Belarusian"),
    LanguageOption(code="bs", label="Bosnian"),
    LanguageOption(code="bg", label="Bulgarian"),
    LanguageOption(code="ca", label="Catalan"),
    LanguageOption(code="zh", label="Chinese"),
    LanguageOption(code="hr", label="Croatian"),
    LanguageOption(code="cs", label="Czech"),
    LanguageOption(code="da", label="Danish"),
    LanguageOption(code="nl", label="Dutch"),
    LanguageOption(code="en", label="English"),
    LanguageOption(code="et", label="Estonian"),
    LanguageOption(code="fi", label="Finnish"),
    LanguageOption(code="fr", label="French"),
    LanguageOption(code="gl", label="Galician"),
    LanguageOption(code="de", label="German"),
    LanguageOption(code="el", label="Greek"),
    LanguageOption(code="he", label="Hebrew"),
    LanguageOption(code="hi", label="Hindi"),
    LanguageOption(code="hu", label="Hungarian"),
    LanguageOption(code="is", label="Icelandic"),
    LanguageOption(code="id", label="Indonesian"),
    LanguageOption(code="it", label="Italian"),
    LanguageOption(code="ja", label="Japanese"),
    LanguageOption(code="kn", label="Kannada"),
    LanguageOption(code="kk", label="Kazakh"),
    LanguageOption(code="ko", label="Korean"),
    LanguageOption(code="lv", label="Latvian"),
    LanguageOption(code="lt", label="Lithuanian"),
    LanguageOption(code="mk", label="Macedonian"),
    LanguageOption(code="ms", label="Malay"),
    LanguageOption(code="mr", label="Marathi"),
    LanguageOption(code="mi", label="Maori"),
    LanguageOption(code="ne", label="Nepali"),
    LanguageOption(code="no", label="Norwegian"),
    LanguageOption(code="fa", label="Persian"),
    LanguageOption(code="pl", label="Polish"),
    LanguageOption(code="pt", label="Portuguese"),
    LanguageOption(code="ro", label="Romanian"),
    LanguageOption(code="ru", label="Russian"),
    LanguageOption(code="sr", label="Serbian"),
    LanguageOption(code="sk", label="Slovak"),
    LanguageOption(code="sl", label="Slovenian"),
    LanguageOption(code="es", label="Spanish"),
    LanguageOption(code="sw", label="Swahili"),
    LanguageOption(code="sv", label="Swedish"),
    LanguageOption(code="tl", label="Tagalog"),
    LanguageOption(code="ta", label="Tamil"),
    LanguageOption(code="th", label="Thai"),
    LanguageOption(code="tr", label="Turkish"),
    LanguageOption(code="uk", label="Ukrainian"),
    LanguageOption(code="ur", label="Urdu"),
    LanguageOption(code="vi", label="Vietnamese"),
    LanguageOption(code="cy", label="Welsh"),
]


PHI4_MM_LANGUAGES: List[LanguageOption] = [
    LanguageOption(code="zh", label="Chinese"),
    LanguageOption(code="en", label="English"),
    LanguageOption(code="fr", label="French"),
    LanguageOption(code="de", label="German"),
    LanguageOption(code="it", label="Italian"),
    LanguageOption(code="ja", label="Japanese"),
    LanguageOption(code="pt", label="Portuguese"),
    LanguageOption(code="es", label="Spanish"),
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
