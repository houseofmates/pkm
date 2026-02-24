# RAG Integration Implementation for PKM

## Section 1: NocoBase AI Knowledge Base Setup
- [ ] Configure Ollama LLM service in NocoBase admin
- [ ] Create global knowledge base for all collections
- [ ] Set up vector database connection
- [ ] Configure chunking parameters (size: 512, overlap: 128)
- [ ] Index all existing collections (notes, tasks, projects, research, dupemates)

## Section 2: Wilson RAG Chat Enhancement
- [ ] Create `src/services/rag-service.ts` - semantic search across PKM
- [ ] Create `src/lib/vector-store.ts` - vector database client
- [ ] Update `src/stores/llm-store.ts` - integrate RAG retrieval before chat
- [ ] Create `src/lib/rag-prompts.ts` - specialized prompts for knowledge work
- [ ] Test Wilson chat with RAG context injection

## Section 3: AI Property + Generator Action
- [ ] Create `src/services/ai-field-generator.ts` - row context + RAG + generation
- [ ] Create `src/components/ai-field-button.tsx` - reusable action button
- [ ] Create `src/hooks/use-ai-generation.ts` - hook for AI field operations
- [ ] Add system prompt template for markdown generation
- [ ] Create workflow documentation for NocoBase custom action

## Section 4: Testing & Optimization
- [ ] Test retrieval quality with sample queries
- [ ] Tune chunk size and overlap for markdown content
- [ ] Optimize prompts for knowledge work vs chat
- [ ] Test cross-collection references

## Section 5: Bonus Features
- [ ] Auto-suggest on new row creation
- [ ] Scheduled generation for stale content
- [ ] Dupemates integration hooks

## Files to Create/Modify:
1. `src/services/rag-service.ts` (new)
2. `src/lib/vector-store.ts` (new)
3. `src/lib/rag-prompts.ts` (new)
4. `src/services/ai-field-generator.ts` (new)
5. `src/components/ai-field-button.tsx` (new)
6. `src/hooks/use-ai-generation.ts` (new)
7. `src/stores/llm-store.ts` (modify - add RAG)
8. `NOCOBASE_SETUP.md` (new - admin instructions)
