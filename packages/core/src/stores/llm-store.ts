import { create } from 'zustand'
import { secureLogger } from '@/lib/secure-logger'
import { storageManager } from '@/lib/storage-manager'
import { getOllamaBase, getOllamaModel, getOllamaGenerateUrl, DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_URL, storeApiConfig, getStoredApiConfig } from '@/lib/llm-config'
import { getAIWorkerProxy } from '@/hooks/use-ai-worker'
import { isCapacitorNative, isLocalhostUnreachable, resolveOllamaEndpoint, MOBILE_SERVER_ORIGIN } from '@/lib/platform'
import * as Comlink from 'comlink'
import type { Attachment, AskWithRagResult } from '@/workers/ai-worker-types'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  attachments?: Attachment[]
  createdAt?: number
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

interface LLMState {
  // core state
  isConnected: boolean
  activeModel: string
  apiUrl: string
  useRag: boolean // enable/disable rag retrieval

  // chat sessions
  sessions: ChatSession[]
  currentSessionId: string | null

  // current chat state
  interactionHistory: ChatMessage[]
  isThinking: boolean
  streamingContent: string

  // context state
  currentContext: Record<string, unknown> | null
  setContext: (data: Record<string, unknown> | null) => void

  // attachments
  pendingAttachments: Attachment[]
  addAttachment: (file: File) => Promise<void>
  removeAttachment: (id: string) => void
  clearAttachments: () => void

  // session management
  createNewChat: (title?: string) => string
  loadSession: (sessionId: string) => void
  renameSession: (sessionId: string, newTitle: string) => void
  deleteSession: (sessionId: string) => void
  setCurrentSessionTitle: (title: string) => void

