if ("serviceWorker" in navigator) { navigator.serviceWorker.getRegistrations().then((regs) => { for (let reg of regs) reg.unregister(); }); }
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';



class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // We let ErrorBoundary handle the UI, but we can log for debugging if needed.
    // console.error("Uncaught error:", error, errorInfo);
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

try {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
} catch (e) {
  console.error("Root Render Failed:", e);
  document.body.innerHTML = "<h1>root render failed</h1>";
}
