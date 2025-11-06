# アバター & 音声入力 設定仕様

本ドキュメントは Azure Speech Service Voice Live デモにおけるアバター選択と音声入力設定の仕様を整理したものです。バックエンド API が返却するメタデータと整合する値を記載しています。今後、音声出力仕様を追加予定です。

---

## 1. アバター設定

### 1.1 概要

- **エンドポイント**: `GET /api/v1/realtime/avatars`
- **レスポンス**: `default_avatar_id` と `avatars[]`
- **デフォルト値**: `.env` / `Settings.avatar_default_character` で管理（現在は `lisa-casual-sitting`）
- **構成要素**:
  - `avatar_id`: UI/設定で利用するユニーク ID
  - `gender`: フロントエンドのラベル表示に用いる性別（例: 男性 / 女性）
  - `character`: Speech SDK `AvatarConfig` の第 1 引数（キャラクター）
  - `style`: Speech SDK `AvatarConfig` の第 2 引数（スタイル）
  - `thumbnail_url`: UI で表示可能なサムネイル画像
  - `provider`, `description`, `tags`: 付加情報（`tags` は `Azure` などの提供元と `Business` / `Casual` などのスタイルを含む）

### 1.2 利用可能なアバター一覧

| avatar_id            | character | style            | gender | display_name          | thumbnail_url                                                                 | tags                      | 備考 |
| -------------------- | --------- | ---------------- | ------ | --------------------- | --------------------------------------------------------------------------- | ------------------------- | ---- |
| `harry-business`     | `harry`   | `business`       | 男性   | Harry (business)      | <https://ai.azure.com/speechassetscache/avatar/harry/harry-business-thumbnail.png> | Azure, Business           |      |
| `harry-casual`       | `harry`   | `casual`         | 男性   | Harry (casual)        | <https://ai.azure.com/speechassetscache/avatar/harry/harry-casual-thumbnail.png>   | Azure, Casual             |      |
| `harry-youthful`     | `harry`   | `youthful`       | 男性   | Harry (youthful)      | <https://ai.azure.com/speechassetscache/avatar/harry/harry-youthful-thumbnail.png> | Azure, Youthful           |      |
| `jeff-business`      | `jeff`    | `business`       | 男性   | Jeff (business)       | <https://ai.azure.com/speechassetscache/avatar/jeff/jeff-business-thumbnail.png>   | Azure, Business           |      |
| `jeff-formal`        | `jeff`    | `formal`         | 男性   | Jeff (formal)         | <https://ai.azure.com/speechassetscache/avatar/jeff/jeff-formal-thumbnail.png>     | Azure, Formal             |      |
| `lisa-casual-sitting`| `lisa`    | `casual-sitting` | 女性   | Lisa (casual-sitting) | <https://ai.azure.com/speechassetscache/avatar/lisa/lisa-casual-sitting-thumbnail.png> | Azure, Casual, Sitting | 既定 |
| `lori-casual`        | `lori`    | `casual`         | 女性   | Lori (casual)         | <https://ai.azure.com/speechassetscache/avatar/lori/lori-casual-thumbnail.png>     | Azure, Casual             |      |
| `lori-graceful`      | `lori`    | `graceful`       | 女性   | Lori (graceful)       | <https://ai.azure.com/speechassetscache/avatar/lori/lori-graceful-thumbnail.png>   | Azure, Graceful           |      |
| `lori-formal`        | `lori`    | `formal`         | 女性   | Lori (formal)         | <https://ai.azure.com/speechassetscache/avatar/lori/lori-formal-thumbnail.png>     | Azure, Formal             |      |
| `max-business`       | `max`     | `business`       | 男性   | Max (business)        | <https://ai.azure.com/speechassetscache/avatar/max/max-business-thumbnail.png>     | Azure, Business           |      |
| `max-casual`         | `max`     | `casual`         | 男性   | Max (casual)          | <https://ai.azure.com/speechassetscache/avatar/max/max-casual-thumbnail.png>       | Azure, Casual             |      |
| `max-formal`         | `max`     | `formal`         | 男性   | Max (formal)          | <https://ai.azure.com/speechassetscache/avatar/max/max-formal-thumbnail.png>       | Azure, Formal             |      |
| `meg-formal`         | `meg`     | `formal`         | 女性   | Meg (formal)          | <https://ai.azure.com/speechassetscache/avatar/meg/meg-formal-thumbnail.png>       | Azure, Formal             |      |
| `meg-casual`         | `meg`     | `casual`         | 女性   | Meg (casual)          | <https://ai.azure.com/speechassetscache/avatar/meg/meg-casual-thumbnail.png>       | Azure, Casual             |      |
| `meg-business`       | `meg`     | `business`       | 女性   | Meg (business)        | <https://ai.azure.com/speechassetscache/avatar/meg/meg-business-thumbnail.png>     | Azure, Business           |      |

