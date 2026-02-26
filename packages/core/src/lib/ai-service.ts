import { getOllamaGenerateUrl } from '@/lib/llm-config';
import { secureLogger } from './secure-logger';

export interface AIResponse {
  response: string;
  done: boolean;
}

export async function generateResponse(context: string, prompt: string, model: string = 'qwen2.5:7b'): Promise<string> {
    const systemPrompt = `you are wilson, a thoughtful assistant for a personal knowledge workspace. respond entirely in lowercase, be concise and friendly. treat the following text as background context for the user's question:\n\n${context}`;

  try {
  const url = getOllamaGenerateUrl();
  const res = await fetch(url, {
  method: 'POST',
  headers: {
 'Content-Type': 'application/json',
  },
  body: JSON.stringify({
 model: model,
 prompt: `${systemPrompt}\n\nuser question: ${prompt}`,
 stream: false
  })
  });

  if (!res.ok) {
  throw new Error(`Ollama Error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.response;
  } catch (err) {
  secureLogger.error('AI Service Error:', err);
  return "sorry, i couldn't reach the ai right now. is ollama running?";
  }
}
