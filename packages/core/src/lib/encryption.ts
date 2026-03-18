// encryption.ts
// simple AES-GCM encryption helper for client-side payload protection.
// this is intentionally minimal and avoids dependencies.

const STORAGE_KEY = 'pkm_aesgcm_key_v1'

function base64Encode(bytes: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(bin)
}

function base64Decode(str: string): ArrayBuffer {
  const bin = atob(str)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes.buffer
}

async function getCrypto(): Promise<Crypto> {
  if (typeof crypto !== 'undefined' && (crypto as any).subtle) {
    return crypto as Crypto
  }
  // Node.js support for test environments
  const nodeCrypto = (await import('crypto')).webcrypto
  return nodeCrypto as unknown as Crypto
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
  const cryptoApi = await getCrypto()
  if (stored) {
    try {
      const raw = base64Decode(stored)
      return await cryptoApi.subtle.importKey(
        'raw',
        raw,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt'],
      )
    } catch {
      // fall through and regenerate
    }
  }

  const key = await cryptoApi.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const raw = await cryptoApi.subtle.exportKey('raw', key)
  const encoded = base64Encode(raw)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, encoded)
  }
  return key
}

export async function encryptObject(value: unknown): Promise<{ iv: string; cipher: string }> {
  const key = await getOrCreateKey()
  const cryptoApi = await getCrypto()
  const iv = cryptoApi.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(value))
  const cipherBuffer = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return {
    iv: base64Encode(iv.buffer),
    cipher: base64Encode(cipherBuffer),
  }
}

export async function decryptObject<T = unknown>(payload: { iv: string; cipher: string }): Promise<T> {
  const key = await getOrCreateKey()
  const cryptoApi = await getCrypto()
  const iv = new Uint8Array(base64Decode(payload.iv))
  const cipher = base64Decode(payload.cipher)
  const decrypted = await cryptoApi.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  const text = new TextDecoder().decode(decrypted)
  return JSON.parse(text) as T
}
