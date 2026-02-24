# NocoBase AI Knowledge Base Setup Guide

## Section 1: Setup (Custom RAG Implementation - No Plugins Required)

**⚠️ Note:** The official NocoBase AI Knowledge Base plugins (`@nocobase/plugin-ai`, `@nocobase/plugin-ai-knowledge-base`) are **not available** in the plugin manager. This guide uses a **custom RAG implementation** that works with standard NocoBase v2 and requires no special plugins.

The custom implementation:
- ✅ Works with Docker Compose setups
- ✅ Uses your existing Ollama setup
- ✅ Searches collections directly via NocoBase API
- ✅ Requires zero plugin installation

---

### 1.1 Verify Your Setup

**You need:**
1. NocoBase v2 running (Docker or native)
2. Ollama running with `qwen2.5:7b` (you already have this)
3. Collections with data (notes, tasks, projects, etc.)

**Check Ollama is accessible from your PKM frontend:**
```javascript
// In browser console
fetch('http://localhost:11434/api/tags')
  .then(r => r.json())
  .then(d => console.log('Ollama models:', d))
```

If this fails, your Docker network may need configuration to access Ollama.

---

### 1.2 For Docker Compose Users

If NocoBase is in Docker and Ollama is on the host:

**Option A: Use host.docker.internal**
```yaml
# In your docker-compose.yml, add to nocobase service:
environment:
  - OLLAMA_HOST=http://host.docker.internal:11434
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**Option B: Use Ollama Docker container**
```yaml
# Add to docker-compose.yml
services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
  
  nocobase:
    # ... your existing config
    environment:
      - OLLAMA_HOST=http://ollama:11434
```

**Option C: Keep Ollama on host, expose to Docker**
```bash
# On Linux, Ollama binds to 127.0.0.1 by default
# Change to bind to all interfaces:
sudo systemctl edit ollama
# Add:
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
# Then reload:
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

---

### 1.3 Add "ai" Field to Your Collections

**Via NocoBase Admin:**
1. Go to **Collection Manager** (in admin sidebar)
2. Select a collection (e.g., `notes`)
3. Click **"Add Field"**
4. Configure:
   - Field Name: `ai`
   - Display Name: `AI Synthesis` (or whatever you want)
   - Type: `Text (Long)`
   - Interface: `Markdown` (or `Rich Text` if available)
5. Save

**Repeat for each collection you want AI fields on:**
- `notes`
- `tasks`
- `projects`
- `research`
- `dupemates`
- Any other collection

---

### 1.4 Configure Wilson (Optional)

If you want to use the existing Wilson chat with enhanced prompts, update the system prompt in `src/stores/llm-store.ts`:

The code already includes RAG retrieval - it will automatically search your collections before responding.

**To customize Wilson's personality**, edit:
```typescript
// In src/stores/llm-store.ts, find the systemPrompt
const systemPrompt = `you are wilson...`
```

---

## How the Custom RAG Works

The custom RAG implementation (`src/services/rag-service.ts`) works by:

1. **Querying your collections directly** via NocoBase API
2. **Chunking text intelligently** (512 chars with 128 overlap)
3. **Scoring by relevance** (keyword match + recency)
4. **Formatting for prompts** with source citations

**No vector database required** - it uses your existing NocoBase data.

---

## Section 2: Using Wilson Chat with RAG


### 2.1 Wilson Chat Now Has RAG (Automatic)

The updated `src/stores/llm-store.ts` automatically retrieves context before responding:

```typescript
import { useLLMStore } from '@/stores/llm-store';

const { askWilson, useRag, toggleRag } = useLLMStore();

// RAG is ON by default - Wilson will search your PKM
await askWilson('what are my current priorities?');

// Toggle off if you want vanilla responses
toggleRag();
```

**What happens:**
1. User sends message
2. System searches notes, tasks, projects, etc. for relevant content
3. Top 8 chunks injected into prompt with citations
4. Wilson responds with context-aware answer

**Example response:**
> "based on [source: notes:123] your project roadmap and [source: tasks:456] your current task list, your priorities are..."

### 2.2 Direct RAG Service Usage

Use the RAG service directly for custom implementations:

```typescript
import { buildRagContext, generateWilsonRagPrompt } from '@/services/rag-service';

// Build context for any query
const context = await buildRagContext('project deadlines', 5);
console.log(context.retrievedChunks); // Array of relevant chunks
console.log(context.sources); // ['notes:123', 'tasks:456']

// Generate a prompt with context
const prompt = await generateWilsonRagPrompt(
  'what should i focus on?',
  'friend'
);
// Returns full prompt with retrieved context injected
```

## Section 3: AI Property + Generator Action

### 3.1 Add "ai" Field to Collections