  // actions
  setApiUrl: (url: string) => void
  setModel: (model: string) => void
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

export const useLLMStore = create<LLMState>()((set, get) => ({
  isConnected: true,
  activeModel: getOllamaModel(),
  apiUrl: getOllamaGenerateUrl(),
  useRag: true, // default to enabled

  // sessions
  sessions: (() => {
    try {
      const saved = storageManager.getItem('wilson_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch { }
    return [];
  })(),
  currentSessionId: null,

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

  // session management
  createNewChat: (title?: string) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || `chat ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    set((state) => {
      const updated = [...state.sessions, newSession];
      storageManager.setItem('wilson_chat_sessions', JSON.stringify(updated));
      return {
        sessions: updated,
        currentSessionId: newSession.id,
        interactionHistory: [],
        streamingContent: ''
      };
    });
    return newSession.id;
  },

  loadSession: (sessionId: string) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (session) {
      set({
        currentSessionId: sessionId,
        interactionHistory: [...session.messages],
        streamingContent: ''
      });
    }
  },

  renameSession: (sessionId: string, newTitle: string) => {
    set((state) => {
      const updated = state.sessions.map(s =>
        s.id === sessionId ? { ...s, title: newTitle } : s
      );
      storageManager.setItem('wilson_chat_sessions', JSON.stringify(updated));
      return { sessions: updated };
    });
  },

  deleteSession: (sessionId: string) => {
    set((state) => {
      const updated = state.sessions.filter(s => s.id !== sessionId);
      storageManager.setItem('wilson_chat_sessions', JSON.stringify(updated));
      const newState: Partial<LLMState> = { sessions: updated };
      if (state.currentSessionId === sessionId) {
        newState.currentSessionId = null;
        newState.interactionHistory = [];
      }
      return newState;
    });
  },

  setCurrentSessionTitle: (title: string) => {
    const { currentSessionId } = get();
    if (currentSessionId) {
      get().renameSession(currentSessionId, title);
    }
  },

  // gemini api key handling (deprecated - using ollama now)
  getGeminiApiKey: () => null,
  ensureGeminiApiKey: async () => null,
  appendGeminiKeyToUrl: (url: string) => url,

  setApiUrl: (url) => {
    const base = url.replace(/\/+$/, '');
    storeApiConfig(base, get().activeModel);
    set({ apiUrl: `${base}/api/generate` });
  },

  setModel: (model: string) => {
    storeApiConfig(getOllamaBase(), model);
    set({ activeModel: model });
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
          attachments: hasAttachments ? [...pendingAttachments] : undefined,
          createdAt: Date.now()
        }],
        pendingAttachments: [] // clear pending attachments after adding
      }))
    }

    set({ isThinking: true, streamingContent: '' })

    // Check if we're using local Ollama (no API key needed)
    const ollamaBase = getOllamaBase();
    const isOllama = !ollamaBase.includes('googleapis.com') && !ollamaBase.includes('gemini');
    
    if (!isOllama) {
      const apiKey = await get().ensureGeminiApiKey();
      if (!apiKey) {
        set((state) => ({
          interactionHistory: [...state.interactionHistory, {
            id: Date.now() + 1,
            role: 'assistant',
            content: "[wilson needs an api key to work. please configure your ai settings.]",
            createdAt: Date.now()
          }],
          isThinking: false,
        }));
        return null;
      }
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

      const { activeModel, apiUrl } = get()
      
      // Use local Ollama directly - no API key needed
      const resolvedUrl = apiUrl;
      
      secureLogger.info('[wilson] using endpoint:', resolvedUrl)
      
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
          secureLogger.debug('[wilson] Calling askWithRagAndAttachments with:', { text, fronterName, activeModel, resolvedUrl, attachmentsCount: attachments?.length });
          result = await worker.askWithRagAndAttachments(
            text,
            fronterName,
            activeModel,
            resolvedUrl,
            onToken,
            attachments
          )
        } else {
          secureLogger.debug('[wilson] Calling askWithRag with:', { text, fronterName, activeModel, resolvedUrl });
          result = await worker.askWithRag(
            text,
            fronterName,
            activeModel,
            resolvedUrl,
            onToken,
          )
        }
        secureLogger.debug('[wilson] Worker call completed, result:', result);
      } finally {
        (onToken as any)[Comlink.releaseProxy]?.()
      }

      if (!result?.response) {
        secureLogger.warn("wilson returned no response.")
        set({ isThinking: false, streamingContent: '' })
        return null
      }

      // finalize: push the completed message into history, clear streaming
      set((state) => {
        const assistantMsg: ChatMessage = {
          id: Date.now() + 1,
          role: 'assistant' as const,
          content: result.response,
          sources: result.sources,
          createdAt: Date.now(),
        };
        const newHistory = [...state.interactionHistory, assistantMsg];
        // save to session if we have one
        const { currentSessionId, sessions } = state;
        let updatedSessions = sessions;
        if (currentSessionId) {
          updatedSessions = sessions.map(s =>
            s.id === currentSessionId
              ? { ...s, messages: newHistory, updatedAt: Date.now() }
              : s
          );
          storageManager.setItem('wilson_chat_sessions', JSON.stringify(updatedSessions));
        }
        return {
          interactionHistory: newHistory,
          sessions: updatedSessions,
          isThinking: false,
          streamingContent: '',
        };
      })

      return result.response
    } catch (e: unknown) {
      secureLogger.error('[wilson] Full error details:', e);
      secureLogger.error('[wilson] Error type:', typeof e);
      secureLogger.error('[wilson] Error constructor:', e?.constructor?.name);
      secureLogger.error('[wilson] Error message:', e instanceof Error ? e.message : String(e));
      secureLogger.error('[wilson] Error stack:', e instanceof Error ? e.stack : 'no stack');
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
          content: displayMsg,
          createdAt: Date.now()
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
      // Use local Ollama directly
      const resolvedUrl = apiUrl;
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
      set((state) => {
        const assistantMsg: ChatMessage = {
          id: Date.now() + 1,
          role: 'assistant' as const,
          content: finalContent
        };
        const newHistory = [...state.interactionHistory, assistantMsg];
        // save to session if we have one
        const { currentSessionId, sessions } = state;
        let updatedSessions = sessions;
        if (currentSessionId) {
          updatedSessions = sessions.map(s =>
            s.id === currentSessionId
              ? { ...s, messages: newHistory, updatedAt: Date.now() }
              : s
          );
          storageManager.setItem('wilson_chat_sessions', JSON.stringify(updatedSessions));
        }
        return {
          interactionHistory: newHistory,
          sessions: updatedSessions,
          isThinking: false,
          streamingContent: '',
        };
      })

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
