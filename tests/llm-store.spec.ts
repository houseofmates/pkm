import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLLMStore } from '@/stores/llm-store'

// mock the ai worker proxy so we don't spawn real workers in tests
vi.mock('@/hooks/use-ai-worker', () => ({
  getAIWorkerProxy: vi.fn(() => mockWorkerProxy),
}))

// mock comlink
vi.mock('comlink', () => ({
  proxy: vi.fn((fn: any) => fn),
  wrap: vi.fn(),
  expose: vi.fn(),
}))

const mockWorkerProxy = {
  init: vi.fn(),
  askWithRag: vi.fn(),
  chatStream: vi.fn(),
  searchKnowledgeBase: vi.fn(),
  generateEmbedding: vi.fn(),
  buildRagPrompt: vi.fn(),
  generateText: vi.fn(),
}

describe('useLLMStore.askWilson', () => {
  beforeEach(() => {
    // reset store state
    useLLMStore.setState({
      interactionHistory: [],
      isThinking: false,
      streamingContent: '',
      currentContext: null,
      activeModel: 'qwen2.5vl:latest',
      apiUrl: 'http://localhost:11434/api/generate',
      useRag: true,
    })
    vi.clearAllMocks()
  })

  it('delegates to worker.askWithRag when rag is enabled and appends assistant reply', async () => {
    mockWorkerProxy.askWithRag.mockImplementation(
      async (query: string, fronterName: string, model: string, endpoint: string, onToken: (s: string) => void) => {
        // simulate streaming tokens
        onToken('hel')
        onToken('hello ')
        onToken('hello there')
        return { response: 'hello there', sources: ['test:1'] }
      }
    )

    const reply = await useLLMStore.getState().askWilson('summarize this')

    // worker.askWithRag should have been called
    expect(mockWorkerProxy.askWithRag).toHaveBeenCalled()

    // store should contain assistant message
    const history = useLLMStore.getState().interactionHistory
    expect(history.some(m => m.role === 'assistant' && m.content === 'hello there')).toBeTruthy()
    expect(history.some(m => m.role === 'assistant' && m.sources?.includes('test:1'))).toBeTruthy()
    expect(reply).toBe('hello there')

    // streaming should be cleared after completion
    expect(useLLMStore.getState().streamingContent).toBe('')
    expect(useLLMStore.getState().isThinking).toBe(false)
  })

  it('falls back to legacy chatStream when rag is disabled', async () => {
    useLLMStore.setState({ useRag: false })

    mockWorkerProxy.chatStream.mockImplementation(
      async (prompt: string, model: string, endpoint: string, onToken: (s: string) => void) => {
        onToken('legacy reply')
        return 'legacy reply'
      }
    )

    const reply = await useLLMStore.getState().askWilson('hello')

    expect(mockWorkerProxy.chatStream).toHaveBeenCalled()
    expect(reply).toBe('legacy reply')
  })

  it('handles worker errors gracefully', async () => {
    mockWorkerProxy.askWithRag.mockRejectedValue(new Error('worker crashed'))

    const reply = await useLLMStore.getState().askWilson('this will fail')

    expect(reply).toBeNull()
    const history = useLLMStore.getState().interactionHistory
    expect(history.some(m => m.content.includes('error'))).toBeTruthy()
    expect(useLLMStore.getState().isThinking).toBe(false)
  })
})