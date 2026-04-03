
import { getOllamaChatUrl, DEFAULT_OLLAMA_MODEL } from '@/lib/llm-config';
import { secureLogger } from '@/lib/secure-logger';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
  total_duration?: number;
}

export const DEFAULT_CHAT_MODEL = DEFAULT_OLLAMA_MODEL;

export class OllamaClient {
  async chat(messages: ChatMessage[], onStream?: (content: string) => void): Promise<ChatResponse> {
    try {
      const url = getOllamaChatUrl();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: DEFAULT_CHAT_MODEL,
          messages: messages,
          stream: false,
          options: {
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data?.message?.content || '';

      if (onStream) {
        onStream(content.toLowerCase());
      }

      return {
        model: data?.model || DEFAULT_CHAT_MODEL,
        created_at: new Date().toISOString(),
        message: { role: 'assistant', content: content.toLowerCase() },
        done: true,
      };
    } catch (error) {
      secureLogger.error('Ollama Chat Error:', error);
      throw error;
    }
  }

  async ask(query: string, context?: string, onStream?: (content: string) => void): Promise<string> {
    const systemPrompt = context
      ? `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and helpful. answer the user's question based on the following context:\n\n${context}`
      : `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and accurate.`;

    const response = await this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      (content) => {
        if (onStream) onStream(content.toLowerCase());
      }
    );

    return response.message.content.toLowerCase();
  }
}
