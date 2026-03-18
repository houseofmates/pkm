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
  releaseProxy: vi.fn(),
}))

// mock the ai worker proxy
vi.mock('@/hooks/use-ai-worker', () => ({
  getAIWorkerProxy: vi.fn(() => ({
    init: vi.fn(),
    askWithRag: vi.fn(),
    askWithRagAndAttachments: vi.fn(),
    chatStream: vi.fn(),
    chatStreamMultimodal: vi.fn(),
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
      pendingAttachments: [],
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

  it('shows attachment button', () => {
    useEdgelessStore.setState({ isChatOpen: true })
    render(<WilsonChat />)

    // There should be a paperclip/attachment button
    const attachmentButton = screen.getByTitle('Attach files (images, gifs, videos)')
    expect(attachmentButton).toBeTruthy()
  })

  it('displays pending attachments in the header', () => {
    useEdgelessStore.setState({ isChatOpen: true })
    useLLMStore.setState({
      pendingAttachments: [
        { id: '1', name: 'test.png', type: 'image', file: new File([''], 'test.png') },
        { id: '2', name: 'test.gif', type: 'gif', file: new File([''], 'test.gif') },
      ],
    })

    render(<WilsonChat />)

    // Should show attachment count in header
    expect(screen.getByText('2 attachments')).toBeTruthy()
  })

  it('disables send button when no input and no attachments', () => {
    useEdgelessStore.setState({ isChatOpen: true })
    useLLMStore.setState({
      pendingAttachments: [],
    })

    render(<WilsonChat />)

    const sendButton = screen.getByRole('button', { name: '' }) // Send button has no text, just icon
    expect(sendButton).toBeDisabled()
  })

  it('enables send button when there are attachments even without text input', () => {
    useEdgelessStore.setState({ isChatOpen: true })
    useLLMStore.setState({
      pendingAttachments: [
        { id: '1', name: 'test.png', type: 'image', file: new File([''], 'test.png') },
      ],
    })

    render(<WilsonChat />)

    // The send button should be enabled because there's an attachment
    // Note: The button might not have a specific accessible name, so we check by finding the button
    // inside the input container
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons.find(btn => btn.querySelector('svg')) // Find button with Send icon
    expect(sendButton).not.toBeDisabled()
  })
})
