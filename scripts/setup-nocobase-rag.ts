// nocobase rag quick-start script
// auto-configures collections, ai employee, and knowledge base via api

import { api } from '../src/api/nocobase-client';
import { secureLogger } from '../src/lib/secure-logger';
import { reindexCollection } from '../src/lib/vector-store';

// configuration
const CONFIG = {
  llmService: {
    name: 'ollama-local',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'qwen2.5:7b',
  },
  aiEmployee: {
    name: 'wilson-rag',
    displayName: 'wilson (rag-enabled)',
    systemPrompt: `you are wilson, a deeply knowledgeable ai assistant with full access to the user's personal knowledge base. you have real-time awareness of their notes, tasks, projects, research, and entire pkm through retrieved context.

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
each chunk starts with [source: collection:id] so you can reference where information came from. use these citations naturally in your response.`,
  },
  knowledgeBase: {
    name: 'pkm-global-kb',
    title: 'pkm global knowledge base',
    description: 'comprehensive knowledge base for all pkm collections',
    chunkSize: 512,
    chunkOverlap: 128,
    embeddingModel: 'nomic-embed-text',
  },
  collectionsToIndex: [
    { name: 'notes', fields: ['content', 'title', 'summary'] },
    { name: 'tasks', fields: ['title', 'description', 'notes'] },
    { name: 'projects', fields: ['name', 'description', 'goals', 'status_updates'] },
    { name: 'research', fields: ['title', 'content', 'findings', 'conclusions'] },
    { name: 'dupemates', fields: ['name', 'description', 'interactions'] },
  ],
};

// main setup function
export async function setupNocoBaseRag(): Promise<{
  success: boolean;
  steps: { name: string; success: boolean; error?: string }[];
}> {
  const steps: { name: string; success: boolean; error?: string }[] = [];

  console.log('🚀 setting up nocobase rag integration...\n');

  // step 1: create llm service
  steps.push(await createLlmService());

  // step 2: create ai employee
  steps.push(await createAiEmployee());

  // step 3: create knowledge base
  steps.push(await createKnowledgeBase());

  // step 4: add collections to knowledge base
  for (const collection of CONFIG.collectionsToIndex) {
    steps.push(await addCollectionToKnowledgeBase(collection));
  }

  // step 5: create ai fields on collections
  for (const collection of CONFIG.collectionsToIndex) {
    steps.push(await createAiField(collection.name));
  }

  // step 6: trigger initial indexing
  for (const collection of CONFIG.collectionsToIndex) {
    steps.push(await indexCollection(collection.name));
  }

  // print summary
  const allSuccess = steps.every(s => s.success);
  printSetupSummary(steps);

  return { success: allSuccess, steps };
}

// create llm service
async function createLlmService() {
  const name = 'create llm service';

  try {
    // check if service already exists
    const existing: any = await api.client.get('/ai-services:list', {
      params: { 'filter[name]': CONFIG.llmService.name },
    });

    const services = Array.isArray(existing.data)
      ? existing.data
      : existing.data?.data || [];

    if (services.length > 0) {
      console.log(`  ℹ️  llm service "${CONFIG.llmService.name}" already exists`);
      return { name, success: true };
    }

    // create new service
    await api.client.post('/ai-services:create', {
      name: CONFIG.llmService.name,
      type: CONFIG.llmService.type,
      baseUrl: CONFIG.llmService.baseUrl,
      defaultModel: CONFIG.llmService.defaultModel,
      options: {
        temperature: 0.7,
        topP: 0.95,
      },
    });

    console.log(`  ✅ created llm service: ${CONFIG.llmService.name}`);
    return { name, success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ❌ failed to create llm service: ${errorMsg}`);
    return { name, success: false, error: errorMsg };
  }
}

// create ai employee
async function createAiEmployee() {
  const name = 'create ai employee';

  try {
    // check if employee already exists
    const existing: any = await api.client.get('/ai-employees:list', {
      params: { 'filter[name]': CONFIG.aiEmployee.name },
    });

    const employees = Array.isArray(existing.data)
      ? existing.data
      : existing.data?.data || [];

    if (employees.length > 0) {
      console.log(`  ℹ️  ai employee "${CONFIG.aiEmployee.name}" already exists`);
      return { name, success: true };
    }

    // get llm service id
    const servicesRes: any = await api.client.get('/ai-services:list', {
      params: { 'filter[name]': CONFIG.llmService.name },
    });

    const services = Array.isArray(servicesRes.data)
      ? servicesRes.data
      : servicesRes.data?.data || [];

    if (services.length === 0) {
      throw new Error('llm service not found');
    }

    // create employee
    await api.client.post('/ai-employees:create', {
      name: CONFIG.aiEmployee.name,
      displayName: CONFIG.aiEmployee.displayName,
      llmServiceId: services[0].id,
      systemPrompt: CONFIG.aiEmployee.systemPrompt,
      config: {
        useRag: true,
        retrievalMode: 'semantic',
        topK: 8,
        similarityThreshold: 0.7,
        contextWindow: 4000,
      },
    });

    console.log(`  ✅ created ai employee: ${CONFIG.aiEmployee.name}`);
    return { name, success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ❌ failed to create ai employee: ${errorMsg}`);
    return { name, success: false, error: errorMsg };
  }
}