**Via NocoBase Admin:**
1. Go to Collection Manager
2. Select a collection (e.g., `notes`)
3. Click "Add Field"
4. Configure:
   - Field Name: `ai`
   - Display Name: `AI Synthesis`
   - Type: `Text (Long)`
   - Interface: `Markdown`
   - UI Schema:
```json
{
  "x-component": "Markdown",
  "x-component-props": {
    "placeholder": "AI-generated content will appear here..."
  }
}
```

**Via Code (using the service):**
```typescript
import { ensureAiField } from '@/services/ai-field-generator';

// Ensure field exists
await ensureAiField('notes', 'ai');
await ensureAiField('tasks', 'ai');
await ensureAiField('projects', 'ai');
```

### 3.2 Using the AI Field Button Component

**In your record detail view:**
```typescript
import { AiFieldButton } from '@/components/ai-field-button';

function NoteDetail({ record }) {
  return (
    <div>
      <h1>{record.title}</h1>
      <div>{record.content}</div>
      
      <AiFieldButton
        collection="notes"
        recordId={record.id}
        fieldName="ai"
        existingContent={record.ai}
        onGenerated={(content) => {
          console.log('AI content generated:', content);
          // Refresh record to show new content
        }}
        variant="button"
        size="md"
      />
      
      {record.ai && (
        <div className="ai-content">
          <h3>AI Synthesis</h3>
          <div dangerouslySetInnerHTML={{ __html: record.ai }} />
        </div>
      )}
    </div>
  );
}
```

**In your table view (inline):**
```typescript
import { AiFieldInlineButton } from '@/components/ai-field-button';

function NotesTable({ records }) {
  return (
    <table>
      {records.map(record => (
        <tr key={record.id}>
          <td>{record.title}</td>
          <td>
            <AiFieldInlineButton
              collection="notes"
              recordId={record.id}
              onGenerated={() => refreshRecord(record.id)}
            />
          </td>
        </tr>
      ))}
    </table>
  );
}
```

### 3.3 Using the Hook

```typescript
import { useAiGeneration } from '@/hooks/use-ai-generation';

function MyComponent({ collection, recordId }) {
  const {
    isGenerating,
    isPreviewing,
    suggestedInstructions,
    generate,
    preview,
    lastResult,
  } = useAiGeneration(collection, recordId, 'ai', {
    onSuccess: (content) => console.log('Generated:', content),
    onError: (error) => console.error('Failed:', error),
  });

  const handleGenerate = async () => {
    const result = await generate('synthesize key insights and connections');
    if (result.success) {
      // Content saved to record.ai
    }
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate AI Content'}
      </button>
      
      <div>
        {suggestedInstructions.map(inst => (
          <button key={inst} onClick={() => generate(inst)}>
            {inst}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 3.4 System Prompt Template for Generator

Paste this into your AI Employee or Workflow Node:

```markdown
you are a knowledge synthesis engine. your task is to generate rich, structured markdown content for a pkm field based on the provided context.

input context:
- current row data: {{row_data}}
- retrieved relevant knowledge: {{retrieved_chunks}}
- user instruction: {{user_instruction}}

output requirements:
1. generate clean markdown only (no markdown code blocks, just the content)
2. use proper headings (# ## ###), bullet lists, and bold for emphasis
3. include 3-5 powerful insights or connections
4. suggest 2-3 actionable next steps when appropriate
5. cross-reference related items using nocobase format: [[collection:id]]
6. be concise but high-signal (avoid fluff)

output format:
# synthesis

## key insights
- insight 1 with **bold emphasis** on important terms
- insight 2 connecting to [[related_collection:related_id]] if relevant
- insight 3

## next steps
1. actionable item
2. actionable item

## open questions
- question that would deepen understanding?

remember: the user wants signal, not noise. every sentence should add value.
```

## Section 4: Testing & Optimization

### 4.1 Test RAG Retrieval

```typescript
import { buildRagContext } from '@/services/rag-service';

// Test query
const context = await buildRagContext('what are my current priorities?', 8);
console.log('Retrieved chunks:', context.retrievedChunks);
console.log('Sources:', context.sources);
```

### 4.2 Prompt Examples for Knowledge Work

**For Notes:**
- "synthesize the key themes and insights from this note"
- "identify connections to other notes and projects"
- "generate 3 thought-provoking questions based on this content"
- "extract action items and next steps"

**For Tasks:**
- "break this down into subtasks with clear next actions"
- "identify blockers and suggest solutions"
- "prioritize based on urgency and impact"
- "find related tasks from across the pkm"

**For Projects:**
- "synthesize current status and blockers"
- "identify hidden risks and mitigation strategies"
- "suggest next milestones and deliverables"
- "find related research and resources"

**For Research:**
- "extract key findings and methodology"
- "identify gaps in the research and suggest follow-ups"
- "connect to related concepts in the knowledge base"
- "generate critical questions about the conclusions"

### 4.3 Retrieval Tuning

**Adjust in `src/lib/vector-store.ts`:**
```typescript
const VECTOR_CONFIG = {
  chunkSize: 512,      // Increase for longer documents
  chunkOverlap: 128,   // Increase for better context continuity
  topK: 8,             // Number of chunks to retrieve
  // ...
};
```

**For markdown-heavy content:**
- Chunk Size: `768` (captures full sections)
- Overlap: `256` (maintains context between chunks)
- Top K: `5-8` (balance between coverage and noise)

**For quick facts:**
- Chunk Size: `256` (smaller, focused chunks)
- Overlap: `64`
- Top K: `10` (cast a wider net)

### 4.4 Making Wilson Feel Like a True Second Brain

1. **Consistent Fronter Awareness**
   - Wilson addresses users by name from `active_fronters`
   - References previous conversations from chat history

2. **Proactive Context**
   - Wilson automatically pulls relevant info before responding
   - Cites sources so you know where info came from

3. **Cross-Collection Intelligence**
   - Wilson connects notes to tasks to projects
   - Surfaces hidden relationships

4. **Temporal Awareness**
   - Recent items get priority in retrieval
   - Wilson knows what's "current" vs "archived"

## Section 5: Bonus Features

### 5.1 Auto-Suggest on New Rows

**NocoBase Workflow Setup:**
1. Go to Workflow
2. Create new workflow: "Auto-Generate AI Field"
3. Trigger: "After Create" on your collection
4. Add Node: "Custom JS"
```javascript
// Trigger AI generation for new records
const { generateAndSaveAiField } = require('@/services/ai-field-generator');

await generateAndSaveAiField(
  ctx.collection,
  ctx.record.id,
  'ai',
  {
    instruction: 'synthesize initial insights from this new record',
    includeRelated: false, // Skip for speed on create
    topK: 3,
  }
);
```

### 5.2 Scheduled Generation for Stale Content

**Using a Cron Job:**
```typescript
// src/jobs/refresh-ai-fields.ts
import { batchGenerateAiFields } from '@/services/ai-field-generator';
import { api } from '@/api/nocobase-client';

export async function refreshStaleAiFields() {
  // Find records where ai field is empty or old
  const staleRecords = await api.listRecords('notes', {
    filter: {
      $or: [
        { ai: { $empty: true } },
        { updatedAt: { $lt: '7 days ago' } }
      ]
    },
    pageSize: 50,
  });

  const recordIds = staleRecords.data.map(r => r.id);

  await batchGenerateAiFields(
    'notes',
    recordIds,
    'ai',
    {
      instruction: 'refresh synthesis with latest context',
      includeRelated: true,
      topK: 5,
    },
    (completed, total, currentId) => {
      console.log(`Progress: ${completed}/${total} (current: ${currentId})`);
    }
  );
}

// Run daily
// cron.schedule('0 2 * * *', refreshStaleAiFields);
```

### 5.3 Dupemates Integration Hooks

**When Dupemate Interactions Update:**
```typescript
// In your dupemates interaction handler
import { indexRecord } from '@/lib/vector-store';

// After saving interaction
await indexRecord('dupemates', dupemateId, {
  interactions: updatedInteractions,
  lastInteraction: new Date().toISOString(),
  relationshipHealth: calculateHealth(),
});
```

**Query Dupemate Context in Wilson:**
```typescript
// Wilson automatically includes dupemate data in RAG
const context = await buildRagContext(
  'how are my relationships with my dupemates?',
  8
);
// Returns chunks from dupemates collection with interaction history
```

---

## Quick Start Checklist

- [ ] Configure Ollama service in NocoBase admin
- [ ] Create "wilson-rag" AI employee
- [ ] Create "pkm-global-kb" knowledge base
- [ ] Add collections to knowledge base indexing
- [ ] Enable RAG on wilson-rag employee
- [ ] Add "ai" field to target collections
- [ ] Test Wilson chat with RAG queries
- [ ] Test AI field generation on a record
- [ ] Tune chunk size/overlap for your content
- [ ] Set up auto-indexing for new records

## Troubleshooting

**RAG not retrieving results:**
- Check knowledge base indexing status
- Verify vector database connection
- Test with `buildRagContext()` directly

**Slow generation:**
- Reduce `topK` in vector-store config
- Disable `includeRelated` for faster generation
- Use smaller chunk sizes

**Poor quality responses:**
- Increase chunk overlap for better context
- Tune system prompt for your use case
- Add more collections to knowledge base
