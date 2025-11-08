import { useCallback, useEffect, useRef, useState } from 'react';
import { getRealtimeApiBaseUrl, getRealtimeApiKey } from '../services/realtimeApi';

const TARGET_SAMPLE_RATE = 24_000;
const MAX_LOG_ENTRIES = 200;
const PCM_FRAME_SIZE = 2; // PCM16 bytes per sample

export type LiveVoiceSessionStatus = 'idle' | 'connecting' | 'ready' | 'stopping' | 'error';

export type AvatarStreamState = 'idle' | 'connecting' | 'ready';

interface AvatarIceServerPayload {
  urls?: string | string[];
  username?: string;
  credential?: string;
}

interface AvatarOfferDescriptionPayload {
  type?: string;
  sdp?: string;
}

interface AvatarOfferEventPayload {
  offer?: AvatarOfferDescriptionPayload | null;
  iceServers?: AvatarIceServerPayload[] | null;
}

interface AvatarSessionInfoPayload extends AvatarOfferEventPayload {
  character?: string;
  style?: string;
  state?: string;
}

interface AvatarIceCandidatePayload {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

type LogLevel = 'info' | 'warn' | 'error';

export interface LiveVoiceSessionConfig {
  modelId: string;
  voiceId: string;
  instructions?: string;
  language?: string;
  phraseList?: string[];
  semanticVad: 'azure_semantic_vad' | 'semantic_vad';
  enableEou: boolean;
  agentId?: string;
  customSpeechEndpoint?: string;
  avatarId?: string;
}

export interface LiveVoiceLogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
}

export interface LiveVoiceMetrics {
  sentAudioBytes: number;
  receivedAudioBytes: number;
  responseCount: number;
}

const buildWebSocketUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const apiBase = getRealtimeApiBaseUrl();

  if (apiBase) {
    const base = new URL(apiBase);
    const target = new URL(normalized, base);
    target.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    return target.toString();
  }

  if (typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${host}${normalized}`;
  }

  return normalized;
};

/**
 * PCM16エンコードとリサンプリング関数
 * 現在は AudioWorklet プロセッサ側に実装されているが、
 * フォールバック用にここにも保持
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const floatToPcm16Buffer = (input: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(input.length * PCM_FRAME_SIZE);
  const view = new DataView(buffer);

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * PCM_FRAME_SIZE, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const resampleToTarget = (
  input: Float32Array,
  inputRate: number,
  targetRate: number,
): Float32Array => {
  if (inputRate === targetRate) {
    return input;
  }

  if (!input.length) {
    return input;
  }

  const sampleCount = Math.floor((input.length * targetRate) / inputRate);
  if (sampleCount <= 0) {
    return new Float32Array(0);
  }

  const output = new Float32Array(sampleCount);
  const ratio = inputRate / targetRate;

  for (let i = 0; i < sampleCount; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const nextIndex = Math.min(index + 1, input.length - 1);
    const weight = position - index;
    const sample = input[index] + (input[nextIndex] - input[index]) * weight;
    output[i] = sample;
  }

  return output;
};

const decodePcm16 = (buffer: ArrayBuffer): Float32Array => {
  const view = new DataView(buffer);
  const length = buffer.byteLength / PCM_FRAME_SIZE;
  const output = new Float32Array(length);

  for (let i = 0; i < length; i += 1) {
    output[i] = view.getInt16(i * PCM_FRAME_SIZE, true) / 0x8000;
  }

  return output;
};

export const useLiveVoiceSession = () => {
  const [status, setStatus] = useState<LiveVoiceSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LiveVoiceLogEntry[]>([]);
  const [metrics, setMetrics] = useState<LiveVoiceMetrics>({
    sentAudioBytes: 0,
    receivedAudioBytes: 0,
    responseCount: 0,
  });

  const [avatarState, setAvatarState] = useState<AvatarStreamState>('idle');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const inhaleGainNodeRef = useRef<GainNode | null>(null);
  const playbackNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const playbackCursorRef = useRef<number>(0);
  const streamingEnabledRef = useRef<boolean>(false);
  const statusRef = useRef<LiveVoiceSessionStatus>('idle');
  const closingRef = useRef<boolean>(false);
  const inputSampleRateRef = useRef<number>(TARGET_SAMPLE_RATE);
  const metricsRef = useRef<LiveVoiceMetrics>({ sentAudioBytes: 0, receivedAudioBytes: 0, responseCount: 0 });
  const avatarStateRef = useRef<AvatarStreamState>('idle');
  const avatarPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const avatarRemoteStreamRef = useRef<MediaStream | null>(null);
  const avatarElementRef = useRef<HTMLVideoElement | null>(null);
  const avatarCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  const appendLog = useCallback((level: LogLevel, message: string) => {
    setLogs((previous) => {
      const next = [...previous, { timestamp: Date.now(), level, message }];
      if (next.length > MAX_LOG_ENTRIES) {
        return next.slice(next.length - MAX_LOG_ENTRIES);
      }
      return next;
    });
  }, []);

  const resetMetrics = useCallback(() => {
    const base: LiveVoiceMetrics = { sentAudioBytes: 0, receivedAudioBytes: 0, responseCount: 0 };
    metricsRef.current = base;
    setMetrics(base);
  }, []);

  const updateMetrics = useCallback((delta: Partial<LiveVoiceMetrics>) => {
    metricsRef.current = {
      sentAudioBytes: metricsRef.current.sentAudioBytes + (delta.sentAudioBytes ?? 0),
      receivedAudioBytes: metricsRef.current.receivedAudioBytes + (delta.receivedAudioBytes ?? 0),
      responseCount: metricsRef.current.responseCount + (delta.responseCount ?? 0),
    };
    setMetrics({ ...metricsRef.current });
  }, []);

  const cleanupAvatarConnection = useCallback(async () => {
    const pc = avatarPeerConnectionRef.current;
    avatarPeerConnectionRef.current = null;
    avatarCandidateQueueRef.current = [];

    if (pc) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.getSenders().forEach((sender) => {
          try {
            sender.track?.stop();
          } catch (trackError) {
            console.debug('avatar sender track stop error', trackError);
          }
        });
        pc.getReceivers().forEach((receiver) => {
          try {
            receiver.track?.stop();
          } catch (trackError) {
            console.debug('avatar receiver track stop error', trackError);
          }
        });
        pc.getTransceivers().forEach((transceiver) => {
          try {
            transceiver.stop?.();
          } catch (stopError) {
            console.debug('avatar transceiver stop error', stopError);
          }
        });
        pc.close();
      } catch (closeError) {
        console.debug('avatar peer connection close error', closeError);
      }
    }

    const stream = avatarRemoteStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (trackError) {
          console.debug('avatar track stop error', trackError);
        }
      });
      avatarRemoteStreamRef.current = null;
    }

    const element = avatarElementRef.current;
    if (element) {
      try {
        if ('srcObject' in element && element.srcObject) {
          (element as HTMLVideoElement).srcObject = null;
        }
        element.removeAttribute('src');
        element.load?.();
      } catch (elementError) {
        console.debug('avatar element cleanup error', elementError);
      }
    }

    avatarStateRef.current = 'idle';
    setAvatarState('idle');
  }, []);

  const attachAvatarElement = useCallback((element: HTMLVideoElement | null) => {
    avatarElementRef.current = element;

    if (!element) {
      return;
    }

    element.playsInline = true;
    element.autoplay = true;
    element.controls = false;
    element.muted = true;

    const stream = avatarRemoteStreamRef.current;
    if (stream) {
      try {
        element.srcObject = stream;
        void element.play().catch((error) => {
          console.debug('avatar element play error', error);
        });
      } catch (attachError) {
        console.debug('avatar element attach error', attachError);
      }
    }
  }, []);

  const cleanupAudioGraph = useCallback(async () => {
    await cleanupAvatarConnection();

    streamingEnabledRef.current = false;

    const workletNode = workletNodeRef.current;
    if (workletNode) {
      workletNode.disconnect();
      workletNode.port.postMessage({ type: 'setStreamingEnabled', data: false });
      workletNodeRef.current = null;
    }

    const sourceNode = sourceNodeRef.current;
    if (sourceNode) {
      sourceNode.disconnect();
      sourceNodeRef.current = null;
    }

    const gainNode = inhaleGainNodeRef.current;
    if (gainNode) {
      gainNode.disconnect();
      inhaleGainNodeRef.current = null;
    }

    playbackNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch (stopError) {
        console.debug('playback node stop error', stopError);
      }
      node.disconnect();
    });
    playbackNodesRef.current.clear();
    playbackCursorRef.current = 0;

    const mediaStream = mediaStreamRef.current;
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const audioContext = audioContextRef.current;
    if (audioContext) {
      try {
        await audioContext.close();
      } catch (closeError) {
        console.debug('audio context close error', closeError);
      }
      audioContextRef.current = null;
    }
  }, [cleanupAvatarConnection]);

  const handleFatalError = useCallback(
    async (message: string) => {
      const detail = message || 'セッションエラー';
      appendLog('error', detail);
      setError(detail);
      streamingEnabledRef.current = false;

      const ws = wsRef.current;
      closingRef.current = true;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try {
          ws.close(1011, 'server-error');
        } catch (closeError) {
          console.debug('websocket close error', closeError);
        }
      }
      wsRef.current = null;

      await cleanupAudioGraph();

      setStatus('error');
      statusRef.current = 'error';
      closingRef.current = false;
    },
    [appendLog, cleanupAudioGraph],
  );

  const stop = useCallback(async () => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    setStatus('stopping');
    statusRef.current = 'stopping';

    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close(1000, 'client-stop');
      } catch (closeError) {
        console.debug('websocket close error', closeError);
      }
    }
    wsRef.current = null;

    await cleanupAudioGraph();

    setStatus('idle');
    statusRef.current = 'idle';
    closingRef.current = false;
    appendLog('info', 'セッションを終了しました');
  }, [appendLog, cleanupAudioGraph]);

  const handleServerAudio = useCallback((buffer: ArrayBuffer) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) {
      appendLog('warn', 'AudioContext が存在しません');
      return;
    }

    // AudioContextがsuspended状態の場合、resumeする
    if (audioContext.state === 'suspended') {
      appendLog('info', 'AudioContext を再開しています...');
      audioContext.resume().catch((error) => {
        appendLog('error', `AudioContext の再開に失敗: ${error}`);
      });
    }

    const floatData = decodePcm16(buffer);
    if (!floatData.length) {
      appendLog('warn', '音声データのデコードに失敗しました');
      return;
    }

    appendLog('info', `音声データ受信: ${buffer.byteLength}バイト, ${floatData.length}サンプル`);

    const audioBuffer = audioContext.createBuffer(1, floatData.length, TARGET_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(floatData);

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);

    const startAt = Math.max(audioContext.currentTime, playbackCursorRef.current);
    sourceNode.start(startAt);
    playbackCursorRef.current = startAt + audioBuffer.duration;

    appendLog('info', `音声再生開始: ${startAt.toFixed(3)}秒から ${audioBuffer.duration.toFixed(3)}秒間`);

    playbackNodesRef.current.add(sourceNode);
    sourceNode.onended = () => {
      sourceNode.disconnect();
      playbackNodesRef.current.delete(sourceNode);
    };

    updateMetrics({ receivedAudioBytes: buffer.byteLength });
  }, [appendLog, updateMetrics]);

  const handleAvatarIceCandidate = useCallback(
    async (payload: AvatarIceCandidatePayload) => {
      if (!payload || !payload.candidate) {
        return;
      }

      const candidateInit: RTCIceCandidateInit = {
        candidate: payload.candidate,
        sdpMid: payload.sdpMid ?? undefined,
        sdpMLineIndex:
          typeof payload.sdpMLineIndex === 'number' && Number.isFinite(payload.sdpMLineIndex)
            ? payload.sdpMLineIndex
            : undefined,
      };

      const peerConnection = avatarPeerConnectionRef.current;
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(candidateInit);
        } catch (error) {
          appendLog('warn', `アバター ICE candidate の追加に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
      }

      avatarCandidateQueueRef.current.push(candidateInit);
    },
    [appendLog],
  );

  // クライアント主導の WebRTC ネゴシエーション（Azure は offer を提供しない）
  const handleAvatarSessionUpdated = useCallback(
    async (payload: AvatarSessionInfoPayload) => {
      if (!payload.iceServers || payload.iceServers.length === 0) {
        appendLog('warn', 'ICEサーバが提供されていません');
        return;
      }

      appendLog('info', 'クライアント側で WebRTC 接続を開始します');
      appendLog('info', `ICEサーバ数: ${payload.iceServers.length}`);

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        appendLog('warn', 'WebSocket が開いていません');
        return;
      }

      await cleanupAvatarConnection();

      avatarStateRef.current = 'connecting';
      setAvatarState('connecting');

      // ICE サーバを設定
      const iceServers: RTCIceServer[] = payload.iceServers
        .map((server) => {
          if (!server) return null;
          const rawUrls = server.urls;
          const urls = Array.isArray(rawUrls)
            ? rawUrls.map((entry) => entry.toString())
            : rawUrls
              ? [rawUrls.toString()]
              : [];
          if (urls.length === 0) return null;
          const entry: RTCIceServer = { urls };
          if (server.username) entry.username = server.username;
          if (server.credential) entry.credential = server.credential;
          return entry;
        })
        .filter((candidate): candidate is RTCIceServer => candidate !== null);

      const configuration: RTCConfiguration = { iceServers };
      appendLog('info', `ICEサーバ設定: ${iceServers.length}個のサーバ`);
      iceServers.forEach((server, index) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        appendLog('info', `  ICEサーバ[${index}]: ${urls.join(', ')}`);
      });

      const peerConnection = new RTCPeerConnection(configuration);
      avatarPeerConnectionRef.current = peerConnection;
      appendLog('info', 'RTCPeerConnection を作成しました');

      // transceiverを追加して音声とビデオの受信を明示的に有効化
      peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      peerConnection.addTransceiver('video', { direction: 'recvonly' });

      const remoteStream = new MediaStream();
      avatarRemoteStreamRef.current = remoteStream;

      const element = avatarElementRef.current;
      if (element) {
        element.srcObject = remoteStream;
        appendLog('info', 'ビデオ要素に MediaStream をセットしました');
        
        // トラック追加後に再生するため、ここでは play() を呼ばない
        // ontrack ハンドラでトラックが揃ってから再生する
      }

      // ontrack ハンドラ
      peerConnection.ontrack = (event) => {
        appendLog('info', `メディアトラックを受信: kind=${event.track.kind}`);
        event.streams.forEach((stream) => {
          stream.getTracks().forEach((track) => {
            remoteStream.addTrack(track);
            
            // 音声トラックの場合、ミュート状態を確認し、ミュートを解除
            if (track.kind === 'audio') {
              // トラックがミュートされている場合は解除を試みる
              if (track.muted) {
                appendLog('info', '音声トラック: 初期ミュート状態 - 解除待機中');
                
                // muted プロパティは読み取り専用なので、unmute イベントをリッスン
                track.addEventListener('unmute', () => {
                  appendLog('info', '音声トラックのミュート解除成功');
                });
                
                // enabled を一度 false にしてから true に戻してトラックをリフレッシュ
                track.enabled = false;
                setTimeout(() => {
                  track.enabled = true;
                }, 100);
              }
            }
          });
        });
        
        if (remoteStream.getTracks().length > 0 && avatarStateRef.current === 'connecting') {
          avatarStateRef.current = 'ready';
          setAvatarState('ready');
          appendLog('info', 'アバターストリーム準備完了');
          
          // video 要素に stream がセットされているか確認
          const videoElement = avatarElementRef.current;
          if (videoElement) {
            // トラック追加後に srcObject を再設定してリフレッシュ
            videoElement.srcObject = remoteStream;
            
            // ミュートを確実に解除
            videoElement.muted = false;
            videoElement.volume = 1.0;
            
            // トラックが揃ったので再生を開始
            videoElement.play().then(() => {
              appendLog('info', 'アバター映像・音声の再生を開始しました');
            }).catch((error) => {
              appendLog('error', `再生失敗: ${error.message}`);
            });
          }
        }
      };

      // ICE candidate ハンドラ
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(
            JSON.stringify({
              type: 'avatar.ice_candidate',
              payload: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
              },
            }),
          );
        } else {
          appendLog('info', 'ICE gathering 完了');
        }
      };

      // 接続状態変化ハンドラ
      peerConnection.onconnectionstatechange = () => {
        appendLog(
          'info',
          `接続状態: ${peerConnection.connectionState} (ICE: ${peerConnection.iceConnectionState})`,
        );

        if (peerConnection.connectionState === 'connected') {
          appendLog('info', 'WebRTC 接続が確立されました');
        } else if (peerConnection.connectionState === 'failed') {
          appendLog('error', 'WebRTC 接続に失敗しました');
          avatarStateRef.current = 'idle';
          setAvatarState('idle');
        }
      };

      // トランシーバを追加（recvonly）
      peerConnection.addTransceiver('video', { direction: 'recvonly' });
      peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      appendLog('info', 'video/audio トランシーバを追加しました (recvonly)');

      try {
        // クライアント側で offer を作成
        appendLog('info', 'WebRTC offer を作成中...');
        const offer = await peerConnection.createOffer();
        appendLog('info', `Offer 作成完了: type=${offer.type}`);
        console.log('[WebRTC] Created offer SDP:', offer.sdp);

        appendLog('info', 'Local description を設定中...');
        await peerConnection.setLocalDescription(offer);
        appendLog('info', 'Local description 設定完了');

        // CRITICAL: ICE gathering が完了するまで待機
        appendLog('info', 'ICE gathering 完了を待機中...');
        if (peerConnection.iceGatheringState !== 'complete') {
          await new Promise<void>((resolve) => {
            const checkGathering = () => {
              if (peerConnection.iceGatheringState === 'complete') {
                appendLog('info', 'ICE gathering 完了');
                resolve();
              } else {
                setTimeout(checkGathering, 50);
              }
            };
            checkGathering();
            // タイムアウト: 5秒
            setTimeout(() => {
              appendLog('warn', 'ICE gathering タイムアウト (5秒)、現在の状態で送信します');
              resolve();
            }, 5000);
          });
        }

        // 最新の local description を取得（ICE candidate が含まれている）
        const finalOffer = peerConnection.localDescription;
        if (!finalOffer) {
          throw new Error('Local description が取得できません');
        }

        // サーバーに offer を送信
        appendLog('info', 'サーバーに offer を送信します');
        ws.send(
          JSON.stringify({
            type: 'avatar.client_offer',
            payload: {
              offer: {
                type: finalOffer.type,
                sdp: finalOffer.sdp,
              },
            },
          }),
        );
        appendLog('info', 'offer 送信完了');

      } catch (error) {
        console.error('[WebRTC] Offer 作成エラー:', error);
        appendLog('error', `Offer 作成エラー: ${error instanceof Error ? error.message : String(error)}`);
        avatarStateRef.current = 'idle';
        setAvatarState('idle');
      }
    },
    [appendLog, cleanupAvatarConnection],
  );

  // Azure から answer を受信したときの処理
  const handleAvatarAnswer = useCallback(
    async (data: { answer: { type: string; sdp: string } }) => {
      const peerConnection = avatarPeerConnectionRef.current;
      if (!peerConnection) {
        appendLog('warn', 'PeerConnection が存在しません');
        return;
      }

      try {
        appendLog('info', `Azure から answer を受信: type=${data.answer.type}`);
        console.log('[WebRTC] Received answer SDP:', data.answer.sdp);

        const remoteDesc = new RTCSessionDescription({
          type: 'answer',
          sdp: data.answer.sdp,
        });

        appendLog('info', 'Remote description を設定中...');
        await peerConnection.setRemoteDescription(remoteDesc);
        appendLog('info', 'Remote description 設定完了');

        // キューに溜まった ICE candidate を追加
        if (avatarCandidateQueueRef.current.length > 0) {
          appendLog('info', `キューから ${avatarCandidateQueueRef.current.length} 個の ICE candidate を追加します`);
          for (const candidate of avatarCandidateQueueRef.current) {
            try {
              await peerConnection.addIceCandidate(candidate);
            } catch (error) {
              console.error('[WebRTC] ICE candidate 追加エラー:', error);
            }
          }
          avatarCandidateQueueRef.current = [];
        }
      } catch (error) {
        console.error('[WebRTC] Answer 処理エラー:', error);
        appendLog('error', `Answer 処理エラー: ${error instanceof Error ? error.message : String(error)}`);
        avatarStateRef.current = 'idle';
        setAvatarState('idle');
      }
    },
    [appendLog],
  );

  const handleAvatarOffer = useCallback(
    async (payload?: AvatarOfferEventPayload | AvatarSessionInfoPayload | null) => {
      if (!payload || !payload.offer || !payload.offer.sdp) {
        appendLog('warn', 'アバターの WebRTC オファーが無効です');
        return;
      }

      appendLog('info', `WebRTC Offer を受信: type=${payload.offer.type}, sdp長=${payload.offer.sdp.length}`);
      appendLog('info', `ICEサーバ数: ${payload.iceServers?.length || 0}`);

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        appendLog('warn', 'アバターのオファーを受信しましたが WebSocket が開いていません');
        return;
      }

      await cleanupAvatarConnection();

      avatarStateRef.current = 'connecting';
      setAvatarState('connecting');

      const iceServers: RTCIceServer[] = Array.isArray(payload.iceServers)
        ? payload.iceServers
            .map((server) => {
              if (!server) {
                return null;
              }
              const rawUrls = server.urls;
              const urls = Array.isArray(rawUrls)
                ? rawUrls.map((entry) => entry.toString())
                : rawUrls
                  ? [rawUrls.toString()]
                  : [];
              if (urls.length === 0) {
                return null;
              }
              const entry: RTCIceServer = { urls };
              if (server.username) {
                entry.username = server.username;
              }
              if (server.credential) {
                entry.credential = server.credential;
              }
              return entry;
            })
            .filter((candidate): candidate is RTCIceServer => candidate !== null)
        : [];

      const configuration: RTCConfiguration = {};
      if (iceServers.length > 0) {
        configuration.iceServers = iceServers;
        appendLog('info', `ICEサーバ設定: ${iceServers.length}個のサーバ`);
        iceServers.forEach((server, index) => {
          const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
          appendLog('info', `  ICEサーバ[${index}]: ${urls.join(', ')}`);
          if (server.username) {
            appendLog('info', `    username: ${server.username}`);
          }
        });
      } else {
        appendLog('warn', 'ICEサーバが設定されていません');
      }

      const peerConnection = new RTCPeerConnection(configuration);
      avatarPeerConnectionRef.current = peerConnection;
      appendLog('info', 'RTCPeerConnection を作成しました');

      const remoteStream = new MediaStream();
      avatarRemoteStreamRef.current = remoteStream;

      const element = avatarElementRef.current;
      if (element) {
        try {
          element.srcObject = remoteStream;
          void element.play().catch((error) => {
            console.debug('avatar element play error', error);
          });
        } catch (error) {
          console.debug('avatar element attach error', error);
        }
      }

      peerConnection.ontrack = (event) => {
        appendLog('info', `WebRTC ontrack イベント: streams=${event.streams.length}`);
        const [firstStream] = event.streams;
        const targetStream = firstStream ?? event.target;
        if (targetStream instanceof MediaStream) {
          appendLog('info', `MediaStream を受信: tracks=${targetStream.getTracks().length}`);
          avatarRemoteStreamRef.current = targetStream;
          const targetElement = avatarElementRef.current;
          if (targetElement) {
            try {
              targetElement.srcObject = targetStream;
              appendLog('info', 'video要素にMediaStreamを設定しました');
              void targetElement.play().catch((error) => {
                appendLog('warn', `video再生エラー: ${error instanceof Error ? error.message : String(error)}`);
                console.debug('avatar element play error', error);
              });
            } catch (attachError) {
              appendLog('warn', `video要素への設定エラー: ${attachError instanceof Error ? attachError.message : String(attachError)}`);
              console.debug('avatar element attach error', attachError);
            }
          }
        }
        avatarStateRef.current = 'ready';
        setAvatarState('ready');
        appendLog('info', 'アバター状態を ready に変更');
      };

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          appendLog('info', 'ICE candidate 収集完了（null candidate）');
          return;
        }

        appendLog('info', `ICE candidate を生成: ${event.candidate.candidate}`);
        const socket = wsRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          return;
        }

        const candidateInit = event.candidate;
        const message = {
          type: 'avatar.ice_candidate',
          candidate: candidateInit.candidate ?? '',
          sdpMid: candidateInit.sdpMid ?? null,
          sdpMLineIndex:
            typeof candidateInit.sdpMLineIndex === 'number' && Number.isFinite(candidateInit.sdpMLineIndex)
              ? candidateInit.sdpMLineIndex
              : null,
        };

        try {
          socket.send(JSON.stringify(message));
        } catch (error) {
          appendLog('warn', `アバター ICE candidate の送信に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        appendLog('info', `WebRTC 接続状態変化: ${state}`);
        if (state === 'connected') {
          avatarStateRef.current = 'ready';
          setAvatarState('ready');
          appendLog('info', 'アバターの WebRTC 接続が確立しました');
        } else if (state === 'failed') {
          appendLog('warn', 'アバターの WebRTC 接続が失敗しました');
        } else if (state === 'disconnected') {
          appendLog('warn', 'アバターの WebRTC 接続が切断されました');
        } else if (state === 'closed') {
          appendLog('info', 'アバターの WebRTC 接続がクローズされました');
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        appendLog('info', `ICE 接続状態変化: ${state}`);
      };

      peerConnection.onicegatheringstatechange = () => {
        const state = peerConnection.iceGatheringState;
        appendLog('info', `ICE 収集状態変化: ${state}`);
      };

      const offerDescription: RTCSessionDescriptionInit = {
        type: (payload.offer?.type as RTCSdpType | undefined) ?? 'offer',
        sdp: payload.offer?.sdp ?? '',
      };

      try {
        appendLog('info', 'setRemoteDescription を実行');
        await peerConnection.setRemoteDescription(offerDescription);
        appendLog('info', 'setRemoteDescription 完了');

        const pendingCandidates = avatarCandidateQueueRef.current.splice(0);
        appendLog('info', `保留中の ICE candidate を追加: ${pendingCandidates.length}個`);
        await Promise.all(
          pendingCandidates.map(async (candidate) => {
            try {
              await peerConnection.addIceCandidate(candidate);
            } catch (error) {
              appendLog(
                'warn',
                `アバター ICE candidate (queued) の追加に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }),
        );

        appendLog('info', 'createAnswer を実行');
        const answer = await peerConnection.createAnswer();
        appendLog('info', `createAnswer 完了: sdp長=${answer.sdp?.length || 0}`);
        
        appendLog('info', 'setLocalDescription を実行');
        await peerConnection.setLocalDescription(answer);
        appendLog('info', 'setLocalDescription 完了');

        const message = {
          type: 'avatar.answer',
          sdp: answer.sdp ?? '',
          descriptionType: answer.type ?? 'answer',
        };
        ws.send(JSON.stringify(message));
        appendLog('info', 'アバターの WebRTC アンサーを送信しました');
      } catch (error) {
        appendLog('error', `アバター WebRTC 設定に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        await cleanupAvatarConnection();
      }
    },
    [appendLog, cleanupAvatarConnection],
  );

  const handleServerEvent = useCallback(
    (event: { event?: string; message?: string; data?: Record<string, unknown> }) => {
      switch (event.event) {
        case 'session.updated':
          appendLog('info', `セッション開始: ${(event.data?.sessionId as string) ?? 'unknown'}`);
          if (event.data?.avatar) {
            const avatarPayload = event.data.avatar as AvatarSessionInfoPayload;
            console.log('[session.updated] アバター設定を受信:', avatarPayload);
            
            // Azure は offer を提供しないため、クライアント側で offer を作成
            if (avatarPayload.iceServers && avatarStateRef.current !== 'ready') {
              console.log('[session.updated] クライアント側で WebRTC offer を作成します');
              void handleAvatarSessionUpdated(avatarPayload);
            }
          }
          break;
        case 'input.speech_started':
          appendLog('info', 'ユーザー発話を検知しました');
          playbackNodesRef.current.forEach((node) => {
            try {
              node.stop();
            } catch (stopError) {
              console.debug('playback stop error', stopError);
            }
          });
          playbackCursorRef.current = audioContextRef.current?.currentTime ?? 0;
          break;
        case 'input.speech_stopped':
          appendLog('info', 'ユーザー発話の終了を検知しました');
          break;
        case 'response.audio_done':
          appendLog('info', 'アシスタント音声の送出が完了しました');
          break;
        case 'response.done':
          updateMetrics({ responseCount: 1 });
          break;
        case 'conversation.item_created':
          appendLog('info', `会話アイテム追加: ${(event.data?.itemId as string) ?? 'unknown'}`);
          break;
        case 'avatar.offer':
          void handleAvatarOffer(event.data as AvatarOfferEventPayload);
          break;
        case 'avatar.answer':
          console.log('[avatar.answer] Azure から answer を受信:', event.data);
          void handleAvatarAnswer(event.data as { answer: { type: string; sdp: string } });
          break;
        case 'avatar.ice_candidate':
          if (event.data) {
            void handleAvatarIceCandidate(event.data as unknown as AvatarIceCandidatePayload);
          }
          break;
        case 'avatar.stream_started':
          appendLog('info', 'アバター映像ストリームが開始されました');
          avatarStateRef.current = 'ready';
          setAvatarState('ready');
          break;
        case 'avatar.stream_stopped':
          appendLog('warn', 'アバター映像ストリームが停止しました');
          avatarStateRef.current = 'idle';
          setAvatarState('idle');
          void cleanupAvatarConnection();
          break;
        case 'avatar.ready':
          appendLog('info', 'アバターの準備が完了しました');
          avatarStateRef.current = 'ready';
          setAvatarState('ready');
          break;
        case 'avatar.answer.sent':
          appendLog('info', 'アバター WebRTC アンサーをバックエンドへ送信しました');
          break;
        default:
          if (event.event) {
            appendLog('info', `イベント: ${event.event}`);
          } else if (event.message) {
            appendLog('info', event.message);
          }
          break;
      }
    },
    [appendLog, cleanupAvatarConnection, handleAvatarIceCandidate, handleAvatarOffer, setAvatarState, updateMetrics],
  );

  const start = useCallback(
    async (config: LiveVoiceSessionConfig) => {
      if (statusRef.current === 'connecting' || statusRef.current === 'ready') {
        await stop();
      }

      closingRef.current = false;
      streamingEnabledRef.current = false;
      resetMetrics();
      setError(null);
      avatarCandidateQueueRef.current = [];
      avatarStateRef.current = 'idle';
      setAvatarState('idle');
      setStatus('connecting');
      statusRef.current = 'connecting';
      appendLog('info', 'Live Voice セッションに接続中…');

      const apiKey = getRealtimeApiKey();

      try {
        const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
        await audioContext.resume();
        audioContextRef.current = audioContext;
        inputSampleRateRef.current = audioContext.sampleRate;
        appendLog('info', `AudioContext 初期化完了: state=${audioContext.state}, sampleRate=${audioContext.sampleRate}Hz`);

        // AudioWorkletをロード
        try {
          await audioContext.audioWorklet.addModule('/audio-processor.js');
          appendLog('info', 'AudioWorklet モジュールをロード完了');
        } catch (error) {
          appendLog('error', `AudioWorklet ロード失敗: ${error}`);
          throw error;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: TARGET_SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          },
        });
        mediaStreamRef.current = mediaStream;

        const sourceNode = audioContext.createMediaStreamSource(mediaStream);
        sourceNodeRef.current = sourceNode;

        // AudioWorkletNodeを作成
        const workletNode = new AudioWorkletNode(audioContext, 'audio-stream-processor');
        workletNodeRef.current = workletNode;

        // サンプルレートを設定
        workletNode.port.postMessage({ type: 'setInputSampleRate', data: audioContext.sampleRate });

        // AudioWorkletからのメッセージを受信
        workletNode.port.onmessage = (event) => {
          if (event.data.type === 'audioData') {
            const pcmBuffer = event.data.data;
            const socket = wsRef.current;
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(pcmBuffer);
              updateMetrics({ sentAudioBytes: pcmBuffer.byteLength });
            }
          }
        };

        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        inhaleGainNodeRef.current = silentGain;

        sourceNode.connect(workletNode);
        workletNode.connect(silentGain);
        silentGain.connect(audioContext.destination);

        const wsUrl = new URL(buildWebSocketUrl('/api/v1/realtime/session'));
        if (apiKey) {
          wsUrl.searchParams.set('api_key', apiKey);
        }
        wsUrl.searchParams.set('client', 'web');

        const ws = new WebSocket(wsUrl.toString());
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
          appendLog('info', 'バックエンドと接続しました');
          const payload = {
            modelId: config.modelId,
            voiceId: config.voiceId,
            instructions: config.instructions,
            language: config.language,
            phraseList: config.phraseList ?? [],
            semanticVad: config.semanticVad,
            enableEou: config.enableEou,
            agentId: config.agentId,
            customSpeechEndpoint: config.customSpeechEndpoint,
            avatarId: config.avatarId,
          };
          appendLog('info', `セッション設定を送信: modelId=${config.modelId}, avatarId=${config.avatarId || '(なし)'}`);
          ws.send(JSON.stringify({ type: 'session.configure', payload }));
        };

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const parsed = JSON.parse(event.data as string);
              switch (parsed.type) {
                case 'session.ready':
                  appendLog('info', 'Voice Live セッションが開始されました');
                  streamingEnabledRef.current = true;
                  // AudioWorkletにストリーミング開始を通知
                  workletNodeRef.current?.port.postMessage({ type: 'setStreamingEnabled', data: true });
                  setStatus('ready');
                  statusRef.current = 'ready';
                  break;
                case 'session.log':
                  appendLog((parsed.level as LogLevel) ?? 'info', parsed.message as string);
                  break;
                case 'session.event':
                  handleServerEvent(parsed);
                  break;
                case 'session.error':
                  streamingEnabledRef.current = false;
                  // AudioWorkletにストリーミング停止を通知
                  workletNodeRef.current?.port.postMessage({ type: 'setStreamingEnabled', data: false });
                  void handleFatalError((parsed.message as string) ?? 'セッションエラー');
                  break;
                default:
                  appendLog('warn', `未知のメッセージ: ${parsed.type as string}`);
                  break;
              }
            } catch (parseError) {
              appendLog('warn', `JSON 解析に失敗しました: ${String(parseError)}`);
            }
            return;
          }

          if (event.data instanceof ArrayBuffer) {
            appendLog('info', `バイナリデータ受信: ${event.data.byteLength}バイト`);
            handleServerAudio(event.data);
          }
        };

        ws.onerror = (evt) => {
          console.error('websocket error', evt);
          if (statusRef.current === 'error') {
            return;
          }
          if (!closingRef.current) {
            streamingEnabledRef.current = false;
            void handleFatalError('WebSocket エラーが発生しました');
          }
        };

        ws.onclose = (evt) => {
          wsRef.current = null;
          streamingEnabledRef.current = false;

          if (statusRef.current === 'error') {
            return;
          }

          if (closingRef.current) {
            return;
          }

          if (statusRef.current === 'ready') {
            appendLog('warn', `サーバーが切断しました (code=${evt.code})`);
          }

          void cleanupAudioGraph();

          setStatus('idle');
          statusRef.current = 'idle';
        };
      } catch (startError) {
        console.error('live voice start error', startError);
        appendLog('error', `初期化に失敗しました: ${startError instanceof Error ? startError.message : String(startError)}`);
        setError(startError instanceof Error ? startError.message : String(startError));
        await cleanupAudioGraph();
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          try {
            ws.close(1011, 'init-failed');
          } catch (closeError) {
            console.debug('websocket close failure', closeError);
          }
        }
        wsRef.current = null;
        setStatus('error');
        statusRef.current = 'error';
        closingRef.current = false;
      }
    },
    [appendLog, cleanupAudioGraph, handleFatalError, handleServerEvent, handleServerAudio, resetMetrics, stop, updateMetrics],
  );

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return {
    status,
    error,
    logs,
    metrics,
    start,
    stop,
    isStreaming: status === 'ready',
    avatarState,
    attachAvatarElement,
  } as const;
};
