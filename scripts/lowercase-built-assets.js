#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const roots = [
  path.join(__dirname, '..', 'dist', 'assets'),
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'assets')
].filter(p => fs.existsSync(p));

function isUiString(s){
  // Only target strings that start with capital letter and look like labels/tooltips:
  // letters, numbers, spaces, punctuation common in labels. Skip URLs, code, paths, templates.
  if(!s || s.length===0) return false;
  if(!/^[A-Z]/.test(s)) return false;
  if(/[:\\/<>@=\{\}\$\*]/.test(s)) return false; // skip likely code/URLs/paths
  if(s.includes('${')) return false; // skip template expressions
  // allow letters, numbers, spaces and common punctuation in labels
  return /^[A-Z][A-Za-z0-9 \-_'"()%,.!?]+$/.test(s);
}

function processFile(file){
  let content = fs.readFileSync(file,'utf8');
  let changed = false;
  // regex to find quoted string literals (single, double, backtick)
  const re = /(["'`])((?:.(?!\1))*.?)\1/gms;
  content = content.replace(re, (m, quote, inner) => {
    try{
      if(quote === '`' && inner.includes('${')) return m; // skip template with expressions
      if(isUiString(inner)){
        const lower = inner.toLowerCase();
        changed = true;
        return quote + lower + quote;
      }
      return m;
    }catch(e){
      return m;
    }
  });
  if(changed){
    fs.writeFileSync(file, content, 'utf8');
    return true;
  }
  return false;
}

function walkDir(dir){
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for(const ent of entries){
    const full = path.join(dir, ent.name);
    if(ent.isDirectory()){
      results.push(...walkDir(full));
    } else if(ent.isFile()){
      // Only process typical asset files
      if(/\.(js|css|html|json|map)$/i.test(ent.name)) results.push(full);
    }
  }
  return results;
}

let totalModified = 0;
let filesScanned = 0;
for(const root of roots){
  console.log('Scanning', root);
  const files = walkDir(root);
  filesScanned += files.length;
  for(const f of files){
    try{
      const ok = processFile(f);
      if(ok){
        console.log('Modified', f);
        totalModified++;
      }
    }catch(e){
      console.error('Error processing', f, e.message);
    }
  }
}

console.log('Done. Files scanned:', filesScanned, 'Files modified:', totalModified);
process.exit(0);
