import { useRef, useEffect, useState } from 'react'
import { useLLMStore } from '@/stores/llm-store'
import { Send, X, BrainCircuit } from 'lucide-react'
import { useEdgelessStore } from '@/features/edgeless/store'

export function WilsonChat() {
  // we'll use the edgeless store for the "ischatopen" toggle to keep layout unified,
  // or we can add it to llm store. journal-app had it in documentstore.
  // let's add it to useedgelessstore (which is effectively our document store) later.
  // for now, let's assume useedgelessstore has it or we pass it as props?
  // let's check useedgelessstore. it doesn't have it yet. we'll add it in the next step.
  // for now i'll stub it or use local state for testing if needed, but the plan says "port wilsonchat logic".

  // actually, let's update store first? no, let's write this component to use the store field we will add.
  const isChatOpen = useEdgelessStore((state) => state.isChatOpen)
  const setChatOpen = useEdgelessStore((state) => state.setchatopen)

  const { interactionhistory, isthinking, askwilson } = usellmstore()
  const [userinput, setuserinput] = usestate('')
  const chatcontainerref = useref<HTMLDivElement>(null)

  // auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [interactionHistory])

  const checkAndSend = async () => {
    if (!userInput.trim() || isThinking) return

    const text = userInput
    setUserInput('') // Clear immediately

    if (text.trim().toLowerCase().startsWith('/ai')) {
      const prompt = text.replace(/^\/ai\s*/i, '')

      // capture basic page context
      // in the future, we can make this smarter by checking the route and pulling specific store data
      const context = {
        url: window.location.href,
        pageText: document.body.innerText.substring(0, 5000), // limit to avoid token overflow
      }

      useLLMStore.getState().setContext(context)

      await askWilson(prompt || 'Analyze this page content.')

      // clear context to avoid polluting future chats
      useLLMStore.getState().setContext(null)
    } else {
      await askWilson(text)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'enter') {
      checkandsend()
    }
  }

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
 {interactionhistory.length === 0 && (
 <div className="text-primary opacity-50 text-center mt-10 lowercase">
 <p>systems online.</p>
 <p>waiting for input...</p>
 </div>
 )}

 {interactionHistory.map((msg) => (
 <div
 key={msg.id}
 className={`flex flex-col gap-1 ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}
 >
 <span className="text-[10px] text-primary opacity-50 ">
   {msg.role === 'assistant' ? 'wilson' : 'user'}
 </span>
 <div
   className={`p-3 rounded-lg max-w-[90%] lowercase ${msg.role === 'assistant' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-black border border-gray-700 text-gray-300'}`}
 >
   {msg.content}
 </div>
 </div>
 ))}

 {/* thinking indicator */}
 {isthinking && (
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
