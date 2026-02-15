#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const roots = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public')
].filter(p => fs.existsSync(p));

function walk(dir){
  const out = [];
  for(const ent of fs.readdirSync(dir, { withFileTypes: true })){
    const full = path.join(dir, ent.name);
    if(ent.isDirectory()) out.push(...walk(full));
    else if(ent.isFile() && /manifest|metadata|package|webmanifest/i.test(ent.name) && ent.name.endsWith('.json')) out.push(full);
  }
  return out;
}

function lowerAllStrings(obj){
  if(typeof obj === 'string') return obj.toLowerCase();
  if(Array.isArray(obj)) return obj.map(lowerAllStrings);
  if(typeof obj === 'object' && obj !== null){
    const out = {};
    for(const k of Object.keys(obj)) out[k] = lowerAllStrings(obj[k]);
    return out;
  }
  return obj;
}

let changedFiles = 0;
for(const root of roots){
  const files = walk(root);
  for(const f of files){
    try{
      const data = JSON.parse(fs.readFileSync(f,'utf8'));
      const lowered = lowerAllStrings(data);
      fs.writeFileSync(f, JSON.stringify(lowered, null, 2), 'utf8');
      changedFiles++;
      console.log('Lowercased manifest', f);
    }catch(e){
      console.error('err', f, e.message);
    }
  }
}
console.log('Manifests processed:', changedFiles);
process.exit(0);
