/**
 * secure logger - privacy-first logging system
 * 
 * this logger ensures no sensitive data leaks to browser console unless:
 * 1. user is authenticated with valid nocobase api key
 * 2. explicitly in development mode with vite_debug=true
 * 3. privacy mode is disabled
 * 
 * for a did system with sensitive headmate data, this is critical.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  sanitized: boolean;
  authenticated: boolean;
}

const LOG_HISTORY: LogEntry[] = [];
const MAX_HISTORY = 100;

// sensitive patterns to detect and redact
const SENSITIVE_PATTERNS = [
  { pattern: /[a-zA-Z0-9_-]*token[a-zA-Z0-9_-]*["']?\s*[:=]\s*["']?[^"'\s]{10,}/gi, replacement: '[TOKEN_REDACTED]' },
  { pattern: /[a-zA-Z0-9_-]*api[_-]?key[a-zA-Z0-9_-]*["']?\s*[:=]\s*["']?[^"'\s]{8,}/gi, replacement: '[API_KEY_REDACTED]' },
  { pattern: /[a-zA-Z0-9_-]*password[a-zA-Z0-9_-]*["']?\s*[:=]\s*["']?[^"'\s]{4,}/gi, replacement: '[PASSWORD_REDACTED]' },
  { pattern: /[a-zA-Z0-9_-]*secret[a-zA-Z0-9_-]*["']?\s*[:=]\s*["']?[^"'\s]{8,}/gi, replacement: '[SECRET_REDACTED]' },
  { pattern: /[a-zA-Z0-9_-]*credential[a-zA-Z0-9_-]*["']?\s*[:=]\s*["']?[^"'\s]{8,}/gi, replacement: '[CREDENTIAL_REDACTED]' },
  { pattern: /Bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, replacement: '[JWT_REDACTED]' },
  { pattern: /[a-f0-9]{32,}/gi, replacement: '[HASH_REDACTED]' }, // MD5, SHA hashes
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, replacement: '[EMAIL_REDACTED]' }, // Emails
];

// check if user is properly authenticated
function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const token = localStorage.getItem('nocobase_token');
    const homKey = localStorage.getItem('hom_api_key');
    
    // must have a real token (not null/undefined/empty)
    const hasValidToken = token && 
      token !== 'null' && 
      token !== 'undefined' && 
      token.trim().length > 20; // JWT minimum length
    
    const hasValidHomKey = homKey && 
      homKey !== 'null' && 
      homKey !== 'undefined' && 
      homKey.trim().length > 10;
    
    return !!(hasValidToken || hasValidHomKey);
  } catch (e) {
    return false;
  }
}

// check if in development debug mode
function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  return import.meta.env.VITE_DEBUG === 'true' || 
         import.meta.env.DEV === true ||
         window.location.search.includes('debug=true');
}

// check if privacy mode is enabled
function isPrivacyModeEnabled(): boolean {
  if (typeof window === 'undefined') return true; // Default to privacy on
  try {
    const privacyMode = localStorage.getItem('pkm_privacy_mode');
    return privacyMode !== 'false'; // Default true unless explicitly disabled
  } catch (e) {
    return true;
  }
}

// sanitize message to remove sensitive data
function sanitizeMessage(message: string): string {
  let sanitized = message;
  
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  
  return sanitized;
}

// check if message contains sensitive data
function containsSensitiveData(message: string): boolean {
  const sanitized = sanitizeMessage(message);
  return sanitized !== message;
}

// store log entry in history
function storeLogEntry(entry: LogEntry): void {
  LOG_HISTORY.push(entry);
  if (LOG_HISTORY.length > MAX_HISTORY) {
    LOG_HISTORY.shift();
  }
}

// main logging function
function createLogger(level: LogLevel) {
  return function(message: string, ...args: any[]) {
    const authenticated = isAuthenticated();
    const privacyMode = isPrivacyModeEnabled();
    const debugMode = isDebugMode();
    
    // build full message
    const fullMessage = [message, ...args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return '[Object]';
        }
      }
      return String(arg);
    })].join(' ');
    
    // always sanitize
    const sanitizedMessage = sanitizeMessage(fullMessage);
    const hadSensitiveData = sanitizedMessage !== fullMessage;
    
    // create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: sanitizedMessage,
      sanitized: hadSensitiveData,
      authenticated,
    };
    
    storeLogEntry(entry);
    
    // determine if we should actually log to console
    const shouldLog = debugMode || (authenticated && !privacyMode);
    
    if (shouldLog) {
      const prefix = authenticated ? '[PKM]' : '[PKM-ANON]';
      const finalMessage = `${prefix} ${sanitizedMessage}`;
      
      switch (level) {
        case 'debug':
          console.debug(finalMessage);
          break;
        case 'info':
          console.info(finalMessage);
          break;
        case 'warn':
          console.warn(finalMessage);
          break;
        case 'error':
          console.error(finalMessage);
          break;
      }
    }
  };
}

// public api
export const secureLogger = {
  debug: createLogger('debug'),
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  
  // get log history for security dashboard
  getHistory: (): LogEntry[] => [...LOG_HISTORY],
  
  // clear log history
  clearHistory: (): void => {
    LOG_HISTORY.length = 0;
  },
  
  // check current security status
  getSecurityStatus: () => ({
    authenticated: isAuthenticated(),
    privacyMode: isPrivacyModeEnabled(),
    debugMode: isDebugMode(),
    logCount: LOG_HISTORY.length,
  }),
  
  // toggle privacy mode
  setPrivacyMode: (enabled: boolean): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('pkm_privacy_mode', String(enabled));
    } catch (e) {
      // ignore storage errors
    }
  },
};

// convenience exports
export const log = secureLogger.info;
export const logDebug = secureLogger.debug;
export const logWarn = secureLogger.warn;
export const logError = secureLogger.error;

export default secureLogger;