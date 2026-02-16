
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

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
  // Direct call to Ollama endpoint (via Vite proxy or direct URL)
  // Using fetch to avoid conflicting with the NocoBase apiClient axios instance
  try {
  const response = await fetch('http://192.168.4.232:11434/api/chat', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 model: OLLAMA_MODEL,
 messages,
 stream: false // Enforce false for this simple client
 })
  });

  if (!response.ok) {
 throw new Error(`Ollama API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
  } catch (error) {
  console.error("Ollama Chat Error:", error);
  throw error;
  }
  }

  // "Other quick accurate search functions"
  // We can use this to generate embeddings or semantic search types later.
  // For now, let's add a robust "ask" method that frames the user query.
  async ask(query: string, context?: string): Promise<string> {
  const systemPrompt = context
  ? `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and helpful. answer the user's question based on the following context:\n\n${context}`
  : `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and accurate.`;

  const response = await this.chat([
  { role: 'system', content: systemPrompt },
  { role: 'user', content: query }
  ]);

  // Ensure response is lowercase
  return response.message.content.toLowerCase();
  }
}
