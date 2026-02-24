#!/usr/bin/env node
// script to index every collection into the Ollama/NocoBase knowledge base
// usage: node scripts/index-kb.cjs

require('ts-node').register({ transpileOnly: true });

(async () => {
  try {
    const { indexAllCollections } = require('../src/lib/vector-store');
    console.log('starting knowledge base indexing...');
    const results = await indexAllCollections();
    console.log('indexing results:');
    console.table(results);
    process.exit(0);
  } catch (e) {
    console.error('indexing failed:', e);
    process.exit(1);
  }
})();
