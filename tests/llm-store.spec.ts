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
  releaseProxy: vi.fn(),
}))

const mockWorkerProxy = {
  init: vi.fn(),
  askWithRag: vi.fn(),
  askWithRagAndAttachments: vi.fn(),
  chatStream: vi.fn(),
  chatStreamMultimodal: vi.fn(),
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
      activeModel: 'qwen2.5vl:7b-q4_K_M',
      apiUrl: 'http://localhost:11434/api/generate',
      useRag: true,
      pendingAttachments: [],
    })
    // ensure gemini key is present to avoid prompt dialogs in tests
    localStorage.setItem('gemini_api_key', 'test')
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

  it('uses askWithRagAndAttachments when there are pending attachments', async () => {
    // Set up a mock attachment
    const mockAttachment = {
      id: 'test-attachment-1',
      name: 'test.png',
      type: 'image' as const,
      dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
    }

    useLLMStore.setState({
      pendingAttachments: [mockAttachment],
    })

    mockWorkerProxy.askWithRagAndAttachments.mockImplementation(
      async (query: string, fronterName: string, model: string, endpoint: string, onToken: (s: string) => void, attachments: any[]) => {
        onToken('i can see the image')
        return { response: 'i can see the image', sources: ['test:1'] }
      }
    )

    const reply = await useLLMStore.getState().askWilson('what do you see in this image?')

    // worker.askWithRagAndAttachments should have been called
    expect(mockWorkerProxy.askWithRagAndAttachments).toHaveBeenCalled()
    expect(mockWorkerProxy.askWithRagAndAttachments).toHaveBeenCalledWith(
      'what do you see in this image?',
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(Function),
      expect.arrayContaining([expect.objectContaining({ id: 'test-attachment-1' })])
    )

    // pending attachments should be cleared after sending
    expect(useLLMStore.getState().pendingAttachments).toHaveLength(0)

    // reply should be lowercase
    expect(reply).toBe('i can see the image')
  })

  it('adds attachments correctly', async () => {
    const store = useLLMStore.getState()
    
    // Create a mock file
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
    
    await store.addAttachment(mockFile)
    
    const attachments = useLLMStore.getState().pendingAttachments
    expect(attachments).toHaveLength(1)
    expect(attachments[0].name).toBe('test.png')
    expect(attachments[0].type).toBe('image')
  })

  it('removes attachments correctly', () => {
    const store = useLLMStore.getState()
    
    // Set up mock attachments
    useLLMStore.setState({
      pendingAttachments: [
        { id: '1', name: 'test1.png', type: 'image' as const, file: new File([''], 'test1.png') },
        { id: '2', name: 'test2.png', type: 'image' as const, file: new File([''], 'test2.png') },
      ],
    })
    
    store.removeAttachment('1')
    
    const attachments = useLLMStore.getState().pendingAttachments
    expect(attachments).toHaveLength(1)
    expect(attachments[0].id).toBe('2')
  })
})
