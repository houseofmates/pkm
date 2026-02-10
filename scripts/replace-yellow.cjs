#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir){
  const res = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()){
      res.push(...walk(full));
    } else if(e.isFile()){
      res.push(full);
    }
  }
  return res;
}

const root = path.join(__dirname, '..', 'src');
const files = walk(root).filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.css') || f.endsWith('.cjs') || f.endsWith('.json') || f.endsWith('.html'));

let changed = 0;
const changedFiles = [];
for(const f of files){
  let s = fs.readFileSync(f, 'utf8');
  if(s.includes('#f6b012')){
    const ns = s.split('#f6b012').join('var(--primary)');
    fs.writeFileSync(f, ns, 'utf8');
    changed++;
    changedFiles.push(f);
  }
}

console.log(`Replaced occurrences in ${changed} files.`);
if(changedFiles.length){
  console.log(changedFiles.join('\n'));
}
process.exit(0);
