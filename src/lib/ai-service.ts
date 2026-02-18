export interface AIResponse {
  response: string;
  done: boolean;
}

export async function generateResponse(context: string, prompt: string, model: string = 'qwen2.5:7b'): Promise<string> {
    const systemPrompt = `you are wilson, a thoughtful assistant for a personal knowledge workspace. respond entirely in lowercase, be concise and friendly. treat the following text as background context for the user's question:\n\n${context}`;

  try {
  const base = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
  const res = await fetch(`${base.replace(/\/$/, '')}/api/generate`, {
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
  console.error('AI Service Error:', err);
  return "sorry, i couldn't reach the ai right now. is ollama running?";
  }
}
