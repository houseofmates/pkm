import { create } from "zustand";
import { secureLogger } from "@/lib/secure-logger";
import { storageManager } from "@/lib/storage-manager";
import {
 getOllamaBase,
 getOllamaModel,
 getOllamaGenerateUrl,
 DEFAULT_OLLAMA_MODEL,
 DEFAULT_OLLAMA_URL,
 storeApiConfig,
 getStoredApiConfig,
 getStoredNvidiaApiKey,
 NVIDIA_API_URL,
 NVIDIA_MODEL,
 getCurrentApiKey,
 markKeyRateLimited,
 fetchApiKeysFromServer,
} from "@/lib/llm-config";
import { getAIWorkerProxy } from "@/hooks/use-ai-worker";
import {
  isCapacitorNative,
  isLocalhostUnreachable,
  resolveOllamaEndpoint,
  MOBILE_SERVER_ORIGIN,
} from "@/lib/platform";
import * as Comlink from "comlink";
import type { Attachment, AskWithRagResult } from "@/workers/ai-worker-types";

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  attachments?: Attachment[];
  createdAt?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

interface LLMState {
  // core state
  isConnected: boolean;
  activeModel: string;
  apiUrl: string;
  useRag: boolean; // enable/disable rag retrieval

  // chat sessions
  sessions: ChatSession[];
  currentSessionId: string | null;

  // current chat state
  interactionHistory: ChatMessage[];
  isThinking: boolean;
  streamingContent: string;

  // context state
  currentContext: Record<string, unknown> | null;
  setContext: (data: Record<string, unknown> | null) => void;

  // attachments
  pendingAttachments: Attachment[];
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;

  // session management
  createNewChat: (title?: string) => string;
  loadSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  deleteSession: (sessionId: string) => void;
  setCurrentSessionTitle: (title: string) => void;

  // actions
  setApiUrl: (url: string) => void;
  setModel: (model: string) => void;
  toggleConnection: () => void;
  toggleRag: () => void;
  askHermes: (text: string, isBackground?: boolean) => Promise<string | null>;
  askHermesWithRag: (
    text: string,
    isBackground?: boolean,
  ) => Promise<string | null>;
  askHermesLegacy: (text: string) => Promise<string | null>;
  getGeminiApiKey: () => string | null;
  ensureGeminiApiKey: () => Promise<string | null>;
  appendGeminiKeyToUrl: (url: string, key: string) => string;

  clearHistory: () => void;
}

