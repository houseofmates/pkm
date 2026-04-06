#!/usr/bin/env ts-node
// simple completion generator for sql based on a static schema description// this script can be used by an editor extension to provide table/column snippets
import fs from 'fs';
import path from 'path';

// load a json schema from server-data or another file; adapt as neededconst schemaPath = path.resolve(process.cwd(), 'server-data.json');
let schema: any = {};
try {
  schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
} catch (e) {
  console.warn('could not load schema file, falling back to empty');
}

// naive extraction: any top-level array property is treated as a tableconst tables = Object.entries(schema)
  .filter(([k, v]) => Array.isArray(v))
  .map(([k]) => k);

console.log('-- generated tables');
tables.forEach(t => console.log(t));

// example: produce simple completion linesconsole.log('\n-- completions');
tables.forEach(t => {
  console.log(`${t}`);
  console.log(`${t} (col1, col2)`);
});
