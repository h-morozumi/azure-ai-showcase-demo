# リアルタイムアバターデモ実現プラン（API キー方式）

本ドキュメントは、Azure Speech Service の Voice Live API とテキスト読み上げアバターを活用し、API キー認証でリアルタイム会話アバターデモを構築するためのアーキテクチャ概要と実装ステップを整理したものです。

## 全体構成

- **フロントエンド（React / Vite）**
  - ブラウザからマイク音声を取得し、WebRTC のアップストリームとして送信。
  - バックエンドからの WebRTC ダウンストリーム（合成音声 + アバター映像）を再生。
  - WebSocket（Signal チャネル）でセッション制御、字幕、アバター制御メッセージ、LLM 応答テキストを送受信。

- **バックエンド（FastAPI）**
  - フロントエンドと WebRTC / WebSocket セッションを管理。
  - Live Voice API 向け WebSocket クライアントを保持し、音声フレームを送信。
  - API キー（Speech Service キー、OpenAI キーなど）を Key Vault または Azure App Configuration で安全に保持し、バックエンドのみがアクセス。

- **Live Voice API（Azure Speech Service）**
  - バックエンドから送られた PCM16 24kHz モノラル音声を受け取り、低遅延で応答音声・イベントを返却。
  - Server VAD・会話ステータスイベントを利用して応答タイミングや中断を制御。

- **Azure OpenAI（任意）**
  - 会話生成ロジックとして利用し、Live Voice のターンごとに応答テキストを生成。
  - 生成結果はアバターへの SSML・アニメーション指示へ変換。

## 認証・キー管理

- Speech Service、Azure OpenAI などの API キーは **バックエンドのみ** で使用し、フロントエンドには渡さない。
- まずは .env で管理し、後続フェーズで Key Vault 連携に移行する。
- フロントエンド → バックエンドの WebSocket にはアクセストークン（短期トークン）を導入し、不正接続を防止。

## コアフロー

1. **セッション開始**
   1. フロントエンドがバックエンドへ WebRTC セッション開始を要求。
    2. バックエンドは `session.updated` 応答などで Live Voice から払い出されるサーバー固有の ICE サーバ情報を受け取り、セッション ID や短期トークンと合わせてフロントへ返却（必要に応じて Avatar Relay REST API による事前取得も利用可能）。
   3. 双方で WebRTC ピア接続を確立し、音声ストリームの送受信を準備。

2. **Live Voice 接続**
   1. バックエンドが Speech Service の Voice Live API に WebSocket 接続。
   2. `RequestSession` を送付し、入力/出力フォーマット（PCM16 24kHz）、使用ボイス、Server VAD 設定を構成。
   3. セッション確立イベント (`SESSION_UPDATED`) を受領後、音声送信を開始。

3. **音声の双方向ストリーミング**
   1. フロントエンドが WebRTC で収集した音声をバックエンドに送信。
   2. バックエンドは音声フレーム（1024 サンプル程度）を base64 で Live Voice API にプッシュ。
   3. Live Voice から `RESPONSE_AUDIO_DELTA` が到着次第、WebRTC downstream へ音声フレームを即時送出。

4. **アバター制御**
   1. Live Voice のイベントまたは Azure OpenAI から得たテキストをもとに、SSML とアニメーションキューを生成。
   2. アバターの口パク・表情コマンドを Signal WebSocket でフロントエンドへ送信。
   3. フロントエンドは 3D/2D アバター描画コンポーネントにコマンドを反映し、音声再生と同期。

5. **エラー・切断時の回復**
   - Live Voice / WebRTC いずれかの接続が落ちた場合、指数バックオフで再接続。
   - フロントエンドに状態を通知し、UI で再接続中インジケータを表示。

## 実装ロードマップ

1. **基礎実装**
   - バックエンドで Voice Live API への WebSocket クライアント実装（`live_voice_sample.py` を参考）。
   - フロントエンドで WebRTC + WebSocket の最小実装（`takingAvatorChatSample.js` を参考）。

2. **音声パイプライン統合**
   - フロントの WebRTC 音声をバックエンド経由で Live Voice に転送。
   - レスポンス音声を WebRTC 下りストリームとして返却。

