
import { getOllamaChatUrl, DEFAULT_GEMINI_MODEL, ensureGeminiApiKey } from '@/lib/llm-config';
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

export const DEFAULT_CHAT_MODEL = DEFAULT_GEMINI_MODEL;

export class OllamaClient {
  async chat(messages: ChatMessage[], onStream?: (content: string) => void): Promise<ChatResponse> {
    try {
      const apiKey = await ensureGeminiApiKey();
      if (!apiKey) {
        throw new Error('missing google gemini api key');
      }

      const url = getOllamaChatUrl();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: {
            messages: messages.map(m => ({
              author: m.role === 'system' ? 'system' : 'user',
              content: [{ type: 'text', text: m.content }],
            })),
          },
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0]?.content || '';
      const content = typeof candidate === 'string' ? candidate : '';

      if (onStream) {
        onStream(content.toLowerCase());
      }

      return {
        model: DEFAULT_CHAT_MODEL,
        created_at: new Date().toISOString(),
        message: { role: 'assistant', content: content.toLowerCase() },
        done: true,
      };
    } catch (error) {
      secureLogger.error('Gemini Chat Error:', error);
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
