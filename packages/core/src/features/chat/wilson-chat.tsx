import { useRef, useEffect, useState, memo, useCallback } from 'react'
import { useLLMStore, type ChatMessage as ChatMessageType } from '@/stores/llm-store'
import { Send, X, BrainCircuit } from 'lucide-react'
import { useEdgelessStore } from '@/features/edgeless/store'

// ---------------------------------------------------------------------------
// memoized chat bubble — only re-renders when its own content changes
// ---------------------------------------------------------------------------

interface ChatBubbleProps {
  message: ChatMessageType
}

const ChatBubble = memo(function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <div
      className={`flex flex-col gap-1 ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}
    >
      <span className="text-[10px] text-primary opacity-50 ">
        {message.role === 'assistant' ? 'wilson' : 'user'}
      </span>
      <div
        className={`p-3 rounded-lg max-w-[90%] lowercase ${message.role === 'assistant' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-black border border-gray-700 text-gray-300'}`}
      >
        {message.content}
      </div>
      {message.sources && message.sources.length > 0 && (
        <div className="text-[9px] text-primary/40 mt-0.5">
          sources: {message.sources.join(', ')}
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// streaming bubble — subscribes ONLY to streamingContent
// so it doesn't cause the entire chat log to re-render on each token
// ---------------------------------------------------------------------------

const StreamingBubble = memo(function StreamingBubble() {
  const streamingContent = useLLMStore((s) => s.streamingContent)

  if (!streamingContent) return null

  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] text-primary opacity-50">wilson</span>
      <div className="p-3 rounded-lg max-w-[90%] lowercase bg-primary/10 border border-primary/20 text-primary">
        {streamingContent}
        <span className="inline-block w-1.5 h-3.5 bg-primary/60 ml-0.5 animate-pulse" />
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// main chat component
// ---------------------------------------------------------------------------

export function WilsonChat() {
  // proper zustand selectors — each subscribes independently
  const isChatOpen = useEdgelessStore((s) => s.isChatOpen)
  const setChatOpen = useEdgelessStore((s) => s.setChatOpen)

  const interactionHistory = useLLMStore((s) => s.interactionHistory)
  const isThinking = useLLMStore((s) => s.isThinking)
  const askWilson = useLLMStore((s) => s.askWilson)
  const streamingContent = useLLMStore((s) => s.streamingContent)

  const [userInput, setUserInput] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // auto-scroll — triggers on new history entries OR streaming content
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [interactionHistory.length, streamingContent])

  const checkAndSend = useCallback(async () => {
    if (!userInput.trim() || isThinking) return

    const text = userInput
    setUserInput('') // clear immediately

    if (text.trim().toLowerCase().startsWith('/ai')) {
      const prompt = text.replace(/^\/ai\s*/i, '')

      // capture basic page context
      const context = {
        url: window.location.href,
        pageText: document.body.innerText.substring(0, 5000),
      }

      useLLMStore.getState().setContext(context)

      await askWilson(prompt || 'Analyze this page content.')

      // clear context to avoid polluting future chats
      useLLMStore.getState().setContext(null)
    } else {
      await askWilson(text)
    }
  }, [userInput, isThinking, askWilson])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAndSend()
    }
  }, [checkAndSend])

  return (
    <div
      className={`fixed inset-y-0 right-0 w-[90vw] md:w-[400px] bg-background border-l-2 border-primary shadow-[-4px_0_0_var(--primary)] z-[60] flex flex-col transition-transform duration-300 transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* header */}
      <div className="p-4 border-b border-primary flex justify-between items-center bg-black/50">
        <div className="flex items-center gap-2 text-primary font-bold lowercase">
          <span>wilson</span>
        </div>
        <button onClick={() => setChatOpen(false)} className="text-primary hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* chat area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-sm">
        {interactionHistory.length === 0 && !streamingContent && (
          <div className="text-primary opacity-50 text-center mt-10 lowercase">
            <p>systems online.</p>
            <p>waiting for input...</p>
          </div>
        )}

        {interactionHistory.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* streaming bubble — renders in-progress assistant response */}
        <StreamingBubble />

        {/* thinking indicator (shown during rag retrieval before streaming starts) */}
        {isThinking && !streamingContent && (
          <div className="flex items-center gap-2 text-primary text-xs animate-pulse lowercase">
            <BrainCircuit size={14} />
            <span>processing...</span>
          </div>
        )}
      </div>

      {/* input */}
      <div className="p-4 border-t border-primary bg-background">
        <div className="relative">
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="query..."
            className="w-full bg-black border-2 border-primary rounded-lg py-3 pl-4 pr-10 text-primary focus:outline-none focus:border-primary placeholder:text-primary/30 lowercase"
          />
          <button
            onClick={checkAndSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-white disabled:opacity-50"
            disabled={!userInput.trim() || isThinking}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
