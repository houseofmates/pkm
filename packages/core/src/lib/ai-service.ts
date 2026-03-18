import { getOllamaGenerateUrl, DEFAULT_GEMINI_MODEL } from '@/lib/llm-config';
import { secureLogger } from './secure-logger';
import { generateText } from './llm-service';

export interface AIResponse {
  response: string;
  done: boolean;
}

export async function generateResponse(context: string, prompt: string, model: string = DEFAULT_GEMINI_MODEL): Promise<string> {
    const systemPrompt = `you are wilson, a thoughtful assistant for a personal knowledge workspace. respond entirely in lowercase, be concise and friendly. treat the following text as background context for the user's question:\n\n${context}`;

  try {
    const url = getOllamaGenerateUrl();
    const response = await generateText(
      `${systemPrompt}\n\nuser question: ${prompt}`,
      model,
      url,
    );

    return response || '';
  } catch (err) {
    secureLogger.error('AI Service Error:', err);
    return "sorry, i couldn't reach the ai right now. is the gemini api key set?";
  }
}