> **実装メモ**: Speech SDK でアバターを指定する際は `new SpeechSDK.AvatarConfig(character, style)` を使用し、UI からは `avatar_id` をキーとして保存します。

---

## 2. リアルタイムモデル設定

### 2.1 概要

- **エンドポイント**: `GET /api/v1/realtime/models`
- **レスポンス構造**:
  - `default_model_id`: 既定で利用するモデル ID（`AZURE_VOICE_LIVE_DEPLOYMENT_ID` で管理）
  - `allowed_model_ids[]`: 現在のワークスペースで使用を許可するモデル ID 一覧
  - `voice_live_agent_id`: Azure Voice Live の Agent ID（設定されている場合）
  - `models[]`: 各モデルのメタデータ（`model_id`, `label`, `category`, `latency_profile`, `description`, `notes`）
- **音声出力**: 現時点では Azure Speech の Text to Speech ボイスのみ利用可能。OpenAI Voice とのハイブリッド出力は未対応。
- **アクセス制御**: `APP_ALLOWED_MODELS` に ID を指定すると返却モデルを制限できる。空の場合は全モデルが返却される。
- **カテゴリ**:
  - `realtime`: GPT Realtime 系（低遅延での音声対話に最適）
  - `multimodal`: GPT-4/5 系や Phi 系のマルチモーダルモデル
- **レイテンシプロファイル**: `ultra_low` → `low` → `medium` の順で応答時間が長くなる。

### 2.2 利用可能なモデル一覧

| model_id             | 表示名               | カテゴリ     | レイテンシ       | 説明                                                                 | 備考 |
|----------------------|----------------------|--------------|------------------|----------------------------------------------------------------------|------|
| `gpt-realtime`       | GPT Realtime         | realtime     | low              | GPT Realtime + Azure Text to Speech（カスタム音声対応）の標準モデル。         | semantic_vad 対応 |
| `gpt-realtime-mini`  | GPT Realtime Mini    | realtime     | ultra_low        | 軽量版 GPT Realtime。会話品質よりも応答速度を優先。                            | semantic_vad 対応 |
| `gpt-4o`             | GPT-4o               | multimodal   | medium           | GPT-4o + Azure Speech STT/TTS。高品質なマルチモーダル体験向け。               | EOU/phrase list 対応 |
| `gpt-4o-mini`        | GPT-4o Mini          | multimodal   | low              | GPT-4o Mini + Azure Speech STT/TTS。軽量マルチモーダル体験に最適。            | EOU/phrase list 対応 |
| `gpt-4.1`            | GPT-4.1              | multimodal   | medium           | GPT-4.1 + Azure Speech STT/TTS。精度重視ユースケース向け。                     | EOU/phrase list 対応 |
| `gpt-4.1-mini`       | GPT-4.1 Mini         | multimodal   | low              | GPT-4.1 Mini + Azure Speech STT/TTS。コストと品質のバランスが良い。           | EOU/phrase list 対応 |
| `gpt-5`              | GPT-5                | multimodal   | medium           | GPT-5 + Azure Speech STT/TTS。最新世代の高品質モデル。                         | EOU/phrase list 対応 |
| `gpt-5-mini`         | GPT-5 Mini           | multimodal   | low              | GPT-5 Mini + Azure Speech STT/TTS。軽量かつ高性能なリアルタイム応答。          | EOU/phrase list 対応 |
| `gpt-5-nano`         | GPT-5 Nano           | multimodal   | ultra_low        | GPT-5 Nano + Azure Speech STT/TTS。最軽量の GPT-5 系モデル。                  | EOU/phrase list 対応 |
| `gpt-5-chat`         | GPT-5 Chat           | multimodal   | medium           | GPT-5 Chat + Azure Speech STT/TTS。対話特化の安定モデル。                      | EOU/phrase list 対応 |
| `phi4-mm-realtime`   | Phi-4 MM Realtime    | multimodal   | medium           | Phi4-mm + Azure Text to Speech。コスト効率重視のマルチモーダル。              | semantic_vad 非対応 |
| `phi4-mini`          | Phi-4 Mini           | multimodal   | low              | Phi4-mm Mini + Azure Speech STT/TTS。軽量ヒューマノイド対話向け。            | semantic_vad 非対応 |

> **実装メモ**: `default_model_id` は返却リスト内に含まれない場合でも `_merge_with_default()` によって必ず先頭に追加される。`voice_live_deployment_id` が UI 初期選択値となる。

---

## 3. 音声入力（言語）設定

### 3.1 エンドポイント概要

- **エンドポイント**: `GET /api/v1/realtime/languages`
- **レスポンス構造**:
  - `azure_speech`: Azure Speech モードと言語一覧
  - `realtime_models[]`: モデル ID ごとのサポート言語プロファイル（`model_id`, `selection_mode`, `allow_auto_detect`, `languages[]`）
