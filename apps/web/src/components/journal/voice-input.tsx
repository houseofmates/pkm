import React, { useState, useCallback } from 'react'
import { Mic, Download, Play } from 'lucide-react'

// fallback button component (replace with correct import if available)
const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string; variant?: string; className?: string }> = ({
  children,
  size,
  variant,
  className,
  ...props
}) => (
  <button
    className={`rounded ${className || ''}`}
    {...props}
  >
    {children}
  </button>
)
import { useGamificationStore } from '../../stores/gamification-store'

// ollama client stub (per context src/api/ollama-client.ts pattern)
const OLLAMA_URL = 'http://192.168.4.233:11434/api/generate'

const VoiceInput: React.FC<{ onTranscribe: (text: string) => void }> = ({ onTranscribe }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [platform, setPlatform] = useState<'grapheneos' | 'ubuntu' | 'other'>('other')
  const { earnXp } = useGamificationStore()

  // platform detect
  React.useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('grapheneos')) setPlatform('grapheneos')
    else if (ua.includes('ubuntu')) setPlatform('ubuntu')
    else setPlatform('other')
  }, [])

  // check offline
  React.useEffect(() => {
    setIsOffline(!navigator.onLine)
  }, [])

  const startListening = useCallback(() => {
    const recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!recognition) {
      alert('speech recognition not supported. download whisper model?')
      return
    }

    const instance = new recognition()
    instance.continuous = true
    instance.interimResults = true
    instance.lang = 'en-us'

    instance.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript
      }
      setTranscription(finalTranscript.toLowerCase())
    }

    instance.onend = () => setIsListening(false)

    setIsListening(true)
    instance.start()
  }, [])

  const processWithQwen = useCallback(async (rawText: string) => {
    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen2.5-coder:7b-instruct-q4_K_S',
          prompt: `clean this transcription: remove "um", "uh", lowercase everything, reformat into readable paragraphs, make concise:

"${rawText}"`,
          stream: false
        })
      })
      const data = await response.json()
      const cleaned = data.response.toLowerCase()
      onTranscribe(cleaned)
      earnXp(5, 'voice journal')
    } catch (error) {
      onTranscribe(rawText.toLowerCase())
    }
  }, [onTranscribe, earnXp])

  const downloadWhisper = () => {
    // stub: download whisper.cpp model for offline
    const modelUrl = platform === 'grapheneos' 
      ? 'whisper-tiny-mobile.ggml' 
      : 'whisper-small-desktop.ggml'
    window.open(`https://huggingface.co/ggerganov/whisper.cpp/${modelUrl}`)
  }

  return (
    <div className="p-6 bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl border border-purple-500/30 backdrop-blur-md">
      <div className="text-center mb-6">
        <div className="text-sm text-slate-400 mb-2">voice journal {platform}</div>
        <Button 
          size="lg" 
          onClick={startListening}
          disabled={isListening}
          className={`w-24 h-24 rounded-full p-0 text-2xl transition-all ${isListening ? 'bg-red-500 shadow-lg shadow-red-500/25 animate-pulse' : 'hover:scale-105'}`}
        >
          <Mic className={`${isListening ? 'animate-spin' : ''}`} />
        </Button>
        {transcription && (
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg max-h-32 overflow-auto text-sm">
            {transcription}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => processWithQwen(transcription)}
              className="mt-2 w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              clean with qwen
            </Button>
          </div>
        )}
      </div>
      {isOffline && (
        <div className="space-y-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="text-yellow-400 text-sm">offline detected</div>
          <Button variant="outline" size="sm" onClick={downloadWhisper} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            download {platform} whisper model
          </Button>
        </div>
      )}
    </div>
  )
}

export default VoiceInput