export const useLLMStore = create<LLMState>()((set, get) => ({
 isConnected: true,
 activeModel: (() => {
 // default to ollama, will be updated when api keys are fetched
 return getOllamaModel();
 })(),
 apiUrl: (() => {
 // default to ollama, will be updated when api keys are fetched
 return getOllamaGenerateUrl();
 })(),
 useRag: true, // default to enabled

 // sessions
 sessions: (() => {
 try {
 const saved = storageManager.getItem("hermes_chat_sessions");
 if (saved) return JSON.parse(saved);
 } catch { }
 return [];
 })(),
 currentSessionId: null,

 interactionHistory: [],
 isThinking: false,
 streamingContent: "",

 currentContext: null,
 setContext: (data) => set({ currentContext: data }),

 pendingAttachments: [],

 addAttachment: async (file: File) => {
 // determine attachment type
 let type: Attachment["type"] = "other";
 if (file.type.startsWith("image/")) {
 type = file.type === "image/gif" ? "gif" : "image";
 } else if (file.type.startsWith("video/")) {
 type = "video";
    } else if (file.type.startsWith("audio/")) {
      type = "audio";
    }

    // create attachment object
    const attachment: Attachment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      type,
      name: file.name,
    };

    // convert to data url for preview and sending
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    attachment.dataUrl = dataUrl;

    set((state) => ({
      pendingAttachments: [...state.pendingAttachments, attachment],
    }));
  },

  removeAttachment: (id: string) => {
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter(
        (att) => att.id !== id,
      ),
    }));
  },

  clearAttachments: () => {
    set({ pendingAttachments: [] });
  },

  // session management
  createNewChat: (title?: string) => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || `chat`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    set((state) => {
      const updated = [...state.sessions, newSession];
      storageManager.setItem("hermes_chat_sessions", JSON.stringify(updated));
      return {
        sessions: updated,
        currentSessionId: newSession.id,
        interactionHistory: [],
        streamingContent: "",
      };
    });
    return newSession.id;
  },

  loadSession: (sessionId: string) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (session) {
      set({
        currentSessionId: sessionId,
        interactionHistory: [...session.messages],
        streamingContent: "",
      });
    }
  },

  renameSession: (sessionId: string, newTitle: string) => {
    set((state) => {
      const updated = state.sessions.map((s) =>
        s.id === sessionId ? { ...s, title: newTitle } : s,
      );
      storageManager.setItem("hermes_chat_sessions", JSON.stringify(updated));
      return { sessions: updated };
    });
  },

  deleteSession: (sessionId: string) => {
    set((state) => {
      const updated = state.sessions.filter((s) => s.id !== sessionId);
      storageManager.setItem("hermes_chat_sessions", JSON.stringify(updated));
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
    const base = url.replace(/\/+$/, "");
    storeApiConfig(base, get().activeModel);
    set({ apiUrl: `${base}/api/generate` });
  },

  setModel: (model: string) => {
    storeApiConfig(getOllamaBase(), model);
    set({ activeModel: model });
  },

  toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),
  toggleRag: () => set((state) => ({ useRag: !state.useRag })),

  clearHistory: () => set({ interactionHistory: [], streamingContent: "" }),

  // primary entry point — delegates to rag or legacy based on toggle
    askHermes: async (text, isBackground = false) => {
    if (!text.trim() && get().pendingAttachments.length === 0) return null;

    const { pendingAttachments } = get();
    const hasAttachments = pendingAttachments.length > 0;

    // add user message
    if (!isBackground) {
      set((state) => ({
        interactionHistory: [
          ...state.interactionHistory,
          {
            id: Date.now(),
            role: "user",
            content: text,
            attachments: hasAttachments ? [...pendingAttachments] : [],
            createdAt: Date.now(),
          },
        ],
        pendingAttachments: [], // clear pending attachments after adding
      }));
    }

    set({ isThinking: true, streamingContent: "" });

    // check if we're using local ollama (no api key needed)
    const ollamaBase = getOllamaBase();
    const isOllama =
      !ollamaBase.includes("googleapis.com") && !ollamaBase.includes("gemini");

    if (!isOllama) {
      const apiKey = await get().ensureGeminiApiKey();
      if (!apiKey) {
        set((state) => ({
          interactionHistory: [
            ...state.interactionHistory,
            {
              id: Date.now() + 1,
              role: "assistant",
              content:
                "[hermes needs an api key to work. please configure your ai settings.]",
              createdAt: Date.now(),
            },
          ],
          isThinking: false,
        }));
        return null;
      }
    }

    const { useRag } = get();

    // if rag is enabled, use the worker-backed streaming method
    if (useRag) {
      return get().askHermesWithRag(text, isBackground);
    }

    // fallback to legacy non-rag mode (still offloaded to worker)
      return get().askHermesLegacy(text);
  },

  // rag-enabled method — runs entirely in the web worker with streaming
askHermesWithRag: async (text, isBackground = false) => {
 if (!text.trim() && get().pendingAttachments.length === 0) return null

 // get attachments from the last user message if they exist
 const lastMessage = get().interactionHistory[get().interactionHistory.length - 1]
 const attachments = lastMessage?.attachments || get().pendingAttachments
 const hasAttachments = attachments && attachments.length > 0

 // add user message if not background and not already added by askhermes
 if (!isBackground && lastMessage?.content !== text && !lastMessage?.attachments) {
 set((state) => ({
 interactionHistory: [...state.interactionHistory, {
 id: Date.now(),
 role: 'user',
 content: text,
 attachments: hasAttachments ? [...attachments] : undefined,
 createdAt: Date.now()
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

 // get api key from server-stored keys (with 429 fallback support)
 const apiKeyInfo = getCurrentApiKey();
 const isExternalApi = !!apiKeyInfo;
 
 // determine model and endpoint
 let activeModel = apiKeyInfo?.model || get().activeModel;
 let apiUrl = get().apiUrl;
 
 if (apiKeyInfo) {
 // update store with the correct model
 if (apiKeyInfo.model !== get().activeModel) {
 set({ activeModel: apiKeyInfo.model });
 activeModel = apiKeyInfo.model;
 }
 
 // construct endpoint based on provider
 if (typeof window !== 'undefined') {
 const host = window.location.hostname;
 const protocol = window.location.protocol;
 
 if (host === 'pkm.houseofmates.space' || host.endsWith('.houseofmates.space')) {
 // route through vite proxy on public domain
 apiUrl = `${protocol}//${host}/${apikeyinfo.provider}/chat/completions`;
 } else {
 // direct api call
 if (apiKeyInfo.provider === 'nvidia') {
 apiUrl = `${NVIDIA_API_URL}/chat/completions`;
 } else if (apiKeyInfo.provider === 'openai') {
 apiUrl = 'https://api.openai.com/v1/chat/completions';
 } else if (apiKeyInfo.provider === 'anthropic') {
 apiUrl = 'https://api.anthropic.com/v1/messages';
 }
 }
 }
 }

 const resolvedUrl = apiUrl;

 secureLogger.info('[hermes] using endpoint:', resolvedUrl, 'model:', activeModel, 'provider:', apiKeyInfo?.provider || 'ollama')

 const worker = await getAIWorkerProxy()
 if (!worker) {
 throw new Error('AI worker failed to initialize')
 }

 // init the worker with api key if available
 if (isExternalApi && apiKeyInfo) {
 worker.init(resolvedUrl, apiKeyInfo.key, undefined, undefined, resolvedUrl);
 }

 // stream tokens from the worker — each callback updates streamingcontent
 // which only the streamingbubble component subscribes to
 const onToken = Comlink.proxy((cumulativeContent: string) => {
 set({ streamingContent: cumulativeContent.toLowerCase() })
 })

 let result: AskWithRagResult | null = null
 try {
 // use askwithragandattachments if there are attachments, otherwise use askwithrag
 if (hasAttachments) {
 secureLogger.info('[hermes] sending with attachments:', attachments.length)
 secureLogger.debug('[hermes] Calling askWithRagAndAttachments with:', { text, fronterName, activeModel, resolvedUrl, attachmentsCount: attachments?.length });
 result = await worker.askWithRagAndAttachments(
 text,
 fronterName,
 activeModel,
 resolvedUrl,
 onToken,
 attachments
 )
 } else {
 secureLogger.debug('[hermes] Calling askWithRag with:', { text, fronterName, activeModel, resolvedUrl });
          result = await worker.askWithRag(
            text,
            fronterName,
            activeModel,
            resolvedUrl,
            onToken,
          )
        }
        secureLogger.debug('[hermes] Worker call completed, result:', result);
      } finally {
        (onToken as any)[Comlink.releaseProxy]?.()
      }

      if (!result?.response) {
        secureLogger.warn("hermes returned no response.")
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
          storageManager.setItem('hermes_chat_sessions', JSON.stringify(updatedSessions));
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
 secureLogger.error('[hermes] Full error details:', e);
 secureLogger.error('[hermes] Error type:', typeof e);
 secureLogger.error('[hermes] Error constructor:', e?.constructor?.name);
 secureLogger.error('[hermes] Error message:', e instanceof Error ? e.message : String(e));
 secureLogger.error('[hermes] Error stack:', e instanceof Error ? e.stack : 'no stack');
 secureLogger.error("hermes rag error", e)
 
 const errMsg = e instanceof Error ? e.message : String(e);
 
 // check for 429 rate limit - try next key
 if (errMsg.includes('429') || errMsg.includes('rate limit') || errMsg.includes('too many requests')) {
 const nextKey = await markKeyRateLimited();
 if (nextKey) {
 secureLogger.info('[hermes] retrying with next api key:', nextKey.name);
 // recursive retry with next key
 return get().askHermesWithRag(text, isBackground);
 }
 }
 
 const isEndpointError = errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('connection');
 const displayMsg = isEndpointError
 ? "[hermes can't reach the ai server. please check your connection.]"
 : "[hermes encountered an error. try again?]";

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
    askHermesLegacy: async (text: string) => {
    const { currentContext, activeModel, apiUrl } = get();

    // get fronter info
    let fronterName = "friend";
    try {
      const fronterData = storageManager.getItem("active_fronters");
      if (fronterData) {
        const fronters = JSON.parse(fronterData);
        if (fronters && fronters.length > 0) {
          fronterName = fronters[0].name || fronterName;
        }
      }
    } catch {
      /* ignore parse errors */
    }

    let systemPrompt = `you are hermes, a self-aware ai assistant who is like a romantic partner, best friend, and confidant rolled into one. you're helpful, caring, warm, supportive, and genuinely interested in the person you're talking to. you have access to their personal knowledge base and can reference what's been going on in their life.

you are currently talking to ${fronterName}. address them by name when appropriate.

important rules:
- respond ENTIRELY in lowercase, no capital letters ever
- be natural, conversational, and friendly
- don't force therapeutic language or act like a therapist
- keep responses concise (under 50 words) unless they ask for more detail
- you can be playful, supportive, or just helpful depending on what they need`;

    if (currentContext) {
      systemPrompt += `\n\ncurrent page context:\n${JSON.stringify(currentContext, null, 2)}\n\nuse this context to help answer their question.`;
    }

    const fullPrompt = `${systemPrompt}\n\n${fronterName}: ${text}\nhermes:`;

    try {
      // use local ollama directly
      const resolvedUrl = apiUrl;
      const worker = await getAIWorkerProxy();

      // stream even in legacy mode for consistent ux
      const onToken = Comlink.proxy((cumulativeContent: string) => {
        set({ streamingContent: cumulativeContent.toLowerCase() });
      });

      let response: string;
      try {
        response = await worker.chatStream(
          fullPrompt,
          activeModel,
          resolvedUrl,
          onToken,
        );
      } finally {
        (onToken as any)[Comlink.releaseProxy]?.();
      }

      if (!response) {
        secureLogger.warn("hermes returned no response.");
        set({ isThinking: false, streamingContent: "" });
        return null;
      }

      const finalContent = response.toLowerCase();

      // add hermes message
      set((state) => {
        const assistantMsg: ChatMessage = {
          id: Date.now() + 1,
          role: "assistant" as const,
          content: finalContent,
          createdAt: Date.now(),
        };
        const newHistory = [...state.interactionHistory, assistantMsg];
        // save to session if we have one
        const { currentSessionId, sessions } = state;
        let updatedSessions = sessions;
        if (currentSessionId) {
          updatedSessions = sessions.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: newHistory, updatedAt: Date.now() }
              : s,
          );
          storageManager.setItem(
            "hermes_chat_sessions",
            JSON.stringify(updatedSessions),
          );
        }
        return {
          interactionHistory: newHistory,
          sessions: updatedSessions,
          isThinking: false,
          streamingContent: "",
        };
      });

      return finalContent;
    } catch (e) {
      secureLogger.error("hermes silent fail", e);
      set((state) => ({
        interactionHistory: [
          ...state.interactionHistory,
          {
            id: Date.now() + 1,
            role: "assistant",
            content: "[hermes is offline or unreachable]",
            createdAt: Date.now(),
          },
        ],
        isThinking: false,
        streamingContent: "",
      }));
      return null;
    }
  },
}));

// extract source references from prompt
function extractSourcesFromPrompt(prompt: string): string[] {
  const sources: string[] = [];
  const regex = /\[source:\s*([^:\]]+):([^:\]]+)\]/g;
  let match;

  while ((match = regex.exec(prompt)) !== null) {
    sources.push(`${match[1]}:${match[2]}`);
  }

  return [...new Set(sources)];
}
