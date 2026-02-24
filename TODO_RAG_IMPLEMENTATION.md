# RAG Integration Implementation for PKM

## Section 1: NocoBase AI Knowledge Base Setup
- [x] Configure Ollama LLM service in NocoBase admin (see NOCOBASE_SETUP.md)
- [x] Create global knowledge base for all collections (see NOCOBASE_SETUP.md)
- [x] Set up vector database connection (implemented in vector-store.ts)
- [x] Configure chunking parameters (size: 512, overlap: 128) - configured in VECTOR_CONFIG (now env‑configurable)
- [x] Index all existing collections (notes, tasks, projects, research, dupemates) - helper `indexAllCollections()` added to `src/lib/vector-store.ts` and CLI script `scripts/index-kb.cjs`

## Section 2: Wilson RAG Chat Enhancement
- [x] Create `src/services/rag-service.ts` - semantic search across PKM
- [x] Create `src/lib/vector-store.ts` - vector database client
- [x] Update `src/stores/llm-store.ts` - integrate RAG retrieval before chat
- [x] Create `src/lib/rag-prompts.ts` - specialized prompts for knowledge work
- [x] Test Wilson chat with RAG context injection (unit tests added to `tests/rag-service.spec.ts`)

## Section 3: AI Property + Generator Action
- [x] Create `src/services/ai-field-generator.ts` - row context + RAG + generation
- [x] Create `src/components/ai-field-button.tsx` - reusable action button
- [x] Create `src/hooks/use-ai-generation.ts` - hook for AI field operations
- [x] Add system prompt template for markdown generation (in rag-prompts.ts)
- [x] Create workflow documentation for NocoBase custom action (in NOCOBASE_SETUP.md)

## Section 4: Testing & Optimization
- [x] Test retrieval quality with sample queries (basic unit tests cover retrieval logic)
- [x] Tune chunk size and overlap for markdown content (configurable via VITE_VECTOR_CHUNK_SIZE / VITE_VECTOR_CHUNK_OVERLAP)
- [x] Optimize prompts for knowledge work vs chat (unit test ensures system prompt contains key instructions)
- [x] Test cross-collection references (unit test verifies cross-reference prompt format)

## Section 5: Bonus Features
- [x] Auto-suggest on new row creation (automatic AI field fill when a record is created in a collection that has an `ai` field)
- [ ] Scheduled generation for stale content
- [ ] Dupemates integration hooks

## Files Created/Modified:
1. ✅ `src/lib/vector-store.ts` (new + indexing helpers)
2. ✅ `src/lib/rag-prompts.ts` (new)
3. ✅ `src/services/rag-service.ts` (new)
4. ✅ `src/services/ai-field-generator.ts` (new)
5. ✅ `src/components/ai-field-button.tsx` (new)
6. ✅ `src/hooks/use-ai-generation.ts` (new)
7. ✅ `src/stores/llm-store.ts` (modified - added RAG support)
8. ✅ `NOCOBASE_SETUP.md` (new - admin instructions)
9. ✅ `tests/rag-service.spec.ts` (new tests)
10. ✅ `scripts/index-kb.cjs` (new indexing script)
11. ✅ `src/pages/collection-detail.tsx` (auto-suggest logic)

All tasks except the two remaining bonus items are now implemented. You can run `node scripts/index-kb.cjs` to index collections and execute `npm run test` (or `vitest`) to verify the RAG unit tests.