- **使用例**:
  - 自動検出（空文字）
  - 単一言語（BCP-47 または言語コード）
  - 多言語ヒント（最大 10 個をカンマ区切り）

### 3.2 Azure Speech の構成モード

UI ではモデル単位の `selection_mode` を優先し、`multi` のプロファイルを持つモデルのみ複数言語ヒントのチェックボックスを表示します。`allow_auto_detect` が `true` の場合は単一選択モードでも「自動検出 (空文字)」が並びます。プロファイルが存在しないモデルは、以下の Azure Speech モード定義の先頭（`auto`→`single`→`multi` の順）を参照して初期化されます。

| mode  | 表示名                     | 説明 |
|-------|----------------------------|------|
| `auto`  | 自動多言語検出 (既定)       | `model="azure-speech"` とし、`language=""` を指定（空文字）で自動検出。 |
| `single`| 単一言語構成               | `language` に一覧から 1 言語コードを設定。 |
| `multi` | 最大 10 言語の多言語構成   | `language="en-US,ja-JP,..."` のようにカンマ区切りでヒント提示。UI は該当プロファイルのモデルのみ複数選択 UI を表示。 |

#### 設定例

```jsonc
{
  "session": {
    "input_audio_transcription": {
      "model": "azure-speech",
      "language": "" // 自動検出: 空文字のままにする
    }
  }
}
```

### 3.3 Azure Speech 言語一覧

| コード | 表示名 |
|--------|---------|
| *(空文字)* | 自動検出 (多言語モデル) |
| `zh-CN` | 中国語 (中国) |
| `en-AU` | 英語 (オーストラリア) |
| `en-CA` | 英語 (カナダ) |
| `en-IN` | 英語 (インド) |
| `en-GB` | 英語 (イギリス) |
| `en-US` | 英語 (米国) |
| `fr-CA` | フランス語 (カナダ) |
| `fr-FR` | フランス語 (フランス) |
| `de-DE` | ドイツ語 (ドイツ) |
| `hi-IN` | ヒンディー語 (インド) |
| `it-IT` | イタリア語 (イタリア) |
| `ja-JP` | 日本語 (日本) |
| `ko-KR` | 韓国語 (韓国) |
| `es-MX` | スペイン語 (メキシコ) |
| `es-ES` | スペイン語 (スペイン) |

### 3.4 Realtime モデルの言語サポート

- **`gpt-realtime`, `gpt-realtime-mini`**: 下表の 57 言語コード（ISO 639-1）に対応。
- **マルチモーダルモデル**（`gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`, `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5-chat`, `phi4-mini`）: Azure Speech と同一の言語一覧をヒントとして使用。
- **`phi4-mm-realtime`**: 指定 8 言語に対応。

#### gpt-realtime 系対応言語

Afrikaans / Arabic / Armenian / Azerbaijani / Belarusian / Bosnian / Bulgarian / Catalan / Chinese / Croatian /
Czech / Danish / Dutch / English / Estonian / Finnish / French / Galician / German / Greek / Hebrew / Hindi /
Hungarian / Icelandic / Indonesian / Italian / Japanese / Kannada / Kazakh / Korean / Latvian / Lithuanian /
Macedonian / Malay / Marathi / Maori / Nepali / Norwegian / Persian / Polish / Portuguese / Romanian / Russian /
Serbian / Slovak / Slovenian / Spanish / Swahili / Swedish / Tagalog / Tamil / Thai / Turkish / Ukrainian /
Urdu / Vietnamese / Welsh

#### phi4-mm-realtime 対応言語

Chinese / English / French / German / Italian / Japanese / Portuguese / Spanish

### 3.5 マルチモーダルモデルでのヒント指定例

```jsonc
{
  "session": {
    "input_audio_transcription": {
      "model": "gpt-4o-transcribe",
      "language": "English, German, French"
    }
  }
}
```

> **注意**: `gpt-4o` や `gpt-5` などのマルチモーダルモデルは言語を明示しなくても動作しますが、ヒントを与えることで転記品質が向上します。

---

## 4. 今後の追加項目

- 音声出力（OpenAI / Azure ボイス）の仕様を追記予定。
- 音声出力（Azure ボイスのみ）の仕様を追記予定。
- API 応答例とリクエストテンプレートの掲載。
- フロントエンドでのフォーム制御例を補完。

---

### 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-11-05 | 言語プロファイル (`selection_mode`, `allow_auto_detect`) と UI 自動切替仕様を追記。 |
| 2025-11-05 | 利用可能なモデル仕様を追加。 |
| 2025-11-05 | 初版（アバター・音声入力仕様）を作成。 |
