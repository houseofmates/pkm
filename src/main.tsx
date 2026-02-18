if ("serviceWorker" in navigator) { navigator.serviceWorker.getRegistrations().then((regs) => { for (const reg of regs) reg.unregister(); }); }
import react from 'react';
import { createroot } from 'react-dom/client';
import './index.css';
import app from './app.tsx';



class errorboundary extends react.component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
 constructor(props: { children: react.reactnode }) {
  super(props);
  this.state = { haserror: false, error: null };
 }

 static getderivedstatefromerror(error: error) {
  return { haserror: true, error };
 }

 componentdidcatch() {
  // we let errorboundary handle the ui, but we can log for debugging if needed.
  // console.error("uncaught error:", error, errorinfo);
 }

 render() {
  if (this.state.haserror) {
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
 const root = createroot(document.getelementbyid('root')!);
 root.render(
  <ErrorBoundary>
 <App />
  </ErrorBoundary>,
 );
} catch (e) {
 console.error("root render failed:", e);
 document.body.innerhtml = "<h1>root render failed</h1>";
}
