// rag implementation test script
// run this to verify the rag system is working correctly

import { buildRagContext, generateWilsonRagPrompt, generateAiFieldContent } from '@/services/rag-service';
import { searchKnowledgeBase, indexRecord, reindexCollection } from '@/lib/vector-store';
import { generateAndSaveAiField, previewAiFieldContent } from '@/services/ai-field-generator';
import { getAutoSuggestions, getStarterSuggestions } from '@/services/auto-suggest-service';
import { scheduler, previewScheduledRecords } from '@/services/scheduled-generation';
import { getDupemateContext, findRelatedDupemates } from '@/services/dupemates-integration';
import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

// run all tests
export async function runRagTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('🧪 starting rag implementation tests...\n');

  // test 1: knowledge base search
  results.push(await testKnowledgeBaseSearch());

  // test 2: rag context building
  results.push(await testRagContextBuilding());

  // test 3: wilson prompt generation
  results.push(await testWilsonPromptGeneration());

  // test 4: ai field content generation
  results.push(await testAiFieldGeneration());

  // test 5: auto-suggestions
  results.push(await testAutoSuggestions());

  // test 6: scheduled generation preview
  results.push(await testScheduledGeneration());

  // test 7: dupemates integration
  results.push(await testDupematesIntegration());

  // print summary
  printTestSummary(results);

  return results;
}

