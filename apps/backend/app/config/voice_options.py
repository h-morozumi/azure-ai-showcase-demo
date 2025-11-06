"""音声キャラクターのマスターデータ。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Optional


def _build_display_name(name: str, locale: str, preview: bool) -> str:
    """プルダウン用の表示名を生成する。"""

    suffix = " (Preview)" if preview else ""
    return f"{name} · {locale}{suffix}"


def _build_tags(gender: str, preview: bool, turbo: bool) -> List[str]:
    """タグ情報を構築する。"""

    tags = ["Azure", "多言語対応", gender]
    if preview:
        tags.append("Preview")
    if turbo:
        tags.append("Turbo")
    return tags


@dataclass(frozen=True)
class VoiceOption:
    """音声キャラクターのメタ情報。"""

    voice_id: str
    provider: str
    display_name: str
    locale: str
    description: str
    tags: Optional[List[str]] = None


def _build_voice_option(entry: dict[str, Any]) -> VoiceOption:
    """エントリ辞書から VoiceOption を生成する。"""

    return VoiceOption(
        voice_id=entry["voice_id"],
        provider="azure",
        display_name=_build_display_name(entry["name"], entry["locale"], entry["preview"]),
        locale=entry["locale"],
        description=entry["description"],
        tags=_build_tags(entry["gender"], entry["preview"], entry["turbo"]),
    )


def _order_voice_options(options: List[VoiceOption]) -> List[VoiceOption]:
    """正式版 (Preview 以外) を先頭に並べ替える。"""

    stable = [voice for voice in options if "Preview" not in (voice.tags or [])]
    preview = [voice for voice in options if "Preview" in (voice.tags or [])]
    return [*stable, *preview]


_AZURE_VOICE_DEFINITIONS = [
    {
        "voice_id": "en-US-AvaMultilingualNeural",
        "name": "Ava",
        "locale": "en-US",
        "gender": "女性",
        "preview": False,
        "turbo": False,
        "description": "柔らかく聞き取りやすい米国英語の女性ボイス。案内役や汎用的な対話に最適です。",
    },
    {
        "voice_id": "en-US-AndrewMultilingualNeural",
        "name": "Andrew",
        "locale": "en-US",
        "gender": "男性",
        "preview": False,
        "turbo": False,
        "description": "クリアで落ち着いた男性ボイス。ビジネス説明やチュートリアル用途に向きます。",
    },
    {
        "voice_id": "en-US-BrianMultilingualNeural",
        "name": "Brian",
        "locale": "en-US",
        "gender": "男性",
        "preview": False,
        "turbo": False,
        "description": "安定感のある低めの男性ボイス。信頼感を重視したサポートシナリオに適しています。",
    },
    {
        "voice_id": "en-US-EmmaMultilingualNeural",
        "name": "Emma",
        "locale": "en-US",
        "gender": "女性",
        "preview": False,
        "turbo": False,
        "description": "明るく親しみやすい女性ボイス。コンシェルジュやガイド役に使いやすいトーンです。",
    },
    {
        "voice_id": "en-US-AdamMultilingualNeural",
        "name": "Adam",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "穏やかで誠実な印象の男性ボイス。相談窓口やサポートボットにおすすめです。",
    },
    {
        "voice_id": "en-US-AmandaMultilingualNeural",
        "name": "Amanda",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "滑らかで柔らかな女性ボイス。ホスピタリティや教育系のシナリオに向きます。",
    },
    {
        "voice_id": "en-US-BrandonMultilingualNeural",
        "name": "Brandon",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "開放的でエネルギッシュな男性ボイス。セールスやイベント案内に適した響きです。",
    },
    {
        "voice_id": "en-US-ChristopherMultilingualNeural",
        "name": "Christopher",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "低域が安心感を生む男性ボイス。落ち着いたサポート対応に好相性です。",
    },
    {
        "voice_id": "en-US-CoraMultilingualNeural",
        "name": "Cora",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "温かみと明瞭さを両立した女性ボイス。ライフスタイル系のガイドに最適です。",
    },
    {
        "voice_id": "en-US-DavisMultilingualNeural",
        "name": "Davis",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "落ち着いた低音で説得力のある男性ボイス。技術サポートの説明役に向きます。",
    },
    {
        "voice_id": "en-US-DerekMultilingualNeural",
        "name": "Derek",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "テンポよく明瞭な男性ボイス。ヘルプデスクの一次応答に使いやすいトーンです。",
    },
    {
        "voice_id": "en-US-DustinMultilingualNeural",
        "name": "Dustin",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "親しみやすいカジュアルさを備えた男性ボイス。会話主体のデモに適しています。",
    },
    {
        "voice_id": "en-US-EvelynMultilingualNeural",
        "name": "Evelyn",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "透明感のある女性ボイス。高級感や丁寧さを演出したい場面に好適です。",
    },
    {
        "voice_id": "en-US-LewisMultilingualNeural",
        "name": "Lewis",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "穏やかで信頼感のある男性ボイス。金融や医療の案内役にもマッチします。",
    },
    {
        "voice_id": "en-US-LolaMultilingualNeural",
        "name": "Lola",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "明るくフレンドリーな女性ボイス。コミュニティや教育用途に扱いやすい響きです。",
    },
    {
        "voice_id": "en-US-NancyMultilingualNeural",
        "name": "Nancy",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "落ち着きと温度感を備えた女性ボイス。カスタマーケアの定番として使えます。",
    },
    {
        "voice_id": "en-US-PhoebeMultilingualNeural",
        "name": "Phoebe",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "柔らかく語りかける女性ボイス。サクセスストーリーや案内動画に最適です。",
    },
    {
        "voice_id": "en-US-SamuelMultilingualNeural",
        "name": "Samuel",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "滑舌がよく芯のある男性ボイス。FAQ や手順説明に適した明瞭さです。",
    },
    {
        "voice_id": "en-US-SerenaMultilingualNeural",
        "name": "Serena",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "落ち着きと優しさを兼ね備えた女性ボイス。長時間のガイドでも聴き疲れしづらいトーンです。",
    },
    {
        "voice_id": "en-US-SteffanMultilingualNeural",
        "name": "Steffan",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "豊かな低音で存在感のある男性ボイス。専門家コメントやナレーションに向きます。",
    },
    {
        "voice_id": "en-US-AlloyTurboMultilingualNeural",
        "name": "Alloy Turbo",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": True,
        "description": "反応速度を重視した Turbo プロファイルの男性ボイス。即時応答が欲しい対話に最適です。",
    },
    {
        "voice_id": "en-US-EchoTurboMultilingualNeural",
        "name": "Echo Turbo",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": True,
        "description": "シャープで明瞭な男性ボイス。音声コマンドや短いアナウンスで威力を発揮します。",
    },
    {
        "voice_id": "en-US-FableTurboMultilingualNeural",
        "name": "Fable Turbo",
        "locale": "en-US",
        "gender": "中立",
        "preview": True,
        "turbo": True,
        "description": "物語調でニュートラルな声質。対話型ストーリーテリングや教育用途に向きます。",
    },
    {
        "voice_id": "en-US-NovaTurboMultilingualNeural",
        "name": "Nova Turbo",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": True,
        "description": "ハツラツとした女性ボイス。動きのあるデモやセールスピッチに最適です。",
    },
    {
        "voice_id": "en-US-OnyxTurboMultilingualNeural",
        "name": "Onyx Turbo",
        "locale": "en-US",
        "gender": "男性",
        "preview": True,
        "turbo": True,
        "description": "深みのある低音が特徴の男性ボイス。重厚感を演出したい対話で映えます。",
    },
    {
        "voice_id": "en-US-ShimmerTurboMultilingualNeural",
        "name": "Shimmer Turbo",
        "locale": "en-US",
        "gender": "女性",
        "preview": True,
        "turbo": True,
        "description": "軽快でキラキラした女性ボイス。ポジティブな案内やオープニングの演出に最適です。",
    },
    {
        "voice_id": "en-GB-AdaMultilingualNeural",
        "name": "Ada",
        "locale": "en-GB",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "上品で柔らかな英国英語の女性ボイス。高級感のあるガイドやアシスタントにマッチします。",
    },
    {
        "voice_id": "en-GB-OllieMultilingualNeural",
        "name": "Ollie",
        "locale": "en-GB",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "自然で親しみやすい英国英語の男性ボイス。旅行案内や教育コンテンツに適しています。",
    },
    {
        "voice_id": "de-DE-SeraphinaMultilingualNeural",
        "name": "Seraphina",
        "locale": "de-DE",
        "gender": "女性",
        "preview": False,
        "turbo": False,
        "description": "柔らかく温かみのあるドイツ語の女性ボイス。ホスピタリティやコンシェルジュ向けに最適です。",
    },
    {
        "voice_id": "de-DE-FlorianMultilingualNeural",
        "name": "Florian",
        "locale": "de-DE",
        "gender": "男性",
        "preview": False,
        "turbo": False,
        "description": "落ち着いた低音が魅力のドイツ語男性ボイス。案内やサポートで信頼感を与えます。",
    },
    {
        "voice_id": "es-ES-ArabellaMultilingualNeural",
        "name": "Arabella",
        "locale": "es-ES",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "表情豊かなスペイン語女性ボイス。観光案内やストーリーテリングに向きます。",
    },
    {
        "voice_id": "es-ES-IsidoraMultilingualNeural",
        "name": "Isidora",
        "locale": "es-ES",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "はつらつとしたスペイン語女性ボイス。カジュアルな対話体験を盛り上げます。",
    },
    {
        "voice_id": "es-ES-TristanMultilingualNeural",
        "name": "Tristan",
        "locale": "es-ES",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "落ち着いたトーンのスペイン語男性ボイス。説明やサポートの定番として扱いやすい音色です。",
    },
    {
        "voice_id": "es-ES-XimenaMultilingualNeural",
        "name": "Ximena",
        "locale": "es-ES",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "優しく包み込むスペイン語女性ボイス。医療や教育現場での案内に向きます。",
    },
    {
        "voice_id": "fr-FR-LucienMultilingualNeural",
        "name": "Lucien",
        "locale": "fr-FR",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "落ち着きのあるフランス語男性ボイス。プレミアムなサービス案内にマッチします。",
    },
    {
        "voice_id": "fr-FR-VivienneMultilingualNeural",
        "name": "Vivienne",
        "locale": "fr-FR",
        "gender": "女性",
        "preview": False,
        "turbo": False,
        "description": "華やかなフランス語女性ボイス。ブランドストーリーや文化紹介で映える音色です。",
    },
    {
        "voice_id": "fr-FR-RemyMultilingualNeural",
    "name": "Remy",
        "locale": "fr-FR",
        "gender": "男性",
        "preview": False,
        "turbo": False,
        "description": "優しく親しみやすいフランス語男性ボイス。日常会話やサポートデスクに向きます。",
    },
    {
        "voice_id": "it-IT-AlessioMultilingualNeural",
        "name": "Alessio",
        "locale": "it-IT",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "朗らかなイタリア語男性ボイス。旅行案内やプレゼンテーションで活躍します。",
    },
    {
        "voice_id": "it-IT-GiuseppeMultilingualNeural",
        "name": "Giuseppe",
        "locale": "it-IT",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "落ち着いた低音が魅力のイタリア語男性ボイス。サポート窓口で安心感を与えます。",
    },
    {
        "voice_id": "it-IT-IsabellaMultilingualNeural",
        "name": "Isabella",
        "locale": "it-IT",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "明るくエレガントなイタリア語女性ボイス。ブランド案内やカスタマーケアに最適です。",
    },
    {
        "voice_id": "it-IT-MarcelloMultilingualNeural",
        "name": "Marcello",
        "locale": "it-IT",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "深みのあるイタリア語男性ボイス。専門的な解説やナレーションに向きます。",
    },
    {
        "voice_id": "ja-JP-MasaruMultilingualNeural",
    "name": "Masaru",
        "locale": "ja-JP",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "聞き取りやすく落ち着いた日本語男性ボイス。業務案内や受付対応に適しています。",
    },
    {
        "voice_id": "ko-KR-HyunsuMultilingualNeural",
    "name": "Hyunsu",
        "locale": "ko-KR",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "親しみやすい韓国語男性ボイス。サポート窓口や教育用途で使いやすいトーンです。",
    },
    {
        "voice_id": "pt-BR-MacerioMultilingualNeural",
        "name": "Macerio",
        "locale": "pt-BR",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "温かみのあるブラジルポルトガル語男性ボイス。コミュニティ向けの案内に適しています。",
    },
    {
        "voice_id": "pt-BR-ThalitaMultilingualNeural",
        "name": "Thalita",
        "locale": "pt-BR",
        "gender": "女性",
        "preview": True,
        "turbo": False,
        "description": "軽やかで明るいブラジルポルトガル語女性ボイス。歓迎メッセージや接客シーンに最適です。",
    },
    {
        "voice_id": "zh-CN-XiaoxiaoMultilingualNeural",
    "name": "Xiaoxiao",
        "locale": "zh-CN",
        "gender": "女性",
        "preview": False,
        "turbo": False,
        "description": "標準的で聞き心地の良い中国語女性ボイス。幅広いユースケースで活用できます。",
    },
    {
        "voice_id": "zh-CN-XiaochenMultilingualNeural",
    "name": "Xiaochen",
        "locale": "zh-CN",
        "gender": "女性",
        "preview": False,
        "turbo": False,
        "description": "穏やかで丁寧な中国語女性ボイス。案内や接遇シナリオで安心感を与えます。",
    },
    {
        "voice_id": "zh-CN-XiaoyuMultilingualNeural",
    "name": "Xiaoyu",
        "locale": "zh-CN",
        "gender": "女性",
        "preview": False,
        "turbo": False,
        "description": "明るく親しみやすい中国語女性ボイス。ゼロからのガイドや学習用途に最適です。",
    },
    {
        "voice_id": "zh-CN-YunyiMultilingualNeural",
    "name": "Yunyi",
        "locale": "zh-CN",
        "gender": "男性",
        "preview": False,
        "turbo": False,
        "description": "落ち着いた中国語男性ボイス。ビジネス用途や手続き案内に適しています。",
    },
    {
        "voice_id": "zh-CN-YunfanMultilingualNeural",
    "name": "Yunfan",
        "locale": "zh-CN",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "爽やかな中国語男性ボイス。若年層向けのガイドやコミュニケーションにぴったりです。",
    },
    {
        "voice_id": "zh-CN-YunxiaoMultilingualNeural",
    "name": "Yunxiao",
        "locale": "zh-CN",
        "gender": "男性",
        "preview": True,
        "turbo": False,
        "description": "明るくエネルギッシュな中国語男性ボイス。イベントやライブ配信型の体験に向きます。",
    },
]


AZURE_VOICE_OPTIONS: List[VoiceOption] = _order_voice_options(
    [_build_voice_option(entry) for entry in _AZURE_VOICE_DEFINITIONS],
)

OPENAI_VOICE_OPTIONS: List[VoiceOption] = [
    VoiceOption(
        voice_id="verse",
        provider="openai",
        display_name="Verse · en-US",
        locale="en-US",
        description="詩のようなリズムとメロディーを感じさせる、メロディアスでバランスの良いボイスです。",
        tags=["OpenAI", "Melodic"],
    ),
    VoiceOption(
        voice_id="alloy",
        provider="openai",
        display_name="Alloy · en-US",
        locale="en-US",
        description="合金のように複数の要素が調和した、落ち着きと安定感のある声質です。",
        tags=["OpenAI", "Stable"],
    ),
    VoiceOption(
        voice_id="ash",
        provider="openai",
        display_name="Ash · en-US",
        locale="en-US",
        description="灰やトネリコの木を連想させる、クールで控えめな落ち着いた響きのボイスです。",
        tags=["OpenAI", "Cool"],
    ),
    VoiceOption(
        voice_id="ballad",
        provider="openai",
        display_name="Ballad · en-US",
        locale="en-US",
        description="物語を紡ぐバラードのように、優しく感情豊かに語りかける声質です。",
        tags=["OpenAI", "Emotional"],
    ),
    VoiceOption(
        voice_id="coral",
        provider="openai",
        display_name="Coral · en-US",
        locale="en-US",
        description="珊瑚を思わせる柔らかさと温かみを備え、親しみやすさを感じさせるボイスです。",
        tags=["OpenAI", "Warm"],
    ),
    VoiceOption(
        voice_id="echo",
        provider="openai",
        display_name="Echo · en-US",
        locale="en-US",
        description="こだまの反響を思わせる透明感があり、機械的で幻想的な響きを持つ声です。",
        tags=["OpenAI", "Ethereal"],
    ),
    VoiceOption(
        voice_id="fable",
        provider="openai",
        display_name="Fable · en-US",
        locale="en-US",
        description="寓話の語り手のように温かく包み込む、安心感のあるナラティブなボイスです。",
        tags=["OpenAI", "Storytelling"],
    ),
    VoiceOption(
        voice_id="onyx",
        provider="openai",
        display_name="Onyx · en-US",
        locale="en-US",
        description="黒曜石のように力強く、重厚な低音で存在感を放つ声質です。",
        tags=["OpenAI", "Deep"],
    ),
    VoiceOption(
        voice_id="nova",
        provider="openai",
        display_name="Nova · en-US",
        locale="en-US",
        description="新星の爆発のように明るくエネルギッシュで、勢いのあるボイスです。",
        tags=["OpenAI", "Energetic"],
    ),
    VoiceOption(
        voice_id="sage",
        provider="openai",
        display_name="Sage · en-US",
        locale="en-US",
        description="賢者を思わせる知性と落ち着きが漂い、柔らかな女性らしさも感じられる声です。",
        tags=["OpenAI", "Wise"],
    ),
    VoiceOption(
        voice_id="shimmer",
        provider="openai",
        display_name="Shimmer · en-US",
        locale="en-US",
        description="きらめきや輝きを想起させる、軽やかで明るいトーンが特徴のボイスです。",
        tags=["OpenAI", "Bright"],
    ),
]

DEFAULT_AZURE_VOICE_ID = "en-US-AvaMultilingualNeural"
DEFAULT_OPENAI_VOICE_ID = "verse"


def list_azure_voices() -> List[VoiceOption]:
    """Azure ボイス一覧を返却する。"""

    return AZURE_VOICE_OPTIONS


def get_default_azure_voice_id() -> str:
    """Azure ボイスの既定 ID を取得する。"""

    if any(voice.voice_id == DEFAULT_AZURE_VOICE_ID for voice in AZURE_VOICE_OPTIONS):
        return DEFAULT_AZURE_VOICE_ID
    return AZURE_VOICE_OPTIONS[0].voice_id if AZURE_VOICE_OPTIONS else ""


def list_openai_voices() -> List[VoiceOption]:
    """OpenAI ボイス一覧を返却する。"""

    return OPENAI_VOICE_OPTIONS


def get_default_openai_voice_id() -> str:
    """OpenAI ボイスの既定 ID を取得する。"""

    if any(voice.voice_id == DEFAULT_OPENAI_VOICE_ID for voice in OPENAI_VOICE_OPTIONS):
        return DEFAULT_OPENAI_VOICE_ID
    return OPENAI_VOICE_OPTIONS[0].voice_id if OPENAI_VOICE_OPTIONS else ""
