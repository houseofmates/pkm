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
    // include component stack for easier debugging of hook errors or other render problems
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
          {this.state.error && (
            <pre style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#ccc' }}>
              {String((this.state.error as any).componentStack || '')}
            </pre>
          )}
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

// pre-populate token for mobile builds
if (typeof window !== 'undefined' && typeof (window as any).Capacitor !== 'undefined') {
  const builtInToken = import.meta.env.VITE_NOCOBASE_API_TOKEN;
  if (builtInToken && !storageManager.getItem('nocobase_token')) {
    secureLogger.info('[mobile] pre-populating nocobase_token from build env');
    storageManager.setItem('nocobase_token', builtInToken);
  }
}

const container = document.getElementById('root');
if (container) {
  try {
    const root = createRoot(container);
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
