// ai-proxy.js — forwards ai requests from public domain to private network
// solves the problem of browsers not being able to reach private ips directly

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();

// enable cors for all origins (cloudflare proxied requests)
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['content-type', 'authorization', 'x-api-key'],
}));

// health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-proxy' });
});

// nvidia api proxy (for nvidia api key users)
const nvidiaApiProxy = createProxyMiddleware({
  target: 'https://integrate.api.nvidia.com',
  changeOrigin: true,
  pathRewrite: { '^/nvidia': '/v1' },
  onProxyReq: (proxyReq, req) => {
    // forward the authorization header
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      proxyReq.setHeader('authorization', authHeader);
    }
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      proxyReq.setHeader('authorization', `Bearer ${apiKey}`);
    }
  },
  onProxyRes: (proxyRes) => {
    proxyRes.headers['access-control-allow-origin'] = '*';
  },
  onError: (err, req, res) => {
    console.error('[ai-proxy] nvidia proxy error:', err.message);
    res.status(502).json({ error: 'nvidia api proxy error' });
  },
});

// ollama proxy (for local ollama on desktop at 192.168.4.250)
const ollamaProxy = createProxyMiddleware({
  target: 'http://192.168.4.250:11434',
  changeOrigin: true,
  pathRewrite: { '^/ollama': '' },
  onProxyRes: (proxyRes) => {
    proxyRes.headers['access-control-allow-origin'] = '*';
  },
  onError: (err, req, res) => {
    console.error('[ai-proxy] ollama proxy error:', err.message);
    res.status(502).json({ error: 'ollama not reachable. is ollama running on desktop?' });
  },
});

// route nvidia api calls
app.use('/nvidia', nvidiaApiProxy);

// route ollama api calls
app.use('/ollama', ollamaProxy);

// default route - return info
app.get('/', (req, res) => {
  res.json({
    service: 'pkm ai proxy',
    endpoints: {
      '/nvidia/*': 'proxies to nvidia api (https://integrate.api.nvidia.com/v1/*)',
      '/ollama/*': 'proxies to local ollama (http://192.168.4.250:11434/*)',
      '/health': 'health check'
    }
  });
});

const port = process.env.ai_proxy_port || 3103;
app.listen(port, () => {
  console.log(`[ai-proxy] running on port ${port}`);
  console.log(`[ai-proxy] nvidia: /nvidia/* -> https://integrate.api.nvidia.com/v1/*`);
  console.log(`[ai-proxy] ollama: /ollama/* -> http://192.168.4.250:11434/*`);
});
