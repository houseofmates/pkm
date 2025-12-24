
import { apiRequest } from '@/lib/api-client';

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

export const OLLAMA_MODEL = 'qwen2.5:7b';

export class OllamaClient {

    async chat(messages: ChatMessage[], stream: boolean = false): Promise<ChatResponse> {
        // We are using /api/chat endpoint
        return apiRequest('ollama', 'chat', {
            method: 'POST',
            data: {
                model: OLLAMA_MODEL,
                messages,
                stream // For now, we might stick to non-streaming for simplicity in v1, or handle stream if apiRequest supports it (it relies on fetch/capacitor which can, but my wrapper awaits text)
                // For simplicity: stream = false for now
            }
        });
    }

    // "Other quick accurate search functions"
    // We can use this to generate embeddings or semantic search types later.
    // For now, let's add a robust "ask" method that frames the user query.
    async ask(query: string, context?: string): Promise<string> {
        const systemPrompt = context
            ? `You are a helpful assistant for a Personal Knowledge Management system. Answer the user's question based on the following context:\n\n${context}`
            : `You are a helpful assistant for a Personal Knowledge Management system. Be concise and accurate.`;

        const response = await this.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
        ], false);

        return response.message.content;
    }
}
