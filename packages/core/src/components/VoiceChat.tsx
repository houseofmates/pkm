import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secure-logger';

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  disabled?: boolean;
  wilsonPersonality?: boolean;
}

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VoiceChat({ 
  onTranscript, 
  onSpeakingStateChange, 
  disabled = false,
  wilsonPersonality = true 
}: VoiceChatProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(20).fill(0));
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Firefox and other unsupported browsers - silently return without error toast
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

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
        setTranscript(finalTranscript);
        onTranscript(finalTranscript);
        setInterimTranscript('');
      } else if (interimTranscript) {
        setInterimTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        secureLogger.error('Speech recognition error:', event.error);
        toast.error(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onTranscript]);

  // Initialize audio visualizer
  const initAudioVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;

      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Downsample to 20 bars
        const bars = 20;
        const step = Math.floor(dataArray.length / bars);
        const newData = [];
        
        for (let i = 0; i < bars; i++) {
          const value = dataArray[i * step] / 255;
          newData.push(value);
        }
        
        setVisualizerData(newData);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      
      updateVisualizer();
    } catch (err) {
      secureLogger.error('Failed to access microphone:', err);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || disabled) return;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');
      initAudioVisualizer();
    } catch (err) {
      secureLogger.error('Failed to start speech recognition:', err);
      toast.error('Could not start voice input');
    }
  }, [disabled, initAudioVisualizer]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.stop();
    setIsListening(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setVisualizerData(new Array(20).fill(0));
  }, []);

  // Text-to-speech for Wilson
  const speak = useCallback((text: string) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice for Wilson personality
    if (wilsonPersonality) {
      utterance.pitch = 1.1; // Slightly higher pitch for friendliness
      utterance.rate = 0.95; // Slightly slower for clarity
      utterance.volume = 0.9;
    }
    
    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Google') || 
      v.name.includes('Samantha') ||
      v.name.includes('Karen')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      onSpeakingStateChange?.(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      onSpeakingStateChange?.(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      onSpeakingStateChange?.(false);
    };
    
    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled, wilsonPersonality, onSpeakingStateChange]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    onSpeakingStateChange?.(false);
  }, [onSpeakingStateChange]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    setAudioEnabled(!audioEnabled);
    if (audioEnabled) {
      stopSpeaking();
    }
    toast.success(audioEnabled ? 'Wilson muted' : 'Wilson unmuted');
  }, [audioEnabled, stopSpeaking]);

  // Expose speak function via ref pattern
  useEffect(() => {
    // Add speak function to window for external access
    (window as any).wilsonSpeak = speak;
    return () => {
      delete (window as any).wilsonSpeak;
    };
  }, [speak]);

  return (
    <div className="flex items-center gap-2">
      {/* Audio visualizer - only show when listening */}
      {isListening && (
        <div className="flex items-end gap-0.5 h-8">
          {visualizerData.map((value, i) => (
            <div
              key={i}
              className="w-1 bg-purple-400 rounded-full transition-all duration-75"
              style={{ 
                height: `${Math.max(4, value * 32)}px`,
                opacity: 0.4 + value * 0.6
              }}
            />
          ))}
        </div>
      )}
      
      {/* Transcript preview */}
      {(transcript || interimTranscript) && (
        <span className="text-xs text-white/60 max-w-[150px] truncate">
          {transcript || interimTranscript}
        </span>
      )}
      
      {/* Mute/Unmute button */}
      <button
        onClick={toggleAudio}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          audioEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-500/20 hover:bg-red-500/30"
        )}
        title={audioEnabled ? "mute wilson" : "unmute wilson"}
      >
        {audioEnabled ? (
          <Volume2 className="w-4 h-4 text-white/70" />
        ) : (
          <VolumeX className="w-4 h-4 text-red-400" />
        )}
      </button>
      
      {/* Voice input button */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
          isListening 
            ? "bg-red-500/20 border border-red-500/50 animate-pulse" 
            : isSpeaking
              ? "bg-purple-500/20 border border-purple-500/50"
              : "bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        title={isListening ? "stop listening" : isSpeaking ? "wilson speaking..." : "talk to wilson"}
      >
        {isListening ? (
          <Square className="w-4 h-4 text-red-400 fill-current" />
        ) : isSpeaking ? (
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <Mic className="w-4 h-4 text-purple-400" />
        )}
      </button>
    </div>
  );
}

// Hook for using Wilson's voice
export function useWilsonVoice() {
  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && (window as any).wilsonSpeak) {
      (window as any).wilsonSpeak(text);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}