// test 1: knowledge base search
async function testKnowledgeBaseSearch(): Promise<TestResult> {
  const start = Date.now();
  const name = 'knowledge base search';

  try {
    const results = await searchKnowledgeBase('test query for pkm', 5);

    return {
      name,
      passed: Array.isArray(results),
      duration: Date.now() - start,
      details: {
        resultCount: results.length,
        sampleResult: results[0] ? {
          collection: results[0].chunk.collection,
          score: results[0].score,
          contentPreview: results[0].chunk.content.slice(0, 100),
        } : null,
      },
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

// test 2: rag context building
async function testRagContextBuilding(): Promise<TestResult> {
  const start = Date.now();
  const name = 'rag context building';

  try {
    const context = await buildRagContext('what are my current priorities?', 5);

    return {
      name,
      passed: context.formattedContext.length > 0,
      duration: Date.now() - start,
      details: {
        query: context.query,
        chunksRetrieved: context.retrievedChunks.length,
        sourcesFound: context.sources.length,
        contextLength: context.formattedContext.length,
      },
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

// test 3: wilson prompt generation
async function testWilsonPromptGeneration(): Promise<TestResult> {
  const start = Date.now();
  const name = 'wilson rag prompt generation';

  try {
    const prompt = await generateWilsonRagPrompt('how are my projects going?', 'test user');

    return {
      name,
      passed: prompt.includes('wilson') && prompt.includes('retrieved context'),
      duration: Date.now() - start,
      details: {
        promptLength: prompt.length,
        hasSystemPrompt: prompt.includes('you are wilson'),
        hasRetrievedContext: prompt.includes('retrieved context'),
        hasUserQuery: prompt.includes('how are my projects going?'),
      },
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

// test 4: ai field generation
async function testAiFieldGeneration(): Promise<TestResult> {
  const start = Date.now();
  const name = 'ai field content generation';

  try {
    // first, try to get a real record to test with
    const collectionsRes: any = await api.listCollections();
    const collections = Array.isArray(collectionsRes.data)
      ? collectionsRes.data
      : collectionsRes.data?.data || [];

    const testCollection = collections.find((c: any) => !c.hidden)?.name;

    if (!testCollection) {
      return {
        name,
        passed: false,
        duration: Date.now() - start,
        error: 'no collections available for testing',
      };
    }

    // get a record from the collection
    const recordsRes: any = await api.listRecords(testCollection, { pageSize: 1 });
    const records = Array.isArray(recordsRes.data)
      ? recordsRes.data
      : recordsRes.data?.data || [];

    if (records.length === 0) {
      return {
        name,
        passed: false,
        duration: Date.now() - start,
        error: `no records in ${testCollection} for testing`,
      };
    }

    const recordId = records[0].id;

    // generate prompt (don't actually call ollama in test)
    const prompt = await generateAiFieldContent(
      testCollection,
      recordId,
      'synthesize key insights',
      { includeRelated: false, topK: 3 }
    );

    return {
      name,
      passed: prompt.length > 100 && prompt.includes('synthesis'),
      duration: Date.now() - start,
      details: {
        collection: testCollection,
        recordId,
        promptLength: prompt.length,
        hasRowData: prompt.includes('current row data'),
        hasRetrievedChunks: prompt.includes('retrieved relevant knowledge'),
      },
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

// test 5: auto-suggestions
async function testAutoSuggestions(): Promise<TestResult> {
  const start = Date.now();
  const name = 'auto-suggest service';

  try {
    const suggestions = await getAutoSuggestions(
      'working on a project about',
      'notes',
      undefined,
      5
    );

    const starterSuggestions = await getStarterSuggestions('notes');

    return {
      name,
      passed: Array.isArray(suggestions) && Array.isArray(starterSuggestions),
      duration: Date.now() - start,
      details: {
        dynamicSuggestions: suggestions.length,
        starterSuggestions: starterSuggestions.length,
        suggestionTypes: [...new Set(suggestions.map(s => s.type))],
      },
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

// test 6: scheduled generation
async function testScheduledGeneration(): Promise<TestResult> {
  const start = Date.now();
  const name = 'scheduled generation';

  try {
    // just test the preview function
    const preview = await previewScheduledRecords('notes', 'ai', 7);

    return {
      name,
      passed: Array.isArray(preview),
      duration: Date.now() - start,
      details: {
        recordsNeedingGeneration: preview.length,
        schedulerStatus: scheduler.getStatus(),
      },
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

// test 7: dupemates integration
async function testDupematesIntegration(): Promise<TestResult> {
  const start = Date.now();
  const name = 'dupemates integration';

  try {
    // test finding related dupemates
    const related = await findRelatedDupemates('friend support', 3);

    return {
      name,
      passed: Array.isArray(related),
      duration: Date.now() - start,
      details: {
        relatedDupematesFound: related.length,
        sampleResult: related[0] || null,
      },
    };
  } catch (error) {
    return {
      name,
      passed: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'unknown error',
    };
  }
}

// print test summary
function printTestSummary(results: TestResult[]) {
  console.log('\n📊 test summary:\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'passed' : 'failed';
    console.log(`${icon} ${result.name}: ${status} (${result.duration}ms)`);

    if (!result.passed && result.error) {
      console.log(`   error: ${result.error}`);
    }

    if (result.details) {
      console.log(`   details:`, JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   '));
    }
  }

  console.log(`\n${passed}/${results.length} tests passed (${failed} failed)`);
  console.log(`total duration: ${totalDuration}ms`);
  console.log(failed === 0 ? '\n🎉 all tests passed!' : '\n⚠️ some tests failed. check the errors above.');
}

// quick smoke test for critical paths
export async function runSmokeTest(): Promise<boolean> {
  console.log('🔥 running smoke test...\n');

  try {
    // test 1: can we search?
    const searchResults = await searchKnowledgeBase('test', 1);
    console.log('✅ knowledge base search working');

    // test 2: can we build context?
    const context = await buildRagContext('test', 1);
    console.log('✅ rag context building working');

    // test 3: can we generate a prompt?
    const prompt = await generateWilsonRagPrompt('test', 'user');
    console.log('✅ wilson prompt generation working');

    console.log('\n🎉 smoke test passed! core rag functionality is working.');
    return true;
  } catch (error) {
    console.error('\n❌ smoke test failed:', error);
    return false;
  }
}

// export for use in other tests
export { testKnowledgeBaseSearch, testRagContextBuilding, testWilsonPromptGeneration };
