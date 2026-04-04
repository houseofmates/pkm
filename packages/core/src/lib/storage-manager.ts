/**
 * storage-manager - centralized localStorage access with optional encryption
 *
 * provides a single API layer that wraps safeStorage (sanitization warnings) and
 * adds aes-gcm encryption via the web crypto api so that values stored for
 * sensitive keys aren't plainly visible in the clear.
 */

import { safeStorage } from './sanitize-utils';

let cachedKey: CryptoKey | null = null;

// derive a stable aes-gcm key from the browser's origin
async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const encoder = new TextEncoder();
  const material = encoder.encode(`pkm-storage-key-${window.location.origin}`);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    material,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = encoder.encode('pkm-salt-v1');
  cachedKey = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedKey;
}

// pack iv + ciphertext into a single base64 string for storage
async function encrypt(str: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(str)
    );
    // pack: iv (12 bytes) + ciphertext
    const packed = new Uint8Array(iv.length + encrypted.byteLength);
    packed.set(iv);
    packed.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...packed));
  } catch (err) {
    console.error('[storage-manager] encryption failed:', err);
    return str;
  }
}

async function decrypt(encStr: string): Promise<string> {
  try {
    // fast check if it's even worth trying to decrypt
    // base64 encoded packed data should at least be longer than IV (12 bytes)
    if (!encStr || encStr.length < 16) return encStr;

    const key = await getEncryptionKey();
    let packed: Uint8Array;
    try {
      packed = Uint8Array.from(atob(encStr), c => c.charCodeAt(0));
    } catch {
      return encStr; // not valid base64
    }

    if (packed.length < 13) return encStr;
    const iv = packed.slice(0, 12);
    const data = packed.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // if decryption fails (e.g. it was stored as plain text), return as is
    return encStr;
  }
}

// in-memory cache for decrypted secrets to avoid repeated async calls
const secretCache: Record<string, string | null> = {};

export const storageManager = {
  getItem(key: string): string | null {
    return safeStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    safeStorage.setItem(key, value);
    // if this key was in secret cache, update it (though setItem shouldn't really be used for secrets anymore)
    if (key in secretCache) {
      secretCache[key] = value;
    }
  },
  removeItem(key: string): void {
    safeStorage.removeItem(key);
    delete secretCache[key];
  },
  clear(): void {
    try {
      localStorage.clear();
      // clear secret cache
      for (const key in secretCache) delete secretCache[key];
    } catch {
      // ignore
    }
  },

  /**
   * stores a value encrypted in localStorage
   */
  async setEncryptedItem(key: string, value: string): Promise<void> {
    secretCache[key] = value;
    const encoded = await encrypt(value);
    safeStorage.setItem(key, encoded);
  },

  /**
   * retrieves and decrypts a value from localStorage.
   * uses an in-memory cache for performance.
   */
  async getEncryptedItem(key: string): Promise<string | null> {
    if (key in secretCache) return secretCache[key];

    const enc = safeStorage.getItem(key);
    if (!enc) {
      secretCache[key] = null;
      return null;
    }

    const decrypted = await decrypt(enc);
    secretCache[key] = decrypted;
    return decrypted;
  },

  /**
   * synchronous version that only works if the item was already loaded
   * into cache via getEncryptedItem or setEncryptedItem.
   */
  getCachedSecret(key: string): string | null {
    return secretCache[key] || null;
  }
};
