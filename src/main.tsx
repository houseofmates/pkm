
import { createRoot } from 'react-dom/client'
import React from 'react'

console.log("Minimal Main executing...");

try {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <div style={{ color: 'red', fontSize: '2em', padding: '20px' }}>
      <h1>SYSTEM CHECK</h1>
      <p>If you see this, React is working. The issue is in the App components.</p>
    </div>
  );
} catch (e) {
  console.error("Critical Render Error:", e);
  document.body.innerHTML = `<h1 style="color:red">CRITICAL FAILURE: ${e}</h1>`;
}
