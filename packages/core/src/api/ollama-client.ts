
import { getOllamaChatUrl } from '@/lib/llm-config';
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

export const oLLAMA_MODEL = 'qwen2.5vl:latest';

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
          model: oLLAMA_MODEL,
          messages,
          stream: !!onStream
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.statusText}`);
      }

      if (onStream) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (!reader) throw new Error("Could not get stream reader");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                fullContent += json.message.content;
                onStream(fullContent);
              }
              if (json.done) {
                return json;
              }
            } catch (e) {
              // ignore partial json
            }
          }
        }
        return { model: oLLAMA_MODEL, created_at: new Date().toISOString(), message: { role: 'assistant', content: fullContent }, done: true };
      } else {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      secureLogger.error("Ollama Chat Error:", error);
      throw error;
    }
  }

  async ask(query: string, context?: string, onStream?: (content: string) => void): Promise<string> {
    const systemPrompt = context
      ? `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and helpful. answer the user's question based on the following context:\n\n${context}`
      : `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and accurate.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ], (content) => {
      if (onStream) onStream(content.toLowerCase());
    });

    return response.message.content.toLowerCase();
  }
}
