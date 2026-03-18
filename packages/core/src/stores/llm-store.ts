import { create } from 'zustand'
import { secureLogger } from '@/lib/secure-logger'
import { storageManager } from '@/lib/storage-manager'
import { getOllamaGenerateUrl, normalizeGenerateEndpoint, DEFAULT_GEMINI_MODEL, getStoredGeminiApiKey, ensureGeminiApiKey, appendGeminiApiKeyToUrl } from '@/lib/llm-config'
import { getAIWorkerProxy } from '@/hooks/use-ai-worker'
import { isCapacitorNative, isLocalhostUnreachable, resolveOllamaEndpoint, MOBILE_SERVER_ORIGIN } from '@/lib/platform'
import * as Comlink from 'comlink'
import type { Attachment, AskWithRagResult } from '@/workers/ai-worker-types'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[] // track which kb sources were used
  attachments?: Attachment[] // attachments for this message
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
  currentContext: Record<string, unknown> | null
  setContext: (data: Record<string, unknown> | null) => void

  // attachments
  pendingAttachments: Attachment[]
  addAttachment: (file: File) => Promise<void>
  removeAttachment: (id: string) => void
  clearAttachments: () => void

  // actions
  setApiUrl: (url: string) => void
  toggleConnection: () => void
  toggleRag: () => void
  askWilson: (text: string, isBackground?: boolean) => Promise<string | null>
  askWilsonWithRag: (text: string, isBackground?: boolean) => Promise<string | null>
  askWilsonLegacy: (text: string) => Promise<string | null>
  getGeminiApiKey: () => string | null
  ensureGeminiApiKey: () => Promise<string | null>
  appendGeminiKeyToUrl: (url: string, key: string) => string

  clearHistory: () => void
}

