import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'
import { WilsonChat } from '@/features/chat/wilson-chat'
import { useEdgelessStore } from '@/features/edgeless/store'
import { useLLMStore } from '@/stores/llm-store'

// mock comlink (needed by llm-store)
vi.mock('comlink', () => ({
  proxy: vi.fn((fn: any) => fn),
  wrap: vi.fn(),
  expose: vi.fn(),
}))

// mock the ai worker proxy
vi.mock('@/hooks/use-ai-worker', () => ({
  getAIWorkerProxy: vi.fn(() => ({
    init: vi.fn(),
    askWithRag: vi.fn(),
    chatStream: vi.fn(),
    searchKnowledgeBase: vi.fn(),
    generateEmbedding: vi.fn(),
    buildRagPrompt: vi.fn(),
    generateText: vi.fn(),
  })),
}))

describe('WilsonChat /ai flow', () => {
  beforeEach(() => {
    // ensure chat panel is open for the component to render
    useEdgelessStore.setState({ isChatOpen: true })

    // reset llm store state and stub askwilson
    useLLMStore.setState({
      interactionHistory: [],
      isThinking: false,
      streamingContent: '',
      currentContext: null,
    })
  })

  it('sends /ai prompt, injects page context, and calls askWilson', async () => {
    const askSpy = vi.fn(async (text: string) => {
      // emulate store behavior that adds assistant reply
      useLLMStore.setState((s: any) => ({
        interactionHistory: [...s.interactionHistory, {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'ok from wilson',
        }],
      }))
      return 'ok from wilson'
    })

    // replace implementation with our spy
    useLLMStore.setState({ askWilson: askSpy })

    // ensure document.body.innertext exists for context extraction
    Object.defineProperty(document.body, 'innerText', {
      value: 'sample page text for context',
      configurable: true,
    });

    render(<WilsonChat />)

    const input = screen.getByPlaceholderText('query...') as HTMLInputElement
    // simulate user typing the slash command
    fireEvent.change(input, { target: { value: '/ai analyse the page' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => expect(askSpy).toHaveBeenCalled())

    // verify askwilson received the stripped prompt (without '/ai')
    expect(askSpy).toHaveBeenCalledWith('analyse the page')

    // verify that the llm store received the assistant message we emulated
    const history = useLLMStore.getState().interactionHistory
    expect(history.some(h => h.role === 'assistant' && h.content === 'ok from wilson')).toBeTruthy()
  })

  it('renders streaming content in a separate bubble', () => {
    useLLMStore.setState({
      interactionHistory: [
        { id: 1, role: 'user', content: 'hello' },
      ],
      isThinking: true,
      streamingContent: 'partial response from wilson...',
    })

    useEdgelessStore.setState({ isChatOpen: true })

    render(<WilsonChat />)

    // the streaming content should be visible
    expect(screen.getByText('partial response from wilson...')).toBeTruthy()
  })
})