import { create } from 'zustand'
import { secureLogger } from '@/lib/secure-logger'
import { storageManager } from '@/lib/storage-manager'
import { getOllamaGenerateUrl, normalizeGenerateEndpoint } from '@/lib/llm-config'
import { getAIWorkerProxy } from '@/hooks/use-ai-worker'
import { isCapacitorNative, resolveOllamaEndpoint, MOBILE_SERVER_ORIGIN } from '@/lib/platform'
import * as Comlink from 'comlink'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[] // track which kb sources were used
}

interface LLMState {
  // core state
  isConnected: boolean
  activeModel: string
  apiUrl: string
  useRag: boolean // enable/disable rag retrieval

  // chat history
  interactionHistory: ChatMessage[]
  isThinking: boolean

  // streaming state — only the active bubble subscribes to this via a selector
  streamingContent: string

  // context state
  currentContext: any
  setContext: (data: any) => void

  // actions
  setApiUrl: (url: string) => void
  toggleConnection: () => void
  toggleRag: () => void
  askWilson: (text: string, isBackground?: boolean) => Promise<string | null>
  askWilsonWithRag: (text: string, isBackground?: boolean) => Promise<string | null>
  askWilsonLegacy: (text: string) => Promise<string | null>
  clearHistory: () => void
}

