#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const roots = [
  path.join(__dirname, '..', 'dist', 'assets'),
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'assets')
].filter(p => fs.existsSync(p));

function walk(dir, exts){
  const out = [];
  for(const ent of fs.readdirSync(dir, { withFileTypes: true })){
    const full = path.join(dir, ent.name);
    if(ent.isDirectory()) out.push(...walk(full, exts));
    else if(exts.some(e => full.endsWith(e))) out.push(full);
  }
  return out;
}

let modified = 0, scanned = 0;

for(const root of roots){
  const files = walk(root, ['.css', '.scss', '.js', '.jsx', '.ts', '.tsx', '.html']);
  scanned += files.length;
  for(const file of files){
    try{
      let s = fs.readFileSync(file,'utf8');
      let orig = s;
      // css text-transform replacements for css contexts
      // replace text-transform: <value>; where <value> is not none or lowercase
      s = s.replace(/text-transform\s*:\s*([a-zA-Z-]+)\s*;?/g, (m, val) => {
        const v = String(val).toLowerCase();
        if(v === 'none' || v === 'lowercase') return `text-transform: lowercase !important;`;
        return `text-transform: lowercase !important;`;
      });
      // replace js style object texttransform: 'uppercase' or "uppercase" or texttransform: uppercase
      s = s.replace(/textTransform\s*:\s*(['\"]?)([A-Za-z-]+)\1/g, (m, q, val) => {
        const v = String(val).toLowerCase();
        return `textTransform: ${q}${v}${q}`;
      });
      if(s !== orig){
        fs.writeFileSync(file, s, 'utf8');
        modified++;
        console.log('Modified style in', file);
      }
    }catch(e){
      console.error('err', file, e.message);
    }
  }
}
console.log('Styles scan done. Files scanned:', scanned, 'modified:', modified);
process.exit(0);
