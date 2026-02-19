import { create } from 'zustand'
import { generateText } from '@/lib/llm-service'
import { getOllamaGenerateUrl, normalizeGenerateEndpoint } from '@/lib/llm-config'
import { secureLogger } from '@/lib/secure-logger'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

interface LLMState {
  // core state
  isConnected: boolean
  activeModel: string
  apiUrl: string

  // chat history
  interactionHistory: ChatMessage[]
  isThinking: boolean

  // context state
  currentContext: any
  setContext: (data: any) => void

  // actions
  setApiUrl: (url: string) => void
  toggleConnection: () => void
  askWilson: (text: string, isBackground?: boolean) => Promise<string | null>
  clearHistory: () => void
}

export const useLLMStore = create<LLMState>((set, get) => ({
  isConnected: true,
  activeModel: 'qwen2.5:7b',
  apiUrl: (localStorage.getItem('wilson_api_url') ? normalizeGenerateEndpoint(localStorage.getItem('wilson_api_url')!) : getOllamaGenerateUrl()),

  interactionHistory: [],
  isThinking: false,

  currentContext: null,
  setContext: (data) => set({ currentContext: data }),

  setApiUrl: (url) => {
  const normalized = normalizeGenerateEndpoint(url);
  localStorage.setItem('wilson_api_url', normalized)
  set({ apiUrl: normalized })
  },

  toggleConnection: () => set((state) => ({ isConnected: !state.isConnected })),

  clearHistory: () => set({ interactionHistory: [] }),

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

  set({ isThinking: true })

  const { currentContext } = get()

  // get fronting info from localstorage or context
  let fronterName = 'friend'
  try {
  const fronterData = localStorage.getItem('active_fronters')
  if (fronterData) {
 const fronters = JSON.parse(fronterData)
 if (fronters && fronters.length > 0) {
 fronterName = fronters[0].name || fronterName
 }
  }
  } catch {}

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

  const { activeModel, apiUrl } = get()

  try {
  const response = await generateText(fullPrompt, activeModel, apiUrl)

  if (!response) {
 secureLogger.warn("Wilson returned no response.")
 set({ isThinking: false })
 return null
  }

  // add wilson message
  set((state) => ({
 interactionHistory: [...state.interactionHistory, {
 id: Date.now() + 1,
 role: 'assistant',
 content: response
 }],
 isThinking: false
  }))

  return response
  } catch (e) {
  secureLogger.error("Wilson Silent Fail", e)
  set((state) => ({
 interactionHistory: [...state.interactionHistory, {
 id: Date.now() + 1,
 role: 'assistant',
 content: "[Wilson is offline or unreachable]"
 }],
 isThinking: false
  }))
  return null
  }
  }
}))
