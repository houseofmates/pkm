import fs from 'fs'
import path from 'path'

const uiDir = path.join(process.cwd(), 'src', 'components', 'ui')
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.tsx'))

function findDefinedSymbols(text) {
  const defs = new Set()
  // match PascalCase and camelCase const/function/class/exports
  const re = /(?:const|let|var|function|class|export\s+const|export\s+function)\s+([A-Za-z0-9_]+)/g
  let m
  while ((m = re.exec(text))) defs.add(m[1])
  return defs
}

function findNamedExports(text) {
  const exports = []
  const re = /export\s*\{([^}]+)\}/g
  let m
  while ((m = re.exec(text))) {
    const names = m[1].split(',').map(s => s.split(/\s+as\s+/i)[0].trim()).filter(Boolean)
    exports.push(...names)
  }
  return exports
}

const report = []
for (const f of files) {
  const p = path.join(uiDir, f)
  const txt = fs.readFileSync(p, 'utf8')
  const defs = findDefinedSymbols(txt)
  const exps = findNamedExports(txt)
  const missing = exps.filter(e => !defs.has(e) && !/^[a-z]/.test(e)) // ignore lowercase helpers
  if (missing.length) report.push({ file: p, missing, defs: Array.from(defs).slice(0,20) })
}

if (report.length === 0) {
  console.log('No missing-local named-exports found in src/components/ui')
  process.exit(0)
}

for (const r of report) {
  console.log(r.file)
  console.log('  missing exports:', r.missing.join(', '))
  console.log('  defined (sample):', r.defs.join(', '))
}
process.exit(1)
