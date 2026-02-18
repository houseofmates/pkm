#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const roots = [
  path.join(__dirname, '..', 'dist', 'assets'),
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'assets')
].filter(p => fs.existsSync(p));

function walkDir(dir){
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for(const ent of entries){
    const full = path.join(dir, ent.name);
    if(ent.isDirectory()){
      results.push(...walkDir(full));
    } else if(ent.isFile()){
      if(/\.(js|css|html|json|map)$/i.test(ent.name)) results.push(full);
    }
  }
  return results;
}

let filesScanned = 0, filesModified = 0;
for(const root of roots){
  console.log('Scanning', root);
  const files = walkDir(root);
  filesScanned += files.length;
  for(const f of files){
    try{
      let c = fs.readFileSync(f,'utf8');
      let changed = false;
      // replace any quoted string (single/double/backtick) that contains a-z with its lowercase
      c = c.replace(/(["'`])([\s\S]*?)[\1]/g, (m, q, inner) => {
        if(/[A-Z]/.test(inner)){
          changed = true;
          return q + inner.toLowerCase() + q;
        }
        return m;
      });
      if(changed){
        fs.writeFileSync(f, c, 'utf8');
        filesModified++;
        console.log('Modified', f);
      }
    }catch(e){
      console.error('err', f, e.message);
    }
  }
}
console.log('Done. Files scanned:', filesScanned, 'Files modified:', filesModified);
process.exit(0);
