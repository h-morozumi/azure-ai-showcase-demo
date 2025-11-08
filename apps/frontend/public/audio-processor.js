/**
 * AudioWorklet Processor for PCM16 audio streaming
 * 
 * ScriptProcessorNode の代替として AudioWorkletNode を使用
 * マイク入力をキャプチャし、リサンプリングとPCM16エンコードを行う
 */

const TARGET_SAMPLE_RATE = 24000;

class AudioStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.streamingEnabled = false;
    this.inputSampleRate = 48000; // デフォルト値
    
    // メインスレッドからのメッセージを受信
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      if (type === 'setStreamingEnabled') {
        this.streamingEnabled = data;
      } else if (type === 'setInputSampleRate') {
        this.inputSampleRate = data;
      }
    };
  }

  /**
   * Float32配列をリサンプリング
   */
  resampleToTarget(inputBuffer, inputRate, targetRate) {
    if (inputRate === targetRate) {
      return inputBuffer;
    }

    const ratio = inputRate / targetRate;
    const outputLength = Math.ceil(inputBuffer.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputBuffer.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      output[i] = inputBuffer[srcIndexFloor] * (1 - fraction) + inputBuffer[srcIndexCeil] * fraction;
    }

    return output;
  }

  /**
   * Float32配列をPCM16バッファに変換
   */
  floatToPcm16Buffer(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(i * 2, int16, true);
    }

    return buffer;
  }

  process(inputs, outputs, parameters) {
    if (!this.streamingEnabled) {
      return true;
    }

    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const channelData = input[0]; // モノラル入力

    // リサンプリング
    const resampled = this.resampleToTarget(
      channelData,
      this.inputSampleRate,
      TARGET_SAMPLE_RATE
    );

    if (resampled.length === 0) {
      return true;
    }

    // PCM16に変換
    const pcmBuffer = this.floatToPcm16Buffer(resampled);

    if (pcmBuffer.byteLength === 0) {
      return true;
    }

    // メインスレッドに送信
    this.port.postMessage({
      type: 'audioData',
      data: pcmBuffer,
    }, [pcmBuffer]); // Transferable object として送信

    return true; // プロセッサを継続
  }
}

registerProcessor('audio-stream-processor', AudioStreamProcessor);
