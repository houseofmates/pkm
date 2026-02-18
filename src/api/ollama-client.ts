
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
  // direct call to the local ollama server (vite proxy used when configured)
  // keep this simple and use fetch so we don't mix axios clients
  try {
  const base = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
  const url = `${base.replace(/\/$/, '')}/api/chat`;
  const response = await fetch(url, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 },
 body: JSON.stringify({
 model: OLLAMA_MODEL,
 messages,
 stream: false // enforce non-streaming for this client
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

  // "other quick accurate search functions"
  // we can use this to generate embeddings or semantic search types later.
  // for now, let's add a robust "ask" method that frames the user query.
  async ask(query: string, context?: string): Promise<string> {
  const systemPrompt = context
  ? `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and helpful. answer the user's question based on the following context:\n\n${context}`
  : `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and accurate.`;

  const response = await this.chat([
  { role: 'system', content: systemPrompt },
  { role: 'user', content: query }
  ]);

  // ensure response is lowercase
  return response.message.content.toLowerCase();
  }
}
