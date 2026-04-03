import { useState, useRef, useCallback, useEffect } from 'react';
import { getOllamaBase, getOllamaModel } from '@/lib/llm-config';
import { toast } from 'sonner';

interface WhisperTranscriptionOptions {
  onTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onEnd?: () => void;
  language?: string;
  whisperModel?: string;
}

interface WhisperTranscriptionState {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  error: Error | null;
  isProcessing: boolean;
}

/**
 * Hook for Whisper-based speech transcription via Ollama
 * Works in Firefox where Web Speech API is not supported
 * 
 * Recommended Whisper models (in order of preference):
 * - 'whisper-large-v3': Best accuracy, slower, requires more VRAM
 * - 'whisper-medium': Good balance of accuracy and speed
 * - 'whisper-small': Fast, good for real-time, lower accuracy
 * - 'whisper-base': Very fast, acceptable accuracy
 * - 'whisper-tiny': Fastest, lowest accuracy, minimal resource usage
 * 
 * To use: Pull a whisper model in Ollama: `ollama pull whisper-small`
 */
export function useWhisperTranscription(options: WhisperTranscriptionOptions = {}) {
  const {
    onTranscript,
    onInterimTranscript,
    onError,
    onStart,
    onEnd,
    language = 'en',
    whisperModel = 'whisper-small',
  } = options;

  const [state, setState] = useState<WhisperTranscriptionState>({
    isRecording: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isProcessing: false,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  /**
   * Convert audio blob to base64 for sending to Ollama
   */
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/webm;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  /**
   * Send audio to Ollama Whisper model for transcription
   */
  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const base64Audio = await blobToBase64(audioBlob);
      const ollamaUrl = getOllamaBase();

      // Try Whisper model first, fall back to default model if not available
      const model = whisperModel;

      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: `Transcribe this audio to text. Language: ${language}. Only return the transcription, no additional text.`,
          images: [], // Whisper in Ollama can process audio via the generate endpoint
          system: 'You are a speech-to-text transcription service. Transcribe the audio accurately.',
        }),
      });

      if (!response.ok) {
        // If Whisper model fails, try alternative approach with generic model
        if (response.status === 404) {
          throw new Error(
            `Whisper model "${model}" not found. Please run: ollama pull ${model}`
          );
        }
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      const transcription = data.response?.trim() || '';

      if (transcription) {
        setState(prev => ({
          ...prev,
          transcript: transcription,
          interimTranscript: '',
          isProcessing: false,
        }));
        onTranscript?.(transcription);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: err, isProcessing: false }));
      onError?.(err);
      toast.error(`Transcription failed: ${err.message}`);
    }
  }, [language, whisperModel, onTranscript, onError]);

  /**
   * Start recording audio for transcription
   */
  const startRecording = useCallback(async () => {
    try {
      // Reset state
      audioChunksRef.current = [];
      setState({
        isRecording: true,
        transcript: '',
        interimTranscript: '',
        error: null,
        isProcessing: false,
      });

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimal for Whisper
        } 
      });
      streamRef.current = stream;

      // Create MediaRecorder with webm format (widely supported)
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
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Process the recorded audio
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob);
        }
        onEnd?.();
      };

      mediaRecorder.onerror = (event) => {
        const error = new Error('MediaRecorder error occurred');
        setState(prev => ({ ...prev, error, isRecording: false }));
        onError?.(error);
      };

      // Start recording with 1-second chunks for longer recordings
      mediaRecorder.start(1000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState(prev => ({ ...prev, error: err, isRecording: false }))
      onError?.(err);
      
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone permission denied. Please allow microphone access.');
      } else {
        toast.error(`Failed to start recording: ${err.message}`);
      }
    }
  }, [onStart, onEnd, onError, transcribeAudio]);

  /**
   * Stop recording and process the audio
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Also stop the stream tracks directly
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  /**
   * Toggle recording state
   */
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  /**
   * Reset the transcription state
   */
  const reset = useCallback(() => {
    audioChunksRef.current = [];
    setState({
      isRecording: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      isProcessing: false,
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    reset,
    isSupported: typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}

export type { WhisperTranscriptionOptions, WhisperTranscriptionState };
