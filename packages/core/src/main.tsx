// Import global error handlers first to catch WebSocket/HMR errors during app startup
import '@/lib/error-handlers';

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    secureLogger.error("uncaught error:", error, errorInfo);
    if (errorInfo && errorInfo.componentStack) {
      secureLogger.error("component stack:", errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', fontFamily: 'monospace', zIndex: 9999, position: 'relative' }}>
          <h1>something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

if ("serviceWorker" in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    }).catch(e => {
      secureLogger.warn("Failed to get service worker registrations (promise rejection):", e);
    });
  } catch (e) {
    secureLogger.warn("Service worker access not allowed or invalid state:", e);
  }
}

// initialize app and mount to dom
async function init() {
  // pre-populate token for mobile builds
  if (typeof window !== 'undefined' && typeof (window as any).Capacitor !== 'undefined') {
    const builtInToken = import.meta.env.VITE_NOCOBASE_API_TOKEN;
    if (builtInToken && !storageManager.getItem('nocobase_token')) {
      secureLogger.info('[mobile] pre-populating nocobase_token from build env');
      await storageManager.setEncryptedItem('nocobase_token', builtInToken);
    }
  }

  // pre-load encrypted secrets into cache for synchronous use (e.g. logger)
  await Promise.all([
    storageManager.getEncryptedItem('nocobase_token'),
    storageManager.getEncryptedItem('hom_api_key'),
    storageManager.getEncryptedItem('pk_api_key'),
    storageManager.getEncryptedItem('hom_guest_key'),
  ]);

  const container = document.getElementById('root');
  if (container) {
    try {
      const root = createRoot(container);
      (window as any).__APP_MOUNTED__ = true;
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      );
    } catch (e) {
      secureLogger.error("root render failed:", e);
      document.body.innerHTML = "<h1>root render failed</h1>";
    }
  }
}

init().catch(err => {
  secureLogger.error("Initialization failed:", err);
});
