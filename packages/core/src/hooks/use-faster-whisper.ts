import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { fasterWhisperClient, type FasterWhisperTranscriptionResult } from '@/api/faster-whisper-client';
import { detailEnhancer, type DetailEnhancerResult } from '@/lib/detail-enhancer';

export interface UseFasterWhisperOptions {
  onTranscript?: (text: string) => void;
  onEnhanced?: (result: DetailEnhancerResult) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onEnd?: () => void;
  language?: string;
  enhanceWithContext?: boolean;
  existingNotes?: string[];
}

export interface UseFasterWhisperState {
  isRecording: boolean;
  isProcessing: boolean;
  isEnhancing: boolean;
  transcript: string;
  enhanced: string;
  error: Error | null;
  serverAvailable: boolean | null;
}

/**
 * Unified hook for faster-whisper transcription with detail enhancement
 * Records audio -> sends to 192.168.4.250:5000/transcribe -> enhances with Ollama
 */
export function useFasterWhisper(options: UseFasterWhisperOptions = {}) {
  const {
    onTranscript,
    onEnhanced,
    onError,
    onStart,
    onEnd,
    language = 'en',
    enhanceWithContext = true,
    existingNotes,
  } = options;

  const [state, setState] = useState<UseFasterWhisperState>({
    isRecording: false,
    isProcessing: false,
    isEnhancing: false,
    transcript: '',
    enhanced: '',
    error: null,
    serverAvailable: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check server availability on mount
  useEffect(() => {
    fasterWhisperClient.isAvailable().then(available => {
      setState(prev => ({ ...prev, serverAvailable: available }));
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      audioChunksRef.current = [];
      setState({
        isRecording: true,
        isProcessing: false,
        isEnhancing: false,
        transcript: '',
        enhanced: '',
        error: null,
        serverAvailable: state.serverAvailable,
      });

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
          await processAudio(audioBlob);
        } else {
          setState(prev => ({ ...prev, isRecording: false }));
          onEnd?.();
        }
      };

      mediaRecorder.onerror = () => {
        const error = new Error('Recording error occurred');
        setState(prev => ({ ...prev, error, isRecording: false }));
        onError?.(error);
        onEnd?.();
      };

      mediaRecorder.start(1000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({ ...prev, error: err, isRecording: false }));
      onError?.(err);

      if (err.name === 'NotAllowedError') {
        toast.error('Microphone permission denied');
      } else {
        toast.error(`Failed to start recording: ${err.message}`);
      }
    }
  }, [onStart, onError, onEnd]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

    try {
      // Step 1: Transcribe with faster-whisper
      const result: FasterWhisperTranscriptionResult = await fasterWhisperClient.transcribe(
        audioBlob,
        { language, vad_filter: true }
      );

      const rawTranscript = result.text;
      setState(prev => ({ ...prev, transcript: rawTranscript }));
      onTranscript?.(rawTranscript);

      // Step 2: Enhance with detail enhancer (if enabled)
      if (enhanceWithContext) {
        setState(prev => ({ ...prev, isEnhancing: true }));

        const enhancedResult = await detailEnhancer.enhance(rawTranscript, {
          existingNotes,
        });

        setState(prev => ({
          ...prev,
          isProcessing: false,
          isEnhancing: false,
          enhanced: enhancedResult.enhanced,
        }));

        onEnhanced?.(enhancedResult);
      } else {
        setState(prev => ({ ...prev, isProcessing: false }));
      }

      onEnd?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({
        ...prev,
        error: err,
        isProcessing: false,
        isEnhancing: false,
      }));
      onError?.(err);
      toast.error(`Processing failed: ${err.message}`);
      onEnd?.();
    }
  }, [language, enhanceWithContext, existingNotes, onTranscript, onEnhanced, onError, onEnd]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  const reset = useCallback(() => {
    stopRecording();
    audioChunksRef.current = [];
    setState({
      isRecording: false,
      isProcessing: false,
      isEnhancing: false,
      transcript: '',
      enhanced: '',
      error: null,
      serverAvailable: state.serverAvailable,
    });
  }, [stopRecording, state.serverAvailable]);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    reset,
    isSupported: typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}
