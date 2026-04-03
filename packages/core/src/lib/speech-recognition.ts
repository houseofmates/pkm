/**
 * Speech Recognition utility with Firefox support
 * Firefox doesn't support Web Speech API natively, so we provide
 * graceful degradation without error toasts.
 * 
 * Now with Whisper fallback via Ollama for full transcription support in Firefox!
 * 
 * Recommended setup:
 * 1. Ensure Ollama is running locally (or configured endpoint)
 * 2. Pull a Whisper model: `ollama pull whisper-small` (or whisper-base, whisper-medium, whisper-large-v3)
 * 3. The hook will automatically use Whisper when SpeechRecognition is unavailable
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getOllamaBase } from './llm-config';

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex?: number;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Navigator {
    deviceMemory?: number;
  }
}

// Use type assertions for cross-browser compatibility
// instead of redeclaring to avoid conflicts with built-in DOM types

export function isFirefox(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('firefox') || (ua.includes('gecko/') && !ua.includes('webkit'));
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function safelyStartSpeechRecognition(onUnsupported?: () => void): boolean {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    onUnsupported?.();
    return false;
  }
  return true;
}

// =============================================================================
// Unified Transcription Hook with Whisper Fallback
// =============================================================================

export interface UnifiedTranscriptionOptions {
  onTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onEnd?: () => void;
  language?: string;
  whisperModel?: string;
  forceWhisper?: boolean;
}

export interface UnifiedTranscriptionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: Error | null;
  isProcessing: boolean;
  isUsingWhisper: boolean;
}

export function useUnifiedTranscription(options: UnifiedTranscriptionOptions = {}) {
  const {
    onTranscript,
    onInterimTranscript,
    onError,
    onStart,
    onEnd,
    language = 'en-US',
    whisperModel = 'whisper-small',
    forceWhisper = false,
  } = options;

  const [state, setState] = useState<UnifiedTranscriptionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isProcessing: false,
    isUsingWhisper: false,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const shouldUseWhisper = forceWhisper || !isSpeechRecognitionSupported();

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const initNativeRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript = result[0].transcript;
          break;
        } else {
          interimTranscript = result[0].transcript;
        }
      }

      if (finalTranscript) {
        setState(prev => ({
          ...prev,
          transcript: finalTranscript,
          interimTranscript: '',
        }));
        onTranscript?.(finalTranscript);
      } else if (interimTranscript) {
        setState(prev => ({ ...prev, interimTranscript }));
        onInterimTranscript?.(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        const error = new Error(`Speech recognition error: ${event.error}`);
        setState(prev => ({ ...prev, error, isListening: false }));
        onError?.(error);
      }
    };

    recognition.onend = () => {
      setState(prev => ({ ...prev, isListening: false }));
      onEnd?.();
    };

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, isUsingWhisper: false }));
      onStart?.();
    };

    return recognition;
  }, [language, onTranscript, onInterimTranscript, onError, onStart, onEnd]);

  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        resolve(base64Data || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  const transcribeWithWhisper = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const base64Audio = await blobToBase64(audioBlob);
      const ollamaUrl = getOllamaBase();

      abortControllerRef.current = new AbortController();

      const response = await fetch(`${ollamaUrl}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: whisperModel,
          audio: base64Audio,
          language: language.split('-')[0],
        }),
        signal: abortControllerRef.current.signal,
      }).catch(async () => {
        return fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: whisperModel,
            prompt: '',
            audio: base64Audio,
            system: 'Transcribe the audio accurately.',
          }),
          signal: abortControllerRef.current?.signal,
        });
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Whisper model "${whisperModel}" not found. Run: ollama pull ${whisperModel}`);
        }
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      const transcription = data.transcription || data.response || data.text || '';

      if (transcription) {
        const cleanTranscript = transcription.trim();
        setState(prev => ({
          ...prev,
          transcript: cleanTranscript,
          interimTranscript: '',
          isProcessing: false,
          isListening: false,
        }));
        onTranscript?.(cleanTranscript);
        onEnd?.();
      } else {
        throw new Error('No transcription received');
      }
    } catch (error: any) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: err, isListening: false }));
      onError?.(err);
      toast.error(`Transcription failed: ${err.message}`);
      onEnd?.();
    }
  }, [language, whisperModel, blobToBase64, onTranscript, onError, onEnd]);

  const startWhisperRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      setState(prev => ({
        ...prev,
        isListening: true,
        isUsingWhisper: true,
        transcript: '',
        interimTranscript: '',
        error: null,
        isProcessing: false,
      }));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        onStart?.();
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 100) {
          await transcribeWithWhisper(audioBlob);
        } else {
          setState(prev => ({ ...prev, isListening: false }));
          onEnd?.();
        }
      };

      mediaRecorder.onerror = () => {
        const error = new Error('MediaRecorder error occurred');
        setState(prev => ({ ...prev, error, isListening: false, isUsingWhisper: false }));
        onError?.(error);
        onEnd?.();
      };

      mediaRecorder.start(1000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: err, isListening: false, isUsingWhisper: false }));
      onError?.(err);

      if (err.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else {
        toast.error(`Failed to start recording: ${err.message}`);
      }
    }
  }, [onStart, onError, onEnd, transcribeWithWhisper]);

  const startListening = useCallback(() => {
    if (shouldUseWhisper) {
      startWhisperRecording();
    } else {
      const recognition = initNativeRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch (err) {
          startWhisperRecording();
        }
      } else {
        startWhisperRecording();
      }
    }
  }, [shouldUseWhisper, initNativeRecognition, startWhisperRecording]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const reset = useCallback(() => {
    stopListening();
    audioChunksRef.current = [];
    setState({
      isListening: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      isProcessing: false,
      isUsingWhisper: false,
    });
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    reset,
    isSupported: typeof window !== 'undefined' && (
      isSpeechRecognitionSupported() || 
      !!navigator.mediaDevices?.getUserMedia
    ),
    willUseWhisper: shouldUseWhisper,
  };
}

export async function checkWhisperAvailability(model: string = 'whisper-small'): Promise<boolean> {
  try {
    const ollamaUrl = getOllamaBase();
    const response = await fetch(`${ollamaUrl}/api/tags`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    const models = data.models || [];
    return models.some((m: any) => 
      (m.model || m.name || '').toLowerCase().includes('whisper')
    );
  } catch {
    return false;
  }
}

export function getRecommendedWhisperModel(): string {
  const memory = (navigator as any).deviceMemory || 4;
  if (memory >= 16) return 'whisper-large-v3';
  if (memory >= 8) return 'whisper-medium';
  if (memory >= 4) return 'whisper-small';
  return 'whisper-base';
}