3. **アバター連携**
   - アバター描画コンポーネントと WebRTC downstream、制御 WebSocket を統合。
   - Live Voice のイベントに合わせてアバターアニメーションを同期。

4. **LLM 応答・BYOD**（任意）
   - Azure OpenAI + Cognitive Search 連携を導入し、Live Voice のテキストを LLM へ流し込む。
   - Quick Reply など UX 補助を追加。

5. **セキュリティ・運用強化**
   - API キー格納を Key Vault へ移行、Managed Identity で取得。
   - アクセスログ、監視（Application Insights）を組み込む。

## 開発時のチェックポイント

- WebRTC の ICE サーバ設定（TURN 利用含む）で社内ネットワークでも動作可能にする。`session.updated` で返却されるサービス提供の ICE サーバをそのまま使えるため、基本的に独自に用意する必要はない。
- PCM 形式・サンプリングレートなど Live Voice API の仕様に合わせる。
- ネットワーク遅延を考慮したバッファサイズ調整（フロント・バック両方）。
- API キー漏洩対策：バックエンドのみで管理し、Git やフロントに埋め込まない。
- 信頼できる状態管理：セッション ID、再接続カウンタ、ユーザー終了フラグなどで整合性を維持。

以上の方針をもとに、段階的に実装を進めていきます。

   ## フロントエンド UI 設定項目調査（Live Voice API 対応）

   Live Voice API の公開仕様をもとに、デモページで利用できる設定項目を整理しました。表は UI の候補ラベルと対応する API プロパティ、必須可否、補足事項をまとめたものです。

   | UI 項目 | Voice Live / Realtime API の対応プロパティ | 必須 | 補足・注意点 |
   | --- | --- | --- | --- |
   | 生成 AI モデル | WebSocket 接続 URL の `model` クエリ、または Agent Service の `agent_id` | ✔ | サーバー側でサポートするモデル ID を列挙。モデルによって対応機能（EOU、phrase list 等）が異なる。[^voicelive-overview] |
   | 応答命令（プロンプト） | `session.instructions` または `response.create.instructions` | ▲ | カスタム Agent 利用時は `instructions` 無効。プリセット（英会話教師等）は UI 選択 → バックエンドで差し替え。[^session-update] |
   | 事前エンゲージメント | 直接対応無し（アプリ側で初回 `response.create` を送信、またはサイレンス検知で自動トリガー） | ▲ | Live Voice に自動雑談開始機能は無い。`turn_detection.create_response` はユーザー発話後の自動応答可否を制御。アプリで無音タイマー→`response.create` を呼び出す実装が必要。 |
   | 音声入力言語 | `session.input_audio_transcription.language` | ▲ | 言語指定で認識精度と遅延が改善。`model: "azure-speech"` と併用。未指定の場合は自動判定。[^audio-input] |
   | 発話終了 (EOU) | `turn_detection.end_of_utterance_detection` | ▲ | `semantic_detection_v1(_multilingual)` モデルと組み合わせ。`gpt-realtime` 系では未サポート。`threshold_level`・`timeout_ms` を UI で調整可。[^eou] |
   | オーディオ拡張（ノイズ・エコー抑制） | `input_audio_noise_reduction`, `input_audio_echo_cancellation` | ▲ | ON 時はそれぞれ `type` を設定（例: `azure_deep_noise_suppression`, `server_echo_cancellation`）。同時利用可。[^audio-enhancements] |
   | 語句一覧 (Phrase list) | `session.input_audio_transcription.phrase_list` | ▲ | カンマ区切り入力から配列化。`gpt-realtime` / `gpt-4o-mini-realtime` / `phi4-mm-realtime` は非対応で UI 側に警告が必要。[^customize] |
   | 音声出力（ボイス） | `session.voice` (`name`, `type`, `temperature`, `rate`, `custom_lexicon_url`) | ▲ | `type` は `azure-standard`/`azure-custom`。UI でボイス一覧を提供。HD ボイスの温度設定は 0–1。速度は `rate` 0.5–1.5。[^voice] |
   | 音声の温度 | `session.voice.temperature` | ▲ | Azure HD Voice のみ有効。標準ボイスでは無視されるため UI で条件分岐。 |
   | 読み上げ速度 | `session.voice.rate` | ▲ | 0.5–1.5、文字列で送信 (`"1.0"`)。標準値は 1.0。 |
   | カスタム辞書 URL | `session.voice.custom_lexicon_url` | ▲ | Audio Content Creation の辞書 URL (HTTPS)。SSML カスタム読みで活用。 |
   | アバター | `session.avatar` (`character`, `style`, `video` 等) | ▲ | 標準/カスタムアバター双方で同一構造。ICE サーバ情報は `session.updated` で取得し UI に渡す。[^avatar] |
   | 関数呼び出し | `session.tools[]`, `session.tool_choice` | ▲ | `type: "function"` で JSON Schema を定義。UI では利用可能なツールのオン/オフや優先度を設定。[^realtime-ref] |
   | コンテンツのログ記録 | Azure AI Speech ログ設定（Speech Studio / REST） | ▲ | API 直接の ON/OFF は無し。Speech リソース側で音声・転記ログを有効化、または Voice Live SDK の会話ログ出力を利用。[^logging] |
   | 字幕（会話テキスト表示） | `response.audio_transcript.delta/done`, `conversation.item.input_audio_transcription.*` | - | モデル応答とユーザー発話の双方をリアルタイム字幕に利用。UI はストリーミングイベントを購読して表示。[^realtime-ref] |

   ✔: 必須、▲: オプション（推奨/任意）、-: UI 機能として実装するが API 設定ではなくイベント活用。

   ### 追加で検討すべき高度なオプション

   - **ターン検出の詳細パラメータ**: `turn_detection.type`, `threshold`, `prefix_padding_ms`, `speech_duration_ms`, `silence_duration_ms`, `interrupt_response`, `auto_truncate`, `languages`, `eagerness` などを高度モードで露出すると会話チューニングが容易になる。[^turn-detection]
   - **入力オーディオ設定**: `input_audio_sampling_rate` (16k/24k)、`input_audio_format` (既定: `pcm16`)、必要に応じて UI で固定表示。
   - **字幕タイムスタンプ**: `output_audio_timestamp_types: ["word"]` を有効化すると単語単位のタイムライン表示が可能。[^voice]
   - **アバター口形同期**: `animation.outputs: ["viseme_id"]` で表情データを取得し、Three.js 等と連携。[^voice]

   ### UI 実装時のメモ

   - **事前エンゲージメント**: 会話開始ボタン押下時に、アプリ側で `response.create` を即時送信すれば挨拶を開始できる。無音時のフォローアップは、`input_audio_buffer.speech_stopped` 受信後に一定時間発話が無ければ `response.create` を送るなど業務ロジックで制御する。
   - **モデル非対応への対応**: UI で選択中のモデルに応じて、利用できない設定を自動無効化（EOU、phrase list など）。
   - **字幕表示**: `response.audio_transcript.delta`（アシスタント）と `conversation.item.input_audio_transcription.completed`（ユーザー）を購読し、リアルタイム字幕と履歴チャットを構築する。
   - **ログへの案内**: UI のトグルではなく、Port 内設定リンクやドキュメントへの導線として「ログ収集を有効化するには Speech Studio の Content logging を参照」と説明する。

   ### 参考ドキュメント

   - [How to use the Voice live API][^session-update]
   - [How to customize voice live input and output][^customize]
   - [Audio events reference（Azure OpenAI Realtime API 共通）][^realtime-ref]
   - [Voice live API overview][^voicelive-overview]
   - [Azure text to speech avatar 設定例][^avatar]
   - [Voice live logging / データ保護][^logging]

   [^voicelive-overview]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live
   [^session-update]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to#session-configuration
   [^audio-input]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to#audio-input-through-azure-speech-to-text
   [^eou]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to#conversational-enhancements
   [^audio-enhancements]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to#session-properties
   [^customize]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to-customize
   [^voice]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to#audio-output-through-azure-text-to-speech
   [^avatar]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to#azure-text-to-speech-avatar
   [^realtime-ref]: https://learn.microsoft.com/azure/ai-foundry/openai/realtime-audio-reference?context=/azure/ai-services/speech-service/context/context
   [^turn-detection]: https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-how-to#conversational-enhancements
   [^logging]: https://learn.microsoft.com/azure/ai-services/speech-service/logging-audio-transcription