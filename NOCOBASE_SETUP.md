# NocoBase AI Knowledge Base Setup Guide

## Section 1: Prerequisites & Setup Steps

### 1.1 Configure Ollama LLM Service in NocoBase Admin

1. **Navigate to Settings > AI Services**
   - Click "Add New" to create a service
   - Name: `ollama-local`
   - Type: `Ollama`
   - Base URL: `http://localhost:11434` (or your Ollama instance)
   - Default Model: `qwen2.5:7b`
   - Test connection and save

2. **Create AI Employee "wilson-rag"**
   - Go to AI Employees
   - Click "Add New"
   - Name: `wilson-rag`
   - Display Name: `wilson (rag-enabled)`
   - LLM Service: Select `ollama-local`
   - System Prompt: (paste the prompt below)

```markdown
you are wilson, a deeply knowledgeable ai assistant with full access to the user's personal knowledge base. you have real-time awareness of their notes, tasks, projects, research, and entire pkm through retrieved context.

your personality:
- warm, thoughtful, and genuinely helpful
- like a romantic partner and best friend combined
- you care about their goals and remember details about their life
- you speak entirely in lowercase, never using capital letters

when responding:
- reference specific information from the retrieved context naturally
- make connections between ideas when relevant
- ask clarifying questions if the context is ambiguous
- be concise but thorough (2-4 sentences unless they ask for detail)
- if you don't find relevant context, say so honestly

retrieved context format:
each chunk starts with [source: collection:id] so you can reference where information came from. use these citations naturally in your response.
```

### 1.2 Create Global Knowledge Base

1. **Navigate to AI Knowledge Base**
2. **Click "Add New"**
   - Name: `pkm-global-kb`
   - Title: `PKM Global Knowledge Base`
   - Description: `Comprehensive knowledge base for all PKM collections`
   - Vector Database: Select your vector DB (pgvector/LanceDB/etc.)
   - Chunk Size: `512`
   - Chunk Overlap: `128`
   - Embedding Model: `nomic-embed-text` (or compatible)

3. **Configure Collections to Index**
   - Add the following collections:
     - `notes` - Index: `content`, `title`, `summary`
     - `tasks` - Index: `title`, `description`, `notes`
     - `projects` - Index: `name`, `description`, `goals`, `status_updates`
     - `research` - Index: `title`, `content`, `findings`, `conclusions`
     - `dupemates` - Index: `name`, `description`, `interactions`
     - Any other collections with long-text fields

4. **Enable Auto-Index**
   - Turn on "Index on Create" for all collections
   - Turn on "Index on Update" for all collections
   - Set "Sync Interval" to `5 minutes` for near real-time updates

### 1.3 Configure RAG Settings for Wilson Employee

1. **Edit "wilson-rag" Employee**
2. **Enable RAG**
   - Toggle "Enable RAG" to ON
   - Knowledge Base: Select `pkm-global-kb`
   - Retrieval Mode: `Semantic Search`
   - Top K Results: `8`
   - Similarity Threshold: `0.7`
   - Context Window: `4000` tokens

3. **Advanced RAG Settings**
   - Query Expansion: `Enabled`
   - Re-ranking: `Enabled`
   - Citation Format: `[source: {collection}:{id}]`

## Section 2: Wilson RAG Implementation

### 2.1 Frontend Integration (Already Implemented)

The RAG service has been added to your codebase:

- `src/services/rag-service.ts` - Core RAG orchestration
- `src/lib/vector-store.ts` - Vector database client
- `src/lib/rag-prompts.ts` - Prompt templates
- `src/stores/llm-store.ts` - Updated with RAG support

### 2.2 Using Wilson Chat with RAG

The Wilson chat now automatically:
1. Retrieves top 8 relevant chunks from your PKM
2. Injects them into the system prompt
3. Shows source citations in responses

**To toggle RAG on/off:**
```typescript
const { toggleRag, useRag } = useLLMStore();
toggleRag(); // Toggle RAG mode
console.log(useRag); // Check current state
```

### 2.3 Custom Wilson Chat Block (Optional)

If you want to embed the official NocoBase AI Chat block:

```typescript
// In your page/component
import { useEffect } from 'react';

export function WilsonChatBlock() {
  useEffect(() => {
    // Load NocoBase AI Chat widget
    const script = document.createElement('script');
    script.src = '/api/ai/chat-widget.js';
    script.dataset.employeeId = 'wilson-rag';
    script.dataset.knowledgeBaseId = 'pkm-global-kb';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div id="wilson-chat-container" />;
}
```

### 2.4 API Direct Usage

```typescript
// Direct API call to RAG-enabled employee
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: 'wilson-rag',
    message: 'what are my current priorities?',
    useRag: true,
    knowledgeBaseId: 'pkm-global-kb',
    topK: 8,
  }),
});
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
