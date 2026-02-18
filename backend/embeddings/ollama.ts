import fetch from 'node-fetch';

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const body = { input: text.toLowerCase() };
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`ollama embeddings error: ${res.status}`);
    const json = await res.json();
    // expect {embedding: number[]} or {data:[{embedding:[]}]}
    if (Array.isArray(json?.data) && json.data[0]?.embedding) return json.data[0].embedding as number[];
    if (Array.isArray(json?.embedding)) return json.embedding as number[];
    throw new Error('invalid embedding response');
  } catch (err) {
    console.error('getEmbedding error', err);
    throw err;
  }
}

export default getEmbedding;
