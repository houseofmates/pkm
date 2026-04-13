# pkm backend

This lightweight backend starts a small express server to handle:

- `/sync-webhook` - accept nocobase record(s), generate embeddings via ollama, and upsert into lancedb
- `/search` - run semantic search against lancedb

Requirements:

- node >= 18
- install `lancedb` and `node-fetch` and `express` and `cors` if not present
- run local ollama embeddings endpoint at `http://localhost:11434` (or adapt `embeddings/ollama.ts`)

Run (from repo root):

```bash
cd backend
node dist/server.js # or run with ts-node during development
```