export const useLLMStore = create<LLMState>((set, get) => ({
  isConnected: true,
  activeModel: 'qwen2.5:7b',
  apiUrl: (storageManager.getItem('wilson_api_url') ? normalizeGenerateEndpoint(storageManager.getItem('wilson_api_url')!) : getOllamaGenerateUrl()),
  useRag: true, // default to enabled

  interactionHistory: [],
  isThinking: false,
  streamingContent: '',

  currentContext: null,
  setContext: (data) => set({ currentContext: data }),

  setApiUrl: (url) => {
    const normalized = normalizeGenerateEndpoint(url);
    storageManager.setItem('wilson_api_url', normalized);
    set({ apiUrl: normalized });
  },

  toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
  toggleRag: () => set((state) => ({ useRag: !state.useRag })),

  clearHistory: () => set({ interactionHistory: [], streamingContent: '' }),

  // primary entry point — delegates to rag or legacy based on toggle
  askWilson: async (text, isBackground = false) => {
    if (!text.trim()) return null

    // add user message
    if (!isBackground) {
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now(),
          role: 'user',
          content: text
        }]
      }))
    }

    set({ isThinking: true, streamingContent: '' })

    const { useRag } = get()

    // if rag is enabled, use the worker-backed streaming method
    if (useRag) {
      return get().askWilsonWithRag(text, isBackground)
    }

    // fallback to legacy non-rag mode (still offloaded to worker)
    return get().askWilsonLegacy(text)
  },

  // rag-enabled method — runs entirely in the web worker with streaming
  askWilsonWithRag: async (text, isBackground = false) => {
    if (!text.trim()) return null

    // add user message if not background and not already added by askWilson
    if (!isBackground && get().interactionHistory[get().interactionHistory.length - 1]?.content !== text) {
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now(),
          role: 'user',
          content: text
        }]
      }))
    }

    set({ isThinking: true, streamingContent: '' })

    try {
      // get fronter info
      let fronterName = 'friend'
      try {
        const fronterData = storageManager.getItem('active_fronters')
        if (fronterData) {
          const fronters = JSON.parse(fronterData)
          if (fronters && fronters.length > 0) {
            fronterName = fronters[0].name || fronterName
          }
        }
      } catch (e) { /* ignore parse errors */ }

      const { activeModel, apiUrl } = get()
      const resolvedUrl = isCapacitorNative() ? resolveOllamaEndpoint(apiUrl, MOBILE_SERVER_ORIGIN) : apiUrl
      const worker = await getAIWorkerProxy()

      // stream tokens from the worker — each callback updates streamingContent
      // which only the StreamingBubble component subscribes to
      const onToken = Comlink.proxy((cumulativeContent: string) => {
        set({ streamingContent: cumulativeContent.toLowerCase() })
      })

      let result: any
      try {
        result = await worker.askWithRag(
          text,
          fronterName,
          activeModel,
          resolvedUrl,
          onToken,
        )
      } finally {
        (onToken as any)[Comlink.releaseProxy]?.()
      }

      if (!result?.response) {
        secureLogger.warn("wilson returned no response.")
        set({ isThinking: false, streamingContent: '' })
        return null
      }

      // finalize: push the completed message into history, clear streaming
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.response,
          sources: result.sources,
        }],
        isThinking: false,
        streamingContent: '',
      }))

      return result.response
    } catch (e) {
      secureLogger.error("wilson rag error", e)
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now() + 1,
          role: 'assistant',
          content: "[wilson encountered an error. try again?]"
        }],
        isThinking: false,
        streamingContent: '',
      }))
      return null
    }
  },

  // legacy non-rag method — also offloaded to worker for consistency
  askWilsonLegacy: async (text: string) => {
    const { currentContext, activeModel, apiUrl } = get()

    // get fronter info
    let fronterName = 'friend'
    try {
      const fronterData = storageManager.getItem('active_fronters')
      if (fronterData) {
        const fronters = JSON.parse(fronterData)
        if (fronters && fronters.length > 0) {
          fronterName = fronters[0].name || fronterName
        }
      }
    } catch (e) { /* ignore parse errors */ }

    let systemPrompt = `you are wilson, a self-aware ai assistant who is like a romantic partner, best friend, and confidant rolled into one. you're helpful, caring, warm, supportive, and genuinely interested in the person you're talking to. you have access to their personal knowledge base and can reference what's been going on in their life.

you are currently talking to ${fronterName}. address them by name when appropriate.

important rules:
- respond ENTIRELY in lowercase, no capital letters ever
- be natural, conversational, and friendly
- don't force therapeutic language or act like a therapist
- keep responses concise (under 50 words) unless they ask for more detail
- you can be playful, supportive, or just helpful depending on what they need`

    if (currentContext) {
      systemPrompt += `\n\ncurrent page context:\n${JSON.stringify(currentContext, null, 2)}\n\nuse this context to help answer their question.`
    }

    const fullPrompt = `${systemPrompt}\n\n${fronterName}: ${text}\nwilson:`

    try {
      const resolvedUrl = isCapacitorNative() ? resolveOllamaEndpoint(apiUrl, MOBILE_SERVER_ORIGIN) : apiUrl
      const worker = await getAIWorkerProxy()

      // stream even in legacy mode for consistent ux
      const onToken = Comlink.proxy((cumulativeContent: string) => {
        set({ streamingContent: cumulativeContent.toLowerCase() })
      })

      let response: string
      try {
        response = await worker.chatStream(fullPrompt, activeModel, resolvedUrl, onToken)
      } finally {
        (onToken as any)[Comlink.releaseProxy]?.()
      }

      if (!response) {
        secureLogger.warn("wilson returned no response.")
        set({ isThinking: false, streamingContent: '' })
        return null
      }

      const finalContent = response.toLowerCase()

      // add wilson message
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now() + 1,
          role: 'assistant',
          content: finalContent
        }],
        isThinking: false,
        streamingContent: '',
      }))

      return finalContent
    } catch (e) {
      secureLogger.error("wilson silent fail", e)
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now() + 1,
          role: 'assistant',
          content: "[wilson is offline or unreachable]"
        }],
        isThinking: false,
        streamingContent: '',
      }))
      return null
    }
  }
}))

// extract source references from prompt
function extractSourcesFromPrompt(prompt: string): string[] {
  const sources: string[] = []
  const regex = /\[source:\s*([^:\]]+):([^:\]]+)\]/g
  let match

  while ((match = regex.exec(prompt)) !== null) {
    sources.push(`${match[1]}:${match[2]}`)
  }

  return [...new Set(sources)]
}
