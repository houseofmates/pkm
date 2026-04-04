
/**
 * storage-manager - centralized localStorage access with optional encryption
 *
 * provides a single API layer that wraps safeStorage (sanitization warnings) and
 * adds aes-gcm encryption via the web crypto api so that values stored for
 * sensitive keys aren't plainly visible in the clear.
 *
 * usage examples:
 *
 *   import { storageManager } from '@/lib/storage-manager';
 *
 *   // plain usage
 *   const token = storageManager.getItem('nocobase_token');
 *   storageManager.setItem('pk_api_key', apiKey);
 *
 *   // encrypted usage:
 *   storageManager.setEncryptedItem('hom_api_key', homKey);
 *   const homKey = storageManager.getEncryptedItem('hom_api_key');
 */

import { safeStorage } from './sanitize-utils';

// derive a stable aes-gcm key from the browser's origin so each install gets
// its own key without requiring a user-supplied passphrase.
async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const material = encoder.encode(`pkm-storage-key-${window.location.origin}`);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    material,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  // use a fixed salt for deterministic derivation (obfuscation, not auth)
  const salt = encoder.encode('pkm-salt-v1');
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// pack iv + ciphertext into a single base64 string for storage
async function encrypt(str: string): Promise<string> {
  try {
    const key = await deriveKey();
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
  } catch {
    return str;
  }
}

async function decrypt(encStr: string): Promise<string> {
  try {
    const key = await deriveKey();
    const packed = Uint8Array.from(atob(encStr), c => c.charCodeAt(0));
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
    return encStr;
  }
}

export const storageManager = {
  getItem(key: string): string | null {
    return safeStorage.getItem(key);
  },
  setItem(key: string, value: string): void {
    safeStorage.setItem(key, value);
  },
  removeItem(key: string): void {
    safeStorage.removeItem(key);
  },
  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  },

  async setEncryptedItem(key: string, value: string): Promise<void> {
    const encoded = await encrypt(value);
    safeStorage.setItem(key, encoded);
  },

  async getEncryptedItem(key: string): Promise<string | null> {
    const enc = safeStorage.getItem(key);
    if (!enc) return null;
    return decrypt(enc);
  },
};
