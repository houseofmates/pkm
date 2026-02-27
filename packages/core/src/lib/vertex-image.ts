import { secureLogger } from '@/lib/secure-logger';

const TARGET_BG = '#050505';
const ICON_SIZE = 512;
const MODEL = 'imagegeneration@005'; // Google Vertex AI (Imagen/Imagen-3 Nano Banana Pro)
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateImage`;

function buildPrompt(userPrompt: string): string {
  return [
    'Create a crisp, flat vector-style icon centered in frame.',
    'Solid background must be hex #050505 with zero artifacts; if transparency is used, the shape should have clean edges.',
    'High contrast, no gradients, no text, no borders.',
    `Aspect ratio 1:1 at ${ICON_SIZE}x${ICON_SIZE}.`,
    `User prompt: ${userPrompt}`,
  ].join(' ');
}

async function addBackgroundLayer(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = ICON_SIZE;
      canvas.height = ICON_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas unavailable'));
      ctx.fillStyle = TARGET_BG;
      ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
      const scale = Math.min(ICON_SIZE / img.width, ICON_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (ICON_SIZE - w) / 2;
      const y = (ICON_SIZE - h) / 2;
      ctx.drawImage(img, x, y, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('failed to process image'));
    img.src = dataUrl;
  });
}

export async function generateVertexIcon(userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_VERTEX_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_VERTEX_API_KEY');

  const prompt = buildPrompt(userPrompt);

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // API accepts prompt.text for image generation
      prompt: { text: prompt },
      // request transparent preferred so we can overlay our bg
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/png',
        safetyFilterLevel: 'block_low_and_above',
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`vertex generate failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const base64 = data?.images?.[0]?.base64 || data?.candidates?.[0]?.image?.base64;
  if (!base64) throw new Error('vertex returned no image');

  const dataUrl = `data:image/png;base64,${base64}`;

  try {
    return await addBackgroundLayer(dataUrl);
  } catch (err) {
    secureLogger.warn('failed to enforce background, returning raw image', err);
    return dataUrl;
  }
}
