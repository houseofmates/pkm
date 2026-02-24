
/**
 * storage-manager - centralized localStorage access with optional encryption
 *
 * provides a single API layer that wraps safeStorage (sanitization warnings) and
 * adds a very lightweight reversible "encryption" so that values stored for
 * sensitive keys aren't plainly visible in the clear.  This is not intended to
 * be bulletproof crypto but it gives an additional layer for shoulder‑surfing
 * protection and can be upgraded later to use WebCrypto/OS keychain.
 *
 * Usage examples:
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

// ``encryption`` helpers - trivial XOR+base64 scheme.  Replace with real crypto
// if/when stronger protection is required.
function simpleEncode(str: string): string {
  try {
    const xored = Array.from(str).
      map(c => String.fromCharCode(c.charCodeAt(0) ^ 0xAA)).
      join('');
    return btoa(xored);
  } catch {
    return str;
  }
}

function simpleDecode(str: string): string {
  try {
    const decoded = atob(str);
    return Array.from(decoded).
      map(c => String.fromCharCode(c.charCodeAt(0) ^ 0xAA)).
      join('');
  } catch {
    return str;
  }
}

export const storageManager = {
  /** direct, unopinionated access to localStorage */
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore quota errors
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  },

  /**
   * store a value after applying a lightweight reversible transformation.
   * callers should treat it as encrypted but it's only obfuscated.
   */
  setEncryptedItem(key: string, value: string): void {
    const encoded = simpleEncode(value);
    safeStorage.setItem(key, encoded);
  },

  /**
   * retrieve a value previously stored via setEncryptedItem.
   */
  getEncryptedItem(key: string): string | null {
    const enc = safeStorage.getItem(key);
    if (!enc) return null;
    return simpleDecode(enc);
  },
};

