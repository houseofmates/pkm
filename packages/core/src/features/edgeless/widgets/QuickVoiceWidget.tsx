import React from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUnifiedTranscription } from '@/lib/speech-recognition';

interface QuickVoiceWidgetProps {
  className?: string;
  onTranscript?: (text: string) => void;
}

export function QuickVoiceWidget({ className, onTranscript }: QuickVoiceWidgetProps) {
  const {
    isListening,
    isProcessing,
    isUsingWhisper,
    toggleListening,
  } = useUnifiedTranscription({
    onTranscript: (text) => {
      onTranscript?.(text);
      
      // Also dispatch event for journal to capture
      window.dispatchEvent(new CustomEvent('quick-voice-capture', { 
        detail: { transcript: text, timestamp: Date.now() } 
      }));
      
      toast.success('Voice captured!');
    },
    onError: (error) => {
      console.error('Speech recognition error:', error.message);
    },
  });

  const handleClick = () => {
    toggleListening();
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-4 rounded-xl bg-black/80 border border-emerald-500/30", className)}>
      <button
        onClick={handleClick}
        disabled={isProcessing}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center transition-all",
          isListening 
            ? "bg-red-500/20 text-red-400 animate-pulse border-2 border-red-400/50" 
            : isProcessing
              ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-400/50"
              : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-2 border-emerald-400/50",
          isProcessing && "cursor-wait"
        )}
        title={isUsingWhisper ? "Using local Whisper AI" : "Using browser speech recognition"}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <Square className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      
      <p className="text-[10px] text-white/40 lowercase mt-2 text-center">
        {isProcessing 
          ? 'processing...' 
          : isListening 
            ? (isUsingWhisper ? 'recording (whisper)...' : 'recording...') 
            : (isUsingWhisper ? 'tap to speak (whisper)' : 'tap to speak')
        }
      </p>
    </div>
  );
}