export const useLLMStore = create<LLMState>((set, get) => ({
  isConnected: true,
  activeModel: DEFAULT_GEMINI_MODEL,
  apiUrl: (() => {
    const stored = storageManager.getItem('gemini_api_url') ?? storageManager.getItem('wilson_api_url');
    return stored ? normalizeGenerateEndpoint(stored) : getOllamaGenerateUrl();
  })(),
  useRag: true, // default to enabled

  interactionHistory: [],
  isThinking: false,
  streamingContent: '',

  currentContext: null,
  setContext: (data) => set({ currentContext: data }),

  pendingAttachments: [],

  addAttachment: async (file: File) => {
    // Determine attachment type
    let type: Attachment['type'] = 'other';
    if (file.type.startsWith('image/')) {
      type = file.type === 'image/gif' ? 'gif' : 'image';
    } else if (file.type.startsWith('video/')) {
      type = 'video';
    }

    // Create attachment object
    const attachment: Attachment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type,
      name: file.name,
    };

    // Convert to data URL for preview and sending
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    attachment.dataUrl = dataUrl;

    set((state) => ({
      pendingAttachments: [...state.pendingAttachments, attachment]
    }));
  },

  removeAttachment: (id: string) => {
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter(att => att.id !== id)
    }));
  },

  clearAttachments: () => {
    set({ pendingAttachments: [] });
  },

  // gemini api key handling (shared helpers)
  getGeminiApiKey: () => getStoredGeminiApiKey(),
  ensureGeminiApiKey: async () => ensureGeminiApiKey(),
  appendGeminiKeyToUrl: (url: string, key: string): string => appendGeminiApiKeyToUrl(url, key),

  setApiUrl: (url) => {
    const normalized = normalizeGenerateEndpoint(url);
    // persist under the new gemini key, and keep the old wilson key for backwards compatibility
    storageManager.setItem('gemini_api_url', normalized);
    storageManager.setItem('wilson_api_url', normalized);
    set({ apiUrl: normalized });
  },

  toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
  toggleRag: () => set((state) => ({ useRag: !state.useRag })),

  clearHistory: () => set({ interactionHistory: [], streamingContent: '' }),

  // primary entry point — delegates to rag or legacy based on toggle
  askWilson: async (text, isBackground = false) => {
    if (!text.trim() && get().pendingAttachments.length === 0) return null

    const { pendingAttachments } = get()
    const hasAttachments = pendingAttachments.length > 0

    // add user message
    if (!isBackground) {
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now(),
          role: 'user',
          content: text,
          attachments: hasAttachments ? [...pendingAttachments] : undefined
        }],
        pendingAttachments: [] // clear pending attachments after adding
      }))
    }

    set({ isThinking: true, streamingContent: '' })

    const apiKey = await get().ensureGeminiApiKey();
    if (!apiKey) {
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now() + 1,
          role: 'assistant',
          content: "[wilson needs a google gemini api key to work. please enter it when prompted.]"
        }],
        isThinking: false,
      }));
      return null;
    }

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
    if (!text.trim() && get().pendingAttachments.length === 0) return null

    // Get attachments from the last user message if they exist
    const lastMessage = get().interactionHistory[get().interactionHistory.length - 1]
    const attachments = lastMessage?.attachments || get().pendingAttachments
    const hasAttachments = attachments && attachments.length > 0

    // add user message if not background and not already added by askWilson
    if (!isBackground && lastMessage?.content !== text && !lastMessage?.attachments) {
      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now(),
          role: 'user',
          content: text,
          attachments: hasAttachments ? [...attachments] : undefined
        }],
        pendingAttachments: [] // clear pending attachments
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
      } catch { /* ignore parse errors */ }

      const apiKey = await get().ensureGeminiApiKey();
      if (!apiKey) {
        set((state) => ({
          interactionHistory: [...state.interactionHistory, {
            id: Date.now() + 1,
            role: 'assistant',
            content: "[wilson needs a google gemini api key to work. please enter it when prompted.]"
          }],
          isThinking: false,
          streamingContent: '',
        }))
        return null
      }

      const { activeModel, apiUrl } = get()
      
      // detect if localhost is unreachable (mobile app or mobile browser on remote origin)
      const needsProxy = isLocalhostUnreachable() || isCapacitorNative()
      const baseUrl = needsProxy ? resolveOllamaEndpoint(apiUrl, MOBILE_SERVER_ORIGIN) : apiUrl
      const resolvedUrl = get().appendGeminiKeyToUrl(baseUrl, apiKey)
      
      secureLogger.info('[wilson] using endpoint:', resolvedUrl, 'needsProxy:', needsProxy)
      
      const worker = await getAIWorkerProxy()
      if (!worker) {
        throw new Error('AI worker failed to initialize')
      }

      // stream tokens from the worker — each callback updates streamingContent
      // which only the StreamingBubble component subscribes to
      const onToken = Comlink.proxy((cumulativeContent: string) => {
        set({ streamingContent: cumulativeContent.toLowerCase() })
      })

      let result: AskWithRagResult | null = null
      try {
        // Use askWithRagAndAttachments if there are attachments, otherwise use askWithRag
        if (hasAttachments) {
          secureLogger.info('[wilson] sending with attachments:', attachments.length)
          result = await worker.askWithRagAndAttachments(
            text,
            fronterName,
            activeModel,
            resolvedUrl,
            onToken,
            attachments
          )
        } else {
          result = await worker.askWithRag(
            text,
            fronterName,
            activeModel,
            resolvedUrl,
            onToken,
          )
        }
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
    } catch (e: unknown) {
      secureLogger.error("wilson rag error", e)
      const errMsg = e instanceof Error ? e.message : String(e);
      const isEndpointError = errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('connection');
      const displayMsg = isEndpointError
        ? "[wilson can't reach the ai server. please check your connection.]"
        : "[wilson encountered an error. try again?]";

      set((state) => ({
        interactionHistory: [...state.interactionHistory, {
          id: Date.now() + 1,
          role: 'assistant',
          content: displayMsg
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
    } catch { /* ignore parse errors */ }

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
      const apiKey = await get().ensureGeminiApiKey();
      if (!apiKey) {
        set((state) => ({
          interactionHistory: [...state.interactionHistory, {
            id: Date.now() + 1,
            role: 'assistant',
            content: "[wilson needs a google gemini api key to work. please enter it when prompted.]"
          }],
          isThinking: false,
          streamingContent: '',
        }))
        return null
      }

      const needsProxy = isLocalhostUnreachable() || isCapacitorNative()
      const baseUrl = needsProxy ? resolveOllamaEndpoint(apiUrl, MOBILE_SERVER_ORIGIN) : apiUrl
      const resolvedUrl = get().appendGeminiKeyToUrl(baseUrl, apiKey)
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
