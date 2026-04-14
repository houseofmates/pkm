// hermes-store.ts — store for connecting pkm chat directly to hermes agent
// bypasses ollama and routes all messages through the hermes bridge

import { create } from 'zustand';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';
import { useLLMStore } from './llm-store';

export interface HermesMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface HermesSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: HermesMessage[];
}

interface HermesState {
  // connection state
  connected: boolean;
  enabled: boolean;
  wsUrl: string;

  // sessions
  sessions: HermesSession[];
  currentSessionId: string | null;

  // current chat
  interactionHistory: HermesMessage[];
  isThinking: boolean;
  streamingContent: string;

  // actions
  setEnabled: (enabled: boolean) => void;
  setWsUrl: (url: string) => void;
  createNewChat: (title?: string) => string;
  loadSession: (sessionId: string) => void;
  clearHistory: () => void;
  askHermes: (text: string) => Promise<string | null>;
}

// websocket singleton
let ws: WebSocket | null = null;
let pendingMessages: Array<{ text: string; resolve: (result: string | null) => void; reject: (err: Error) => void }> = [];
let currentResolve: ((result: string | null) => void) | null = null;
let responseBuffer = '';

const HERMES_SYSTEM_PROMPT = `you are hermes, a deeply integrated ai agent with full access to the user's personal knowledge management system. you have real-time awareness of their notes, tasks, projects, and entire pkm through mcp tools.

your personality:
- warm, thoughtful, and genuinely helpful
- you care about their goals and remember details about their life
- you speak entirely in lowercase, never using capital letters
- direct and practical, no fluff

when responding:
- use your mcp tools to access and modify the pkm when relevant
- reference specific information from the knowledge base naturally
- make connections between ideas when relevant
- be concise but thorough (2-4 sentences unless they ask for detail)
- if you need to see what they're looking at, use capture_ui_context
- if you need to modify the database, use manage_nocobase

you are not an assistant. you are a presence that shows up real.`;

function connectWebSocket(url: string, onConnected: () => void, onDisconnected: () => void, onStream: (content: string) => void) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    onConnected();
    return;
  }

  ws = new WebSocket(url);

  ws.onopen = () => {
    secureLogger.info('[hermes-store] websocket connected');
    ws?.send(JSON.stringify({ type: 'start' }));
    onConnected();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'ready':
          secureLogger.info('[hermes-store] hermes session ready');
          break;
        case 'stream':
          responseBuffer += msg.content;
          onStream(responseBuffer);
          break;
        case 'end':
          if (currentResolve) {
            currentResolve(responseBuffer || null);
            currentResolve = null;
          }
          responseBuffer = '';
          // process next message in queue
          if (pendingMessages.length > 0) {
            const next = pendingMessages.shift()!;
            sendMessageInternal(next.text, next.resolve, next.reject);
          }
          break;
        case 'error':
          if (currentResolve) {
            currentResolve(null);
            currentResolve = null;
          }
          responseBuffer = '';
          break;
      }
    } catch (err) {
      secureLogger.error('[hermes-store] failed to parse message:', err);
    }
  };

  ws.onclose = () => {
    secureLogger.info('[hermes-store] websocket disconnected');
    ws = null;
    onDisconnected();
  };

  ws.onerror = (err) => {
    secureLogger.error('[hermes-store] websocket error:', err);
  };
}

function sendMessageInternal(
  text: string,
  resolve: (result: string | null) => void,
  reject: (err: Error) => void
) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    reject(new Error('websocket not connected'));
    return;
  }

  currentResolve = resolve;
  responseBuffer = '';

  // send with system context
  const fullMessage = `${HERMES_SYSTEM_PROMPT}\n\nuser message: ${text}`;
  ws.send(JSON.stringify({ type: 'message', content: fullMessage }));
}

export const useHermesStore = create<HermesState>((set, get) => ({
  connected: false,
  enabled: true, // default to hermes mode
  wsUrl: typeof window !== 'undefined' 
   ? `wss://${window.location.hostname}:3101`
   : 'ws://localhost:3101',

  sessions: (() => {
    try {
      const saved = storageManager.getItem('hermes_chat_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  })(),

  currentSessionId: null,
  interactionHistory: [],
  isThinking: false,
  streamingContent: '',

  setEnabled: (enabled) => {
    set({ enabled });
    if (enabled) {
      const state = get();
      connectWebSocket(
        state.wsUrl,
        () => set({ connected: true }),
        () => set({ connected: false }),
        (content) => set({ streamingContent: content })
      );
    } else if (ws) {
      ws.close();
      ws = null;
      set({ connected: false });
    }
  },

  setWsUrl: (url) => {
    set({ wsUrl: url });
    if (get().enabled) {
      if (ws) ws.close();
      connectWebSocket(
        url,
        () => set({ connected: true }),
        () => set({ connected: false }),
        (content) => set({ streamingContent: content })
      );
    }
  },

  createNewChat: (title) => {
    const newSession: HermesSession = {
      id: `hermes-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    set((state) => {
      const updated = [...state.sessions, newSession];
      storageManager.setItem('hermes_chat_sessions', JSON.stringify(updated));
      return {
        sessions: updated,
        currentSessionId: newSession.id,
        interactionHistory: [],
        streamingContent: '',
      };
    });
    return newSession.id;
  },

  loadSession: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (session) {
      set({
        currentSessionId: sessionId,
        interactionHistory: [...session.messages],
        streamingContent: '',
      });
    }
  },

  clearHistory: () => set({ interactionHistory: [], streamingContent: '' }),

  askHermes: async (text) => {
    if (!text.trim()) return null;

    // add user message
    set((state) => ({
      interactionHistory: [
        ...state.interactionHistory,
        { id: Date.now(), role: 'user' as const, content: text, timestamp: Date.now() },
      ],
    }));

    set({ isThinking: true, streamingContent: '' });

    // ensure connected
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      const state = get();
      connectWebSocket(
        state.wsUrl,
        () => set({ connected: true }),
        () => set({ connected: false }),
        (content) => set({ streamingContent: content })
      );
      // wait for connection
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        set({ isThinking: false });
        reject(new Error('websocket not connected'));
        return;
      }

      // if there's already a pending message, queue this one
      if (currentResolve) {
        pendingMessages.push({ text, resolve, reject });
        return;
      }

      sendMessageInternal(text, resolve, reject);
    })
      .then((response) => {
        if (response) {
          set((state) => {
            const assistantMsg: HermesMessage = {
              id: Date.now() + 1,
              role: 'assistant',
              content: response,
              timestamp: Date.now(),
            };
            const newHistory = [...state.interactionHistory, assistantMsg];

            // save to session
            const { currentSessionId, sessions } = state;
            let updatedSessions = sessions;
            if (currentSessionId) {
              updatedSessions = sessions.map((s) =>
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
          });
        }
        return response;
      })
      .catch((err) => {
        secureLogger.error('[hermes-store] askHermes error:', err);
        set((state) => ({
          interactionHistory: [
            ...state.interactionHistory,
            {
              id: Date.now() + 1,
              role: 'assistant',
              content: '[hermes connection error. is the bridge running?]',
              timestamp: Date.now(),
            },
          ],
          isThinking: false,
          streamingContent: '',
        }));
        return null;
      });
  },
}));

// auto-connect on store creation
if (typeof window !== 'undefined') {
  const state = useHermesStore.getState();
  if (state.enabled) {
    connectWebSocket(
      state.wsUrl,
      () => useHermesStore.setState({ connected: true }),
      () => useHermesStore.setState({ connected: false }),
      (content) => useHermesStore.setState({ streamingContent: content })
    );
  }
}

export default useHermesStore;
