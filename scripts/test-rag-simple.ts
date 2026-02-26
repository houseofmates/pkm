// simple rag test that doesn't rely on path aliases
// run with: npx ts-node scripts/test-rag-simple.ts

import { searchKnowledgeBase, formatChunksForPrompt } from '../packages/core/src/lib/vector-store';
import { buildRagContext, generateWilsonRagPrompt } from '../packages/core/src/services/rag-service';

async function runSimpleTest() {
  console.log('🧪 simple rag test\n');

  try {
    // test 1: search knowledge base
    console.log('1️⃣ testing knowledge base search...');
    const results = await searchKnowledgeBase('test query', 3);
    console.log(`   ✅ search returned ${results.length} results`);
    if (results.length > 0) {
      console.log(`   sample: ${results[0].chunk.content.slice(0, 50)}...`);
    }

    // test 2: build rag context
    console.log('\n2️⃣ testing rag context building...');
    const context = await buildRagContext('what are my priorities?', 5);
    console.log(`   ✅ context built with ${context.retrievedChunks.length} chunks`);
    console.log(`   sources: ${context.sources.length}`);

    // test 3: generate wilson prompt
    console.log('\n3️⃣ testing wilson prompt generation...');
    const prompt = await generateWilsonRagPrompt('how are my projects?', 'friend');
    console.log(`   ✅ prompt generated (${prompt.length} chars)`);
    console.log(`   has context: ${prompt.includes('retrieved context')}`);
    console.log(`   has sources: ${prompt.includes('[source:')}`);

    console.log('\n✅ all tests passed! rag is working.');
    return true;
  } catch (error) {
    console.error('\n❌ test failed:', error);
    return false;
  }
}

runSimpleTest();