// create knowledge base
async function createKnowledgeBase() {
  const name = 'create knowledge base';

  try {
    // check if kb already exists
    const existing: any = await api.client.get('/ai-knowledge-bases:list', {
      params: { 'filter[name]': CONFIG.knowledgeBase.name },
    });

    const kbs = Array.isArray(existing.data)
      ? existing.data
      : existing.data?.data || [];

    if (kbs.length > 0) {
      console.log(`  ℹ️  knowledge base "${CONFIG.knowledgeBase.name}" already exists`);
      return { name, success: true };
    }

    // create knowledge base
    await api.client.post('/ai-knowledge-bases:create', {
      name: CONFIG.knowledgeBase.name,
      title: CONFIG.knowledgeBase.title,
      description: CONFIG.knowledgeBase.description,
      chunkSize: CONFIG.knowledgeBase.chunkSize,
      chunkOverlap: CONFIG.knowledgeBase.chunkOverlap,
      embeddingModel: CONFIG.knowledgeBase.embeddingModel,
      config: {
        autoIndex: true,
        indexOnCreate: true,
        indexOnUpdate: true,
        syncInterval: 5, // minutes
      },
    });

    console.log(`  ✅ created knowledge base: ${CONFIG.knowledgeBase.name}`);
    return { name, success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ❌ failed to create knowledge base: ${errorMsg}`);
    return { name, success: false, error: errorMsg };
  }
}

// add collection to knowledge base
async function addCollectionToKnowledgeBase(collection: { name: string; fields: string[] }) {
  const stepName = `add ${collection.name} to knowledge base`;

  try {
    // get knowledge base id
    const kbRes: any = await api.client.get('/ai-knowledge-bases:list', {
      params: { 'filter[name]': CONFIG.knowledgeBase.name },
    });

    const kbs = Array.isArray(kbRes.data) ? kbRes.data : kbRes.data?.data || [];
    if (kbs.length === 0) {
      throw new Error('knowledge base not found');
    }

    const kbId = kbs[0].id;

    // add collection to kb
    await api.client.post('/ai-knowledge-base-collections:create', {
      knowledgeBaseId: kbId,
      collection: collection.name,
      fields: collection.fields,
      config: {
        chunkSize: CONFIG.knowledgeBase.chunkSize,
        chunkOverlap: CONFIG.knowledgeBase.chunkOverlap,
        indexAttachments: true,
      },
    });

    console.log(`  ✅ added ${collection.name} to knowledge base`);
    return { name: stepName, success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ❌ failed to add ${collection.name}: ${errorMsg}`);
    return { name: stepName, success: false, error: errorMsg };
  }
}

// create ai field on collection
async function createAiField(collectionName: string) {
  const name = `create ai field on ${collectionName}`;

  try {
    // check if field already exists
    const colRes: any = await api.getCollection(collectionName);
    const fields = colRes.data?.fields || colRes.fields || [];

    if (fields.some((f: any) => f.name === 'ai')) {
      console.log(`  ℹ️  ai field already exists on ${collectionName}`);
      return { name, success: true };
    }

    // create the field
    await api.createField(collectionName, {
      name: 'ai',
      type: 'text',
      interface: 'markdown',
      uiSchema: {
        'x-component': 'Markdown',
        'x-component-props': {
          placeholder: 'ai-generated content will appear here...',
        },
      },
    });

    console.log(`  ✅ created ai field on ${collectionName}`);
    return { name, success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ❌ failed to create ai field on ${collectionName}: ${errorMsg}`);
    return { name, success: false, error: errorMsg };
  }
}

// index collection
async function indexCollection(collectionName: string) {
  const name = `index ${collectionName}`;

  try {
    const result = await reindexCollection(collectionName);

    console.log(`  ✅ indexed ${collectionName}: ${result.indexed} records, ${result.failed} failed`);
    return { name, success: result.failed === 0, error: result.failed > 0 ? `${result.failed} records failed` : undefined };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'unknown error';
    console.error(`  ❌ failed to index ${collectionName}: ${errorMsg}`);
    return { name, success: false, error: errorMsg };
  }
}

// print setup summary
function printSetupSummary(steps: { name: string; success: boolean; error?: string }[]) {
  console.log('\n📊 setup summary:\n');

  const passed = steps.filter(s => s.success).length;
  const failed = steps.filter(s => !s.success).length;

  for (const step of steps) {
    const icon = step.success ? '✅' : '❌';
    console.log(`${icon} ${step.name}`);
    if (step.error) {
      console.log(`   error: ${step.error}`);
    }
  }

  console.log(`\n${passed}/${steps.length} steps completed (${failed} failed)`);

  if (failed === 0) {
    console.log('\n🎉 nocobase rag setup complete!');
    console.log('\nnext steps:');
    console.log('1. test wilson chat with rag enabled');
    console.log('2. try generating ai content on a record');
    console.log('3. tune chunk sizes if needed for your content');
  } else {
    console.log('\n⚠️ some steps failed. check the errors above and retry.');
  }
}

// run if called directly
if (require.main === module) {
  setupNocoBaseRag().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}
