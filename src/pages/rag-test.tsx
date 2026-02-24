// rag test page - accessible at /rag-test
// use this to verify the rag implementation works

import { useState, useEffect } from 'react';
import { buildRagContext, generateWilsonRagPrompt } from '@/services/rag-service';
import { searchKnowledgeBase, formatChunksForPrompt } from '@/lib/vector-store';
import { generateAndSaveAiField, previewAiFieldContent } from '@/services/ai-field-generator';
import { AiFieldButton } from '@/components/ai-field-button';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useLLMStore } from '@/stores/llm-store';
import { api } from '@/api/nocobase-client';

export default function RagTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sampleRecordId, setSampleRecordId] = useState<string>('');

  const addResult = (msg: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    addResult('🚀 starting rag tests...\n');

    try {
      // test 1: knowledge base search
      addResult('1️⃣ testing knowledge base search...');
      const searchResults = await searchKnowledgeBase('test query', 3);
      addResult(`   ✅ search returned ${searchResults.length} results`);
      if (searchResults.length > 0) {
        addResult(`   sample: ${searchResults[0].chunk.content.slice(0, 50)}...`);
      }

      // test 2: rag context building
      addResult('\n2️⃣ testing rag context building...');
      const context = await buildRagContext('what are my priorities?', 5);
      addResult(`   ✅ context built with ${context.retrievedChunks.length} chunks`);
      addResult(`   sources: ${context.sources.join(', ') || 'none'}`);

      // test 3: prompt generation
      addResult('\n3️⃣ testing wilson prompt generation...');
      const prompt = await generateWilsonRagPrompt('how are my projects?', 'friend');
      addResult(`   ✅ prompt generated (${prompt.length} chars)`);
      addResult(`   has context: ${prompt.includes('retrieved context')}`);
      addResult(`   has sources: ${prompt.includes('[source:')}`);

      // test 4: format chunks
      addResult('\n4️⃣ testing chunk formatting...');
      const formatted = formatChunksForPrompt(context.retrievedChunks);
      addResult(`   ✅ formatted ${formatted.length} chars`);

      // test 5: check for sample records
      addResult('\n5️⃣ checking for sample records...');
      try {
        const records = await api.listRecords('notes', { pageSize: 1 });
        const hasRecords = records.data && records.data.length > 0;
        addResult(`   ${hasRecords ? '✅' : '⚠️'} notes collection: ${hasRecords ? 'has records' : 'empty'}`);
        if (hasRecords) {
          setSampleRecordId(String(records.data[0].id));
          addResult(`   sample record id: ${records.data[0].id}`);
        }
      } catch (e) {
        addResult(`   ⚠️ could not check notes: ${e}`);
      }

      // test 6: llm store integration
      addResult('\n6️⃣ testing llm store...');
      const { useRag, toggleRag } = useLLMStore.getState();
      addResult(`   ✅ rag enabled: ${useRag}`);
      addResult(`   ✅ toggle function exists: ${typeof toggleRag === 'function'}`);

      addResult('\n✅ all tests completed!');
    } catch (error) {
      addResult(`\n❌ test failed: ${error}`);
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 lowercase">rag implementation test</h1>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50 lowercase"
        >
          {isRunning ? 'running tests...' : 'run tests'}
        </button>
      </div>

      <div className="mb-6 p-4 bg-muted rounded font-mono text-sm whitespace-pre-wrap h-96 overflow-y-auto">
        {testResults.length === 0 ? (
          <span className="text-muted-foreground">click "run tests" to start...</span>
        ) : (
          testResults.join('\n')
        )}
      </div>

      {sampleRecordId && (
        <div className="mt-8 p-4 border rounded">
          <h2 className="text-lg font-bold mb-2 lowercase">ai field button test</h2>
          <p className="text-sm text-muted-foreground mb-4">
            testing with record {sampleRecordId} from notes collection
          </p>
          <AiFieldButton
            collection="notes"
            recordId={sampleRecordId}
            fieldName="ai"
            onGenerated={(content) => addResult(`\n🎉 ai content generated: ${content.slice(0, 100)}...`)}
          />
        </div>
      )}

      <div className="mt-8 p-4 border rounded">
        <h2 className="text-lg font-bold mb-2 lowercase">manual test</h2>
        <p className="text-sm text-muted-foreground">
          open browser console and run:
        </p>
        <code className="block p-2 bg-muted rounded mt-2 text-xs">
          {`import('@/services/rag-service').then(m => m.buildRagContext('test', 3)).then(console.log)`}
        </code>
      </div>
    </div>
  );
}
