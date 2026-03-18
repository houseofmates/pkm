// Gemini image & text generation + background removal via rembg Gradio API.
// api key is stored in localStorage (no env var required).

export const API_KEY_STORAGE_KEY = 'gemini_api_key';

const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';   // "nano banana pro"
const GEMINI_TEXT_MODEL  = 'gemini-3.1-pro-preview';       // for prompt enhancement
const REMBG_API_URL      = 'https://rembg.houseofmates.space';
const TARGET_BG          = '#050505';
const ICON_SIZE          = 512;

// ── api key helpers ──────────────────────────────────────────────────────────

export function getGeminiApiKey(): string | null {
  try { return localStorage.getItem(API_KEY_STORAGE_KEY); } catch { return null; }
}

export function saveGeminiApiKey(key: string): void {
  try { localStorage.setItem(API_KEY_STORAGE_KEY, key.trim()); } catch { /* ignore */ }
}

// ── prompt builder ───────────────────────────────────────────────────────────

export function buildIconPrompt(userPrompt: string): string {
  return [
    userPrompt.trim(),
    `The background must be solid ${TARGET_BG} with no transparency or gradients.`,
    'Crisp flat vector-style icon, perfectly centered, high contrast, no text, no borders, no drop shadows.',
    `Square 1:1 aspect ratio, ${ICON_SIZE}x${ICON_SIZE}px.`,
  ].join(' ');
}

// ── image generation ─────────────────────────────────────────────────────────

export async function generateGeminiIcon(userPrompt: string, apiKey: string): Promise<string> {
  const prompt = buildIconPrompt(userPrompt);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`image generation failed (${res.status}): ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  if (!imagePart) throw new Error('gemini returned no image — check your api key and model access');

  const { mimeType, data: base64 } = imagePart.inlineData;
  return `data:${mimeType ?? 'image/png'};base64,${base64}`;
}

export async function generateVerticalThumbnail(userPrompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`image generation failed (${res.status}): ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);
  if (!imagePart) throw new Error('gemini returned no image — check your api key and model access');

  const { mimeType, data: base64 } = imagePart.inlineData;
  return `data:${mimeType ?? 'image/jpeg'};base64,${base64}`;
}

// ── prompt enhancement ───────────────────────────────────────────────────────

export async function enhancePromptWithGemini(userPrompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a concise prompt engineer for AI-generated icons. Rewrite the prompt to be more specific, vivid, and icon-appropriate. Begin with the subject. Keep it under 30 words. Output only the rewritten prompt.\n\nPrompt: ${userPrompt}`,
        }],
      }],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`prompt enhancement failed (${res.status}): ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) throw new Error('no enhanced prompt returned');
  return text.trim();
}

// ── background removal via rembg Gradio API ──────────────────────────────────

export async function removeBackground(dataUrl: string): Promise<string> {
  // 1. upload image to the Gradio server
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append('files', blob, 'icon.png');

  const uploadRes = await fetch(`${REMBG_API_URL}/upload`, { method: 'POST', body: form });
  if (!uploadRes.ok) throw new Error(`rembg upload failed (${uploadRes.status})`);

  const uploadedPaths: string[] = await uploadRes.json();
  const uploadedPath = uploadedPaths[0];

  // 2. call /inference
  const callRes = await fetch(`${REMBG_API_URL}/call/inference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { path: uploadedPath, orig_name: 'icon.png', mime_type: 'image/png', size: blob.size, is_stream: false, meta: { _type: 'gradio.FileData' } },
        'bria-rmbg',
        true,   // alpha matting
        240,    // fg threshold
        10,     // bg threshold
        40,     // erosion size
        false,  // only mask
        true,   // post process mask
        '',     // arguments
      ],
    }),
  });
  if (!callRes.ok) throw new Error(`rembg inference call failed (${callRes.status})`);

  const { event_id } = await callRes.json();

  // 3. poll SSE result
  const resultRes = await fetch(`${REMBG_API_URL}/call/inference/${event_id}`);
  if (!resultRes.ok) throw new Error(`rembg result fetch failed (${resultRes.status})`);

  const sseText = await resultRes.text();
  let resultFileData: any = null;
  for (const line of sseText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        if (Array.isArray(parsed) && parsed.length > 0) resultFileData = parsed[0];
      } catch { /* not valid JSON */ }
    }
  }
  if (!resultFileData) throw new Error('no output received from rembg');

  const rawUrl: string = resultFileData?.url ?? resultFileData?.path ?? '';
  if (!rawUrl) throw new Error('rembg returned no file url');

  const absoluteUrl = rawUrl.startsWith('http') ? rawUrl : `${REMBG_API_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
  const imgBlob = await (await fetch(absoluteUrl)).blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('failed to read rembg result'));
    reader.readAsDataURL(imgBlob);
  });
}

// ── legacy shim ──────────────────────────────────────────────────────────────

/** @deprecated use generateGeminiIcon directly */
export async function generateVertexIcon(userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey() ?? (import.meta.env?.VITE_VERTEX_API_KEY as string | undefined);
  if (!apiKey) throw new Error('no api key – click the ai icon button to add one');
  return generateGeminiIcon(userPrompt, apiKey);
}
