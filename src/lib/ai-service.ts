export interface AIResponse {
  response: string;
  done: boolean;
}

export async function generateResponse(context: string, prompt: string, model: string = 'qwen2.5:7b'): Promise<string> {
  const systemPrompt = `You are a helpful assistant. Answer in all lowercase. Use a casual, humanized tone. You have access to the following context from the user's document:\n\n${context}`;

  try {
  const res = await fetch('http://192.168.4.232:11434/api/generate', {
  method: 'POST',
  headers: {
 'Content-Type': 'application/json',
  },
  body: JSON.stringify({
 model: model,
 prompt: `${systemPrompt}\n\nUser Question: ${prompt}`,
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
