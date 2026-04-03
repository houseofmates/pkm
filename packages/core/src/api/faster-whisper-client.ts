import { secureLogger } from '@/lib/secure-logger';

// Hardcoded faster-whisper server endpoint
const FASTER_WHISPER_URL = 'http://192.168.4.250:5000/transcribe';

export interface FasterWhisperTranscriptionOptions {
  language?: string;
  task?: 'transcribe' | 'translate';
  vad_filter?: boolean;
  word_timestamps?: boolean;
}

export interface FasterWhisperTranscriptionResult {
  text: string;
  language?: string;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      probability: number;
    }>;
  }>;
}

/**
 * Dedicated client for faster-whisper server running on 192.168.4.250:5000
 * Optimized for local network transcription with WAV/PCM streams
 */
export class FasterWhisperClient {
  private baseUrl: string;

  constructor(baseUrl: string = FASTER_WHISPER_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Convert audio blob to WAV format for faster-whisper
   * Uses Web Audio API for proper format conversion
   */
  async convertToWav(audioBlob: Blob): Promise<Blob> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to mono, 16kHz for optimal Whisper performance
      const sampleRate = 16000;
      const numberOfChannels = 1;
      const offlineContext = new OfflineAudioContext(
        numberOfChannels,
        audioBuffer.duration * sampleRate,
        sampleRate
      );
      
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const renderedBuffer = await offlineContext.startRendering();
      const wavBuffer = this.audioBufferToWav(renderedBuffer);
      
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } catch (error) {
      secureLogger.error('WAV conversion failed:', error);
      // Fallback: return original blob if conversion fails
      return audioBlob;
    } finally {
      await audioContext.close();
    }
  }

  /**
   * Convert AudioBuffer to WAV format
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    
    // Write WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + buffer.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); // 16-bit samples
    this.writeString(view, 36, 'data');
    view.setUint32(40, buffer.length * 2, true);
    
    // Write interleaved data
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Transcribe audio using faster-whisper server
   * Sends WAV/PCM data to 192.168.4.250:5000/transcribe
   */
  async transcribe(
    audioBlob: Blob,
    options: FasterWhisperTranscriptionOptions = {}
  ): Promise<FasterWhisperTranscriptionResult> {
    const formData = new FormData();
    
    // Convert to WAV for optimal compatibility
    const wavBlob = await this.convertToWav(audioBlob);
    formData.append('file', wavBlob, 'recording.wav');
    formData.append('language', options.language || 'en');
    formData.append('task', options.task || 'transcribe');
    formData.append('vad_filter', String(options.vad_filter ?? true));
    
    if (options.word_timestamps) {
      formData.append('word_timestamps', 'true');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Faster-whisper error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      return {
        text: result.text || '',
        language: result.language,
        segments: result.segments,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Transcription timeout - server did not respond within 30s');
      }
      
      // Provide specific error messages for common failure scenarios
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('local server unreachable at 192.168.4.250:5000 - check if desktop is online');
      }
      
      if (error instanceof Error) {
        // Check for HTTP error status codes that indicate GPU/VRAM issues
        if (error.message.includes('500') || error.message.includes('503')) {
          throw new Error('GPU out of VRAM on whisper server - try again in a moment');
        }
        if (error.message.includes('502') || error.message.includes('504')) {
          throw new Error('whisper server is down or restarting - check desktop status');
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
          throw new Error('local server unreachable at 192.168.4.250:5000 - check if desktop is online');
        }
      }
      
      throw error;
    }
  }

  /**
   * Check if faster-whisper server is reachable
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl.replace('/transcribe', '/'), {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance with hardcoded endpoint
export const fasterWhisperClient = new FasterWhisperClient(FASTER_WHISPER_URL);
