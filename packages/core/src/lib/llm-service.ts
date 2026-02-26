export interface LLMRequest {
  model: string
  prompt: string
  stream?: boolean
  options?: Record<string, any>
}

export interface LLMResponse {
  response: string
  done: boolean
}

export async function generateText(prompt: string, model: string = 'qwen2.5:7b', endpoint: string): Promise<string | null> {
  try {
  const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
 'Content-Type': 'application/json'
  },
  body: JSON.stringify({
 model,
 prompt,
 stream: false
  } as LLMRequest)
  })

  if (!response.ok) {
  throw new Error(`LLM API Error: ${response.statusText}`)
  }

  const data = await response.json() as LLMResponse

  return data.response
  } catch (e) {
  secureLogger.warn("Wilson Silent Fail:", e)
  return null
  }
}
