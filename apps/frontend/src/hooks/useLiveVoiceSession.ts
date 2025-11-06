import { useCallback, useEffect, useRef, useState } from 'react';
import { getRealtimeApiBaseUrl, getRealtimeApiKey } from '../services/realtimeApi';

const TARGET_SAMPLE_RATE = 24_000;
const MAX_LOG_ENTRIES = 200;
const PCM_FRAME_SIZE = 2; // PCM16 bytes per sample

export type LiveVoiceSessionStatus = 'idle' | 'connecting' | 'ready' | 'stopping' | 'error';

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

const floatToPcm16Buffer = (input: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(input.length * PCM_FRAME_SIZE);
  const view = new DataView(buffer);

  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * PCM_FRAME_SIZE, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return buffer;
};

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

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const inhaleGainNodeRef = useRef<GainNode | null>(null);
  const playbackNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const playbackCursorRef = useRef<number>(0);
  const streamingEnabledRef = useRef<boolean>(false);
  const statusRef = useRef<LiveVoiceSessionStatus>('idle');
  const closingRef = useRef<boolean>(false);
  const inputSampleRateRef = useRef<number>(TARGET_SAMPLE_RATE);
  const metricsRef = useRef<LiveVoiceMetrics>({ sentAudioBytes: 0, receivedAudioBytes: 0, responseCount: 0 });

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

  const cleanupAudioGraph = useCallback(async () => {
    streamingEnabledRef.current = false;

    const processor = processorNodeRef.current;
    if (processor) {
      processor.disconnect();
      processor.onaudioprocess = null;
      processorNodeRef.current = null;
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
  }, []);

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
      return;
    }

    const floatData = decodePcm16(buffer);
    if (!floatData.length) {
      return;
    }

    const audioBuffer = audioContext.createBuffer(1, floatData.length, TARGET_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(floatData);

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);

    const startAt = Math.max(audioContext.currentTime, playbackCursorRef.current);
    sourceNode.start(startAt);
    playbackCursorRef.current = startAt + audioBuffer.duration;

    playbackNodesRef.current.add(sourceNode);
    sourceNode.onended = () => {
      sourceNode.disconnect();
      playbackNodesRef.current.delete(sourceNode);
    };

    updateMetrics({ receivedAudioBytes: buffer.byteLength });
  }, [updateMetrics]);

  const handleServerEvent = useCallback(
    (event: { event?: string; message?: string; data?: Record<string, unknown> }) => {
      switch (event.event) {
        case 'session.updated':
          appendLog('info', `セッション開始: ${(event.data?.sessionId as string) ?? 'unknown'}`);
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
        default:
          if (event.event) {
            appendLog('info', `イベント: ${event.event}`);
          } else if (event.message) {
            appendLog('info', event.message);
          }
          break;
      }
    },
    [appendLog, updateMetrics],
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
      setStatus('connecting');
      statusRef.current = 'connecting';
      appendLog('info', 'Live Voice セッションに接続中…');

      const apiKey = getRealtimeApiKey();

      try {
        const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
        await audioContext.resume();
        audioContextRef.current = audioContext;
        inputSampleRateRef.current = audioContext.sampleRate;

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

        const processorNode = audioContext.createScriptProcessor(2048, 1, 1);
        processorNodeRef.current = processorNode;

        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        inhaleGainNodeRef.current = silentGain;

        sourceNode.connect(processorNode);
        processorNode.connect(silentGain);
        silentGain.connect(audioContext.destination);

        processorNode.onaudioprocess = (event) => {
          if (!streamingEnabledRef.current) {
            return;
          }

          const channelData = event.inputBuffer.getChannelData(0);
          const resampled = resampleToTarget(channelData, inputSampleRateRef.current, TARGET_SAMPLE_RATE);
          if (!resampled.length) {
            return;
          }

          const pcmBuffer = floatToPcm16Buffer(resampled);
          if (!pcmBuffer.byteLength) {
            return;
          }

          const socket = wsRef.current;
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(pcmBuffer);
            updateMetrics({ sentAudioBytes: pcmBuffer.byteLength });
          }
        };

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
                  setError((parsed.message as string) ?? 'セッションエラー');
                  appendLog('error', (parsed.message as string) ?? 'セッションエラー');
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
            handleServerAudio(event.data);
          }
        };

        ws.onerror = (evt) => {
          console.error('websocket error', evt);
          if (!closingRef.current) {
            appendLog('error', 'WebSocket エラーが発生しました');
            setError('WebSocket エラーが発生しました');
            streamingEnabledRef.current = false;
          }
        };

        ws.onclose = (evt) => {
          wsRef.current = null;
          streamingEnabledRef.current = false;

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
    [appendLog, cleanupAudioGraph, handleServerEvent, handleServerAudio, resetMetrics, stop, updateMetrics],
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
  } as const;
};
