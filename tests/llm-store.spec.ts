import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLLMStore } from '@/stores/llm-store'

// mock the underlying llm-service so we don't make network calls
vi.mock('@/lib/llm-service', () => ({
  generateText: vi.fn()
}))

import { generateText } from '@/lib/llm-service'

describe('useLLMStore.askWilson', () => {
  beforeEach(() => {
    // reset store state
    useLLMStore.setState({
      interactionHistory: [],
      isThinking: false,
      currentContext: null,
      activeModel: 'qwen2.5:7b',
      apiUrl: 'http://localhost:11434/api/generate'
    })
    ;(generateText as any).mockReset()
  })

  it('includes currentContext in system prompt and appends assistant reply', async () => {
    ;(generateText as any).mockResolvedValue('mocked ai reply')

    // set background context and call askwilson
    useLLMStore.getState().setContext({ page: 'hello world' })

    const reply = await useLLMStore.getState().askWilson('summarize this')

    // generatetext should have been called and its first arg must include the context json
    expect((generateText as any).mock.calls.length).toBeGreaterThan(0)
    const calledPrompt: string = (generateText as any).mock.calls[0][0]
    expect(calledPrompt).toContain('current page context')
    expect(calledPrompt).toContain('hello world')

    // store should contain assistant message
    const history = useLLMStore.getState().interactionHistory
    expect(history.some(m => m.role === 'assistant' && m.content === 'mocked ai reply')).toBeTruthy()
    expect(reply).toBe('mocked ai reply')
  })
})