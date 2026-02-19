/**
 * data sanitization utilities
 * 
 * functions to safely handle sensitive data without exposing it
 * to browser console, network logs, or localstorage.
 */

// characters to use for masking
const MASK_CHAR = '•';

/**
 * mask a string, showing only first and last n characters
 */
export function maskString(str: string, visibleFirst = 4, visibleLast = 4): string {
  if (!str || str.length <= visibleFirst + visibleLast) {
    return MASK_CHAR.repeat(str?.length || 0);
  }
  
  const first = str.slice(0, visibleFirst);
  const last = str.slice(-visibleLast);
  const middleLength = str.length - visibleFirst - visibleLast;
  
  return `${first}${MASK_CHAR.repeat(middleLength)}${last}`;
}

/**
 * completely Redact a sensitive value
 */
export function redact(value: string | null | undefined): string {
  if (!value) return '[EMPTY]';
  return `[REDACTED:${value.length}chars]`;
}

/**
 * sanitize an object by redacting sensitive fields
 */
export function sanitizeObject(
  obj: Record<string, any>,
  sensitiveFields: string[] = ['token', 'apiKey', 'password', 'secret', 'credential', 'key', 'auth']
): Record<string, any> {
  const sanitized: Record<string, any> = { ...obj };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    );
    
    if (isSensitive && typeof sanitized[key] === 'string') {
      sanitized[key] = Redact(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = SanitizeObject(sanitized[key], sensitiveFields);
    }
  }
  
  return sanitized;
}

/**
 * safe json stringify that redacts sensitive data
 */
export function safeStringify(obj: any, space?: number): string {
  const sanitized = SanitizeObject(obj);
  return JSON.stringify(sanitized, null, space);
}

/**
 * extract public-safe error message (no internal details)
 */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // remove file paths, stack traces, internal details
    return error.message
      .replace(/\/[\w\/\.-]+/g, '[PATH]') // File paths
      .replace(/at\s+[\w\s\.]+/g, '[STACK]') // Stack traces
      .replace(/localhost:\d+/g, '[LOCAL]') // Local addresses
      .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]'); // IP addresses
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'an error occurred';
}

/**
 * create a safe version of headers for logging
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitive = ['authorization', 'x-api-key', 'x-token', 'cookie', 'x-hom-api-key'];
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.some(s => lowerKey.includes(s))) {
      sanitized[key] = Redact(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * check if a value looks like an api key/token
 */
export function looksLikeSecret(value: string): boolean {
  if (!value || value.length < 8) return false;
  
  const patterns = [
    /^[a-zA-Z0-9_-]{20,}$/, // JWT or long token
    /^[a-f0-9]{32,}$/i, // Hex hash
    /^(sk-|pk-|bearer|token)/i, // Common prefixes
    /^[A-Za-z0-9+/]{40,}={0,2}$/, // Base64
  ];
  
  return patterns.some(p => p.test(value));
}

/**
 * safe localstorage wrapper that warns about sensitive data
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  
  setItem(key: string, value: string): void {
    // warn if trying to store sensitive data
    if (LooksLikeSecret(value) && !key.toLowerCase().includes('token') && !key.toLowerCase().includes('key')) {
      console.warn(`[SECURITY] Potentially sensitive data being stored in localStorage key: ${key}`);
    }
    
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // ignore quota errors
    }
  },
  
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },
  
  // clear all auth-related items
  clearAuth(): void {
    const authKeys = [
      'nocobase_token',
      'hom_api_key',
      'hom_guest_key',
      'pk_api_key',
      'nocobase_api_key',
    ];
    
    for (const key of authKeys) {
      this.removeItem(key);
    }
  },
};

/**
 * create a safe url for logging (remove query params that might contain secrets)
 */
export function safeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // remove potentially sensitive query params
    const sensitiveParams = ['token', 'api_key', 'key', 'secret', 'password', 'auth'];
    for (const param of sensitiveParams) {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '[REDACTED]');
      }
    }
    
    return urlObj.toString();
  } catch {
    return '[INVALID_URL]';
  }
}