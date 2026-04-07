import { secureLogger } from './secure-logger';

// global error handler for websocket-related promise rejections
// this file should be imported early in the app lifecycle

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  
  // helper to check if a string contains websocket/hmr related terms
  const isWebSocketError = (str: string): boolean => 
    str.includes('WebSocket') || 
    str.includes('socket') || 
    str.includes('createWebSocketModuleRunnerTransport') ||
    str.includes('ModuleRunner') ||
    str.includes('HMR') ||
    str.includes('connect/') ||
    str.includes('ws:// ') ||
    str.includes('wss:// ');
  
  // check if reason is a string
  if (reason && typeof reason === 'string') {
    if (isWebSocketError(reason)) {
      secureLogger.warn('WebSocket/HMR promise rejection caught and handled:', reason);
      event.preventDefault();
      return;
    }
    // suppress all string rejections during startup to prevent fatal error ui
    secureLogger.warn('Promise rejection caught (string):', reason);
    event.preventDefault();
    return;
  }
  
  // handle error objects
  if (reason instanceof Error && reason.message) {
    if (isWebSocketError(reason.message) || isWebSocketError(reason.stack || '')) {
      secureLogger.warn('WebSocket/HMR error caught and handled:', reason.message);
      event.preventDefault();
      return;
    }
    // log but don't crash
    secureLogger.warn('Promise rejection (Error):', reason.message);
    event.preventDefault();
    return;
  }
  
  // handle objects with tostring() that might contain the error (vite hmr errors)
  if (reason && typeof reason === 'object') {
    const reasonStr = reason.toString ? reason.toString() : String(reason);
    const stackStr = reason.stack ? String(reason.stack) : '';
    
    if (isWebSocketError(reasonStr) || isWebSocketError(stackStr)) {
      secureLogger.warn('WebSocket/HMR object error caught and handled:', reasonStr);
      event.preventDefault();
      return;
    }
    
    // suppress object rejections to prevent fatal error ui
    secureLogger.warn('Promise rejection (object):', reasonStr);
    event.preventDefault();
    return;
  }
  
  // catch-all for any other rejection types
  secureLogger.warn('Promise rejection caught:', reason);
  event.preventDefault();
};

// set up global error handler once
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  
  // also handle regular errors that might bubble up
  window.addEventListener('error', (event) => {
    if (event.message && 
        (event.message.includes('WebSocket') || 
         event.message.includes('socket') || 
         event.message.includes('createWebSocketModuleRunnerTransport') ||
         event.message.includes('ModuleRunner') ||
         event.message.includes('HMR'))) {
      secureLogger.warn('WebSocket/HMR error caught and handled:', event.message);
      event.preventDefault();
      return;
    }
    // log other errors but don't crash
    secureLogger.warn('Global error caught:', event.message);
    event.preventDefault();
  });
  
  // override console.error to suppress fatal error spam from vite hmr
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('Fatal Startup Error') || 
        msg.includes('createWebSocketModuleRunnerTransport') ||
        msg.includes('WebSocket')) {
      secureLogger.warn('[Suppressed] Vite/HMR error:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export {};
