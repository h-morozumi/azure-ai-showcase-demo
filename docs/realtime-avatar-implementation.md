# Azure Voice Live API - リアルタイムアバター実装ガイド

## 概要

このドキュメントでは、Azure Voice Live API（旧 Realtime API）を使用したリアルタイムアバター機能の実装方法について説明します。特に、Python SDK の制限と、その回避策としてのハイブリッドアプローチについて詳述します。

## 目次

- [前提知識](#前提知識)
- [SDK の制限事項](#sdk-の制限事項)
- [実装アーキテクチャ](#実装アーキテクチャ)
- [ハイブリッドアプローチの詳細](#ハイブリッドアプローチの詳細)
- [実装手順](#実装手順)
- [トラブルシューティング](#トラブルシューティング)
- [将来の SDK 対応について](#将来の-sdk-対応について)

---

## 前提知識

### Azure Voice Live API とは

Azure Voice Live API は、リアルタイムの音声会話と、オプションでアバター（Talking Avatar）による視覚的な対話を提供する API です。

**主な機能:**
- リアルタイム音声認識
- 音声合成（Text-to-Speech）
- 会話の文脈管理
- **Talking Avatar** - 音声に同期した3Dアバターの表示

### WebRTC による Avatar 配信

アバター機能は WebRTC（Web Real-Time Communication）プロトコルを使用して実装されています：

1. **クライアント**: WebRTC の `RTCPeerConnection` で SDP Offer を作成
2. **Azure**: SDP Answer を返し、WebRTC 接続を確立
3. **メディアストリーム**: 音声 + ビデオ（アバター映像）がリアルタイムで配信

---

## SDK の制限事項

### 問題の詳細

**Python SDK (`azure-ai-voicelive` v1.1.0) は、アバター機能の WebRTC シグナリングをサポートしていません。**

#### JavaScript SDK との比較

| 機能 | JavaScript SDK | Python SDK |
|------|----------------|------------|
| 音声認識・合成 | ✅ サポート | ✅ サポート |
| 会話管理 | ✅ サポート | ✅ サポート |
| **Avatar WebRTC** | ✅ `avatarSynthesizer.startAvatarAsync()` | ❌ **未サポート** |
| Avatar イベント処理 | ✅ `session.avatar.*` イベント | ❌ **未サポート** |
| Avatar チャネル | ✅ `connection.avatar` | ❌ **未実装** |

#### 具体的な不足機能

Python SDK には以下の機能が実装されていません：

```python
# ❌ 存在しないメソッド/プロパティ
connection.avatar  # AttributeError
session.send_avatar_offer()  # メソッドなし
ServerEventType.SESSION_AVATAR_CONNECTING  # Enum に存在しない
```

**実際のエラー例:**
```python
# 試行: Avatar チャネルにアクセス
avatar_channel = connection.avatar
# 結果: AttributeError: 'VoiceLiveConnection' object has no attribute 'avatar'
```

---

## 実装アーキテクチャ

### ハイブリッドアプローチ

SDK の制限を回避するため、以下のハイブリッドアプローチを採用しました：

```
┌─────────────────────────────────────────────────────────────┐
│ クライアント (React + TypeScript)                              │
├─────────────────────────────────────────────────────────────┤
│  • RTCPeerConnection で WebRTC Offer 作成                    │
│  • ICE Gathering 完了を待機                                   │
│  • カスタム WebSocket メッセージで Offer 送信                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ WebSocket (カスタムプロトコル)
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ バックエンド (FastAPI + Python)                               │
├─────────────────────────────────────────────────────────────┤
│  【SDK 使用部分】                                             │
│  • セッション管理 (VoiceLiveConnection)                       │
│  • 音声認識・合成                                             │
│  • 会話コンテキスト管理                                        │
│                                                              │
│  【SDK バイパス部分】 ⚠️ ハイブリッドアプローチ                │
│  • SDK 内部 WebSocket に直接アクセス                          │
│  • Avatar WebRTC シグナリング (session.avatar.connect)       │
│  • SDP の Base64 エンコード/デコード                          │
└─────────────────┬───────────────────────────────────────────┘
                  │ WebSocket (Azure 内部プロトコル)
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ Azure Voice Live API                                         │
├─────────────────────────────────────────────────────────────┤
│  • session.avatar.connect メッセージを受信                    │
│  • WebRTC SDP Answer を生成                                  │
│  • session.avatar.connecting イベントで返信                   │
│  • メディアストリーム配信 (音声 + ビデオ)                      │
└─────────────────────────────────────────────────────────────┘
```

### 使い分けの原則

| 機能カテゴリ | 使用方法 | 理由 |
|-------------|---------|------|
| **セッション管理** | ✅ SDK を使用 | 正式サポートされており安定 |
| **音声認識・合成** | ✅ SDK を使用 | 正式サポートされており安定 |
| **会話管理** | ✅ SDK を使用 | 正式サポートされており安定 |
| **Avatar WebRTC** | ⚠️ SDK バイパス | SDK 未対応のため、内部 WebSocket を直接操作 |

---

## ハイブリッドアプローチの詳細

### 1. SDK 内部 WebSocket へのアクセス

Python SDK は内部的に `aiohttp` の `ClientWebSocketResponse` を使用しています。この内部 WebSocket に直接アクセスします。

**実装コード:**

```python
# apps/backend/app/services/voice_live_session.py

class VoiceLiveSession:
    async def request_avatar_answer(self, offer_sdp: str) -> str:
        """SDK内部のWebSocketから直接 session.avatar.connect を送信。
        
        ⚠️ 警告: この実装は SDK の内部実装に依存しています。
        SDK のバージョンアップ時に動作しなくなる可能性があります。
        """
        connection = self._ensure_connection()
        
        # SDK 内部の WebSocket を取得（非公開 API）
        raw_ws = getattr(connection, "_connection", None)
        if raw_ws is None:
            raise VoiceLiveSessionError(
                "Cannot access internal WebSocket (_connection) from SDK"
            )
        
        # ... (続く)
```

**重要なポイント:**
- `_connection` は非公開属性（`_` プレフィックス）
- SDK の内部実装変更でアクセス不可になる可能性がある
- `aiohttp.ClientWebSocketResponse` 型であることを前提

### 2. SDP の Base64 エンコード

Azure Voice Live API は、SDP（Session Description Protocol）を Base64 エンコードされた JSON 形式で要求します。

**エンコード処理:**

```python
@staticmethod
def _encode_client_sdp(client_sdp: str) -> str:
    """Client SDP を Base64 エンコード。
    
    Azure が期待する形式:
    Base64(JSON({"type": "offer", "sdp": "<raw_sdp>"}))
    """
    payload = json.dumps({
        "type": "offer",
        "sdp": client_sdp
    })
    encoded = base64.b64encode(payload.encode("utf-8")).decode("ascii")
    return encoded
```

**デコード処理:**

```python
@staticmethod
def _decode_server_sdp(server_sdp_raw: str) -> str | None:
    """Server SDP を Base64 デコード。
    
    Azure からの形式:
    - Base64(JSON({"type": "answer", "sdp": "<raw_sdp>"}))
    - または生の SDP (v=0 で始まる)
    """
    # 生の SDP の場合
    if server_sdp_raw.startswith("v=0"):
        return server_sdp_raw
    
    # Base64 デコード
    try:
        decoded_bytes = base64.b64decode(server_sdp_raw)
        decoded_str = decoded_bytes.decode("utf-8")
        data = json.loads(decoded_str)
        return data.get("sdp")
    except Exception:
        return None
```

### 3. WebSocket メッセージ送信

Azure Voice Live API の内部プロトコルに従ってメッセージを送信します。

**メッセージ形式:**

```python
message = {
    "event_id": f"evt_{int(datetime.now().timestamp() * 1000)}",
    "type": "session.avatar.connect",
    "client_sdp": "<Base64 encoded SDP>",
    "rtc_configuration": {
        "bundle_policy": "max-bundle"
    }
}

# aiohttp WebSocket API を使用
await raw_ws.send_str(json.dumps(message))
```

**重要なポイント:**
- イベントタイプは `"session.avatar.connect"` (小文字、ドット区切り)
- SDK の Enum (`ServerEventType.SESSION_AVATAR_CONNECT`) は使用できない
- `send_str()` メソッドを使用（`send()` ではない）

### 4. イベントハンドリング

Azure からの応答イベント `session.avatar.connecting` を捕捉します。

**問題点:**
SDK の Enum には `SESSION_AVATAR_CONNECTING` が存在しないため、文字列比較で検出します。

**実装:**

```python
# apps/backend/app/api/routes/realtime.py

async for event in session.iter_events():
    # SDK の Enum ではなく、生の文字列で比較
    raw_event_type = str(event.type)
    
    if raw_event_type == "session.avatar.connecting":
        # Base64 デコードされた server_sdp を取得
        server_sdp_raw = getattr(event, "server_sdp", None)
        
        if server_sdp_raw:
            decoded_sdp = VoiceLiveSession._decode_server_sdp(server_sdp_raw)
            
            if decoded_sdp:
                # キューに追加してメインフローに渡す
                session._avatar_answer_queue.put_nowait(
                    AvatarAnswerEvent(sdp=decoded_sdp, description_type="answer")
                )
        continue
    
    # ... 他のイベント処理
```

**重要なポイント:**
- `str(event.type) == "session.avatar.connecting"` で文字列比較
- SDK の Enum パターンマッチは使用できない
- イベントループの**早い段階**でチェック（他の処理より優先）

### 5. asyncio.Queue による同期

非同期イベントハンドラとメインフローを `asyncio.Queue` で同期します。

**実装:**

```python
# voice_live_session.py
class VoiceLiveSession:
    def __init__(self, ...):
        self._avatar_answer_queue: asyncio.Queue[AvatarAnswerEvent] = asyncio.Queue()
    
    async def request_avatar_answer(self, offer_sdp: str) -> str:
        # WebSocket 送信
        await raw_ws.send_str(message_str)
        
        # イベントハンドラからの応答を待機（60秒タイムアウト）
        answer_event = await asyncio.wait_for(
            self._avatar_answer_queue.get(),
            timeout=60.0
        )
        return answer_event.sdp
```

---

## 実装手順

### バックエンド実装

#### 1. VoiceLiveSession クラスの拡張

```python
# apps/backend/app/services/voice_live_session.py

from dataclasses import dataclass
import asyncio
import base64
import json
from datetime import datetime

@dataclass
class AvatarAnswerEvent:
    """Avatar WebRTC Answer イベント"""
    sdp: str
    description_type: str  # "answer"

class VoiceLiveSession:
    def __init__(self, ...):
        self._avatar_answer_queue: asyncio.Queue[AvatarAnswerEvent] = asyncio.Queue()
    
    @staticmethod
    def _encode_client_sdp(client_sdp: str) -> str:
        # (前述の実装)
        pass
    
    @staticmethod
    def _decode_server_sdp(server_sdp_raw: str) -> str | None:
        # (前述の実装)
        pass
    
    @staticmethod
    def _generate_event_id(prefix: str = "evt") -> str:
        timestamp = int(datetime.now().timestamp() * 1000)
        return f"{prefix}_{timestamp}"
    
    async def request_avatar_answer(self, offer_sdp: str) -> str:
        # (前述の実装)
        pass
```

#### 2. WebSocket ルートの実装

```python
# apps/backend/app/api/routes/realtime.py

@router.websocket("/ws")
async def realtime_websocket(websocket: WebSocket):
    # ... セッション確立
    
    async for event in session.iter_events():
        raw_event_type = str(event.type)
        
        # Avatar イベントを最優先で処理
        if raw_event_type == "session.avatar.connecting":
            server_sdp_raw = getattr(event, "server_sdp", None)
            if server_sdp_raw:
                decoded_sdp = VoiceLiveSession._decode_server_sdp(server_sdp_raw)
                if decoded_sdp:
                    session._avatar_answer_queue.put_nowait(
                        AvatarAnswerEvent(sdp=decoded_sdp, description_type="answer")
                    )
            continue
        
        # ... 他のイベント処理
```

#### 3. クライアント Offer 受信処理

```python
if client_message.type == "avatar.client_offer":
    try:
        offer_sdp = client_message.payload.offer.sdp
        
        # Azure に offer を送信して answer を取得
        answer = await session.request_avatar_answer(offer_sdp)
        
        # クライアントに answer を返す
        await websocket.send_json({
            "type": "session.event",
            "event": "avatar.answer",
            "data": {
                "answer": {
                    "type": "answer",
                    "sdp": answer
                }
            }
        })
    except VoiceLiveSessionError as error:
        logger.exception("avatar client offer processing failed")
        await _send_error(websocket, f"avatar offer processing failed: {error}")
```

### フロントエンド実装

#### 1. WebRTC PeerConnection の作成

```typescript
// apps/frontend/src/hooks/useLiveVoiceSession.ts

const peerConnection = new RTCPeerConnection(configuration);

// Transceiver を追加（受信専用）
peerConnection.addTransceiver('audio', { direction: 'recvonly' });
peerConnection.addTransceiver('video', { direction: 'recvonly' });

const remoteStream = new MediaStream();
```

#### 2. ICE Gathering 完了待機（重要！）

**これは必須です。** ICE Gathering が完了する前に Offer を送信すると、WebRTC 接続に失敗します。

```typescript
// Offer を作成
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

// ⚠️ 重要: ICE Gathering 完了を待機
if (peerConnection.iceGatheringState !== 'complete') {
  await new Promise<void>((resolve) => {
    const checkGathering = () => {
      if (peerConnection.iceGatheringState === 'complete') {
        resolve();
      } else {
        setTimeout(checkGathering, 50);
      }
    };
    checkGathering();
    
    // タイムアウト: 5秒
    setTimeout(() => resolve(), 5000);
  });
}

// 最新の localDescription を取得（ICE candidates 含む）
const finalOffer = peerConnection.localDescription;
```

#### 3. Offer 送信と Answer 受信

```typescript
// サーバーに Offer を送信
ws.send(JSON.stringify({
  type: 'avatar.client_offer',
  payload: {
    offer: {
      type: finalOffer.type,
      sdp: finalOffer.sdp,
    },
  },
}));

// Answer を受信
ws.addEventListener('message', async (event) => {
  const message = JSON.parse(event.data);
  
  if (message.event === 'avatar.answer') {
    const answer = message.data.answer;
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: 'answer',
        sdp: answer.sdp,
      })
    );
  }
});
```

#### 4. メディアトラック処理

```typescript
peerConnection.ontrack = (event) => {
  event.streams.forEach((stream) => {
    stream.getTracks().forEach((track) => {
      remoteStream.addTrack(track);
      
      // 音声トラックのミュート解除
      if (track.kind === 'audio' && track.muted) {
        track.addEventListener('unmute', () => {
          console.log('Audio track unmuted');
        });
        
        // トラックをリフレッシュ
        track.enabled = false;
        setTimeout(() => {
          track.enabled = true;
        }, 100);
      }
    });
  });
};
```

#### 5. ビデオ要素への接続

```typescript
const videoElement = document.querySelector('video');

// ⚠️ 重要: muted を false に設定
videoElement.muted = false;
videoElement.volume = 1.0;
videoElement.srcObject = remoteStream;

// 再生開始
await videoElement.play();
```

---

## トラブルシューティング

### 問題 1: WebRTC 接続が確立しない

**症状:**
- `iceConnectionState` が `disconnected` または `failed`
- ビデオが表示されない

**原因:**
ICE Gathering が完了する前に Offer を送信している。

**解決策:**
```typescript
// ICE Gathering 完了を待機してから送信
if (peerConnection.iceGatheringState !== 'complete') {
  await new Promise<void>((resolve) => {
    // ... (前述のコード)
  });
}
```

### 問題 2: ビデオは表示されるが音声が出ない

**症状:**
- アバターの映像は表示される
- 口が動いているが音が出ない
- `audioTrack.muted` が `false` でも音が出ない

**原因:**
ビデオ要素自体が `muted=true` になっている。

**解決策:**
```typescript
// ビデオ要素の muted プロパティを確実に false に
videoElement.muted = false;
videoElement.volume = 1.0;

// トラック追加後に再設定
videoElement.srcObject = remoteStream;
await videoElement.play();
```

### 問題 3: `session.avatar.connecting` イベントを受信できない

**症状:**
- WebSocket 送信は成功
- Azure からの応答が受信できない
- タイムアウトエラー

**原因:**
イベントループで文字列比較を行っていない。

**解決策:**
```python
# SDK Enum ではなく文字列で比較
raw_event_type = str(event.type)
if raw_event_type == "session.avatar.connecting":
    # 処理
```

### 問題 4: `TypeError: send() missing required argument`

**症状:**
```
TypeError: ClientWebSocketResponse.send() missing 1 required positional argument: 'message'
```

**原因:**
`aiohttp` の WebSocket は `send_str()` メソッドを使用する必要がある。

**解決策:**
```python
# ❌ 間違い
await raw_ws.send(message_str)

# ✅ 正しい
await raw_ws.send_str(message_str)
```

---

## 将来の SDK 対応について

### 理想的な実装（SDK 対応後）

Python SDK が将来的にアバター機能をサポートした場合、実装は以下のように簡素化されるはずです。

#### バックエンド（予想される実装）

```python
# 理想的な実装（SDK 対応後）
from azure.ai.voicelive.aio import connect
from azure.ai.voicelive.models import ServerEventType

async def handle_avatar_offer(connection, offer_sdp: str) -> str:
    """
    SDK がサポートすれば、このようなシンプルな実装になるはず。
    
    ⚠️ 注意: これは現在動作しません。将来の SDK バージョンを想定した例です。
    """
    
    # Avatar チャネルが追加される（予想）
    avatar_channel = connection.avatar
    
    # Avatar Offer を送信するメソッドが追加される（予想）
    answer_event = await avatar_channel.send_offer(offer_sdp)
    
    return answer_event.sdp

# イベント処理も Enum で可能に
async for event in connection.iter_events():
    if event.type == ServerEventType.SESSION_AVATAR_CONNECTING:
        # Enum でパターンマッチング可能
        answer_sdp = event.server_sdp
        # 処理...
```

#### JavaScript SDK との機能パリティ

Python SDK が JavaScript SDK と同等の機能を持つ場合：

```python
# JavaScript SDK の avatarSynthesizer.startAvatarAsync() に相当
from azure.ai.voicelive.aio import VoiceAvatarSynthesizer

synthesizer = VoiceAvatarSynthesizer(
    speech_config=speech_config,
    avatar_config=avatar_config
)

# WebRTC 接続を自動で管理
result = await synthesizer.start_avatar_async(offer_sdp)
answer_sdp = result.answer_sdp
```

### SDK アップデート時の移行計画

SDK がアバター機能をサポートした場合、以下の手順で移行できます：

#### Phase 1: SDK メソッドの存在確認

```python
# 後方互換性を保ちながら新機能を使用
if hasattr(connection, 'avatar'):
    # SDK 対応版: 公式 API を使用
    answer = await connection.avatar.send_offer(offer_sdp)
else:
    # フォールバック: 現在のハイブリッド実装を使用
    answer = await self._legacy_avatar_implementation(offer_sdp)
```

#### Phase 2: 完全移行

```python
# ハイブリッド実装を削除し、SDK のみを使用
async def request_avatar_answer(self, offer_sdp: str) -> str:
    connection = self._ensure_connection()
    
    # SDK の公式 Avatar API を使用
    avatar_channel = connection.avatar
    answer_event = await avatar_channel.send_offer(offer_sdp)
    
    return answer_event.sdp
```

#### Phase 3: コード削除

以下のコードが不要になります：
- `_encode_client_sdp()` / `_decode_server_sdp()` - SDK が自動処理
- 内部 WebSocket アクセス (`_connection`) - 不要
- 文字列ベースのイベント検出 - Enum で処理可能
- `asyncio.Queue` 同期 - SDK が管理

---

## まとめ

### 現在の実装の特徴

✅ **メリット:**
- Azure Voice Live API の完全な機能（アバター含む）を利用可能
- Python バックエンドで実装できる
- SDK の他の機能（音声認識・合成、会話管理）は正式サポート

⚠️ **デメリット:**
- SDK の内部実装に依存（`_connection` 属性）
- SDK バージョンアップ時に動作しなくなる可能性
- メンテナンスコストが高い

### 推奨事項

1. **SDK のアップデート監視**
   - `azure-ai-voicelive` の新バージョンをチェック
   - Avatar 機能のサポート状況を確認

2. **移行準備**
   - ハイブリッド実装を別メソッドに分離
   - SDK 対応時の移行パスを明確化

3. **代替案の検討**
   - JavaScript/TypeScript バックエンドへの移行
   - Microsoft に Python SDK のアバター対応を要望

### 参考リンク

- [Azure Voice Live API ドキュメント](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live-api)
- [azure-ai-voicelive Python SDK](https://pypi.org/project/azure-ai-voicelive/)
- [WebRTC 仕様](https://webrtc.org/)

---

## バージョン情報

- **作成日**: 2025-11-08
- **SDK バージョン**: `azure-ai-voicelive` 1.1.0
- **API バージョン**: 2025-10-01
- **動作確認環境**:
  - Python: 3.11+
  - FastAPI: 0.115+
  - React: 19.2.0
  - TypeScript: 5.6+

---

## ライセンス

このドキュメントは MIT ライセンスで提供されます。
