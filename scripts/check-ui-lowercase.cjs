#!/usr/bin/env node
// script: check-ui-lowercase
// purpose: scan jsx/tsx/html files for ui text (jsx text nodes and common attributes)
//          and fail if any uppercase letters are present in visible UI strings.

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_DIRS = [path.join(ROOT, 'src'), path.join(ROOT, 'public')]
const EXT = ['.tsx', '.jsx', '.html']

function walkDirs(dirs) {
  const files = []
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    const stack = [dir]
    while (stack.length) {
      const p = stack.pop()
      if (p.includes('node_modules')) continue
      const ents = fs.readdirSync(p)
      for (const e of ents) {
        const full = path.join(p, e)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) stack.push(full)
        else if (EXT.includes(path.extname(full))) files.push(full)
      }
    }
  }
  return files
}

function containsUppercaseVisibleText(str) {
  // ignore backticks and urls
  if (/`[^`]*`/.test(str)) return false
  if (/https?:\/\//i.test(str)) return false
  // consider visible words that contain uppercase letters
  return /[A-Z]/.test(str)
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8')
  const violations = []

  // 1) jsx text nodes: >...< (simple heuristic)
  const jsxTextRe = />\s*([^<>\{\}][^<>]*)\s*</g
  let m
  while ((m = jsxTextRe.exec(text))) {
    const content = m[1].trim()
    if (!content) continue
    if (containsUppercaseVisibleText(content)) {
      // ignore all-uppercase abbreviation-only lines like 'API' - user requested strict lowercase so we flag them
      violations.push({ type: 'jsx-text', snippet: content, index: m.index })
    }
  }

  // 2) attribute string values (common ui attributes)
  const attrNames = ['title', 'placeholder', 'aria-label', 'alt', 'label', 'aria-placeholder', 'aria-labelledby']
  const attrRe = new RegExp(`\\b(${attrNames.join('|')})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*'([^']*)'\\s*\\})`, 'gi')
  while ((m = attrRe.exec(text))) {
    const val = (m[2] || m[3] || m[4] || '').trim()
    if (!val) continue
    if (containsUppercaseVisibleText(val)) violations.push({ type: 'attr', name: m[1], snippet: val, index: m.index })
  }

  // 3) html files: any text nodes between tags
  if (file.endsWith('.html')) {
    const tagTextRe = />([^<>]+)</g
    while ((m = tagTextRe.exec(text))) {
      const content = m[1].trim()
      if (!content) continue
      if (containsUppercaseVisibleText(content)) violations.push({ type: 'html-text', snippet: content, index: m.index })
    }
  }

  return violations
}

function main() {
  const dirsArg = process.argv.find(a => a.startsWith('--dirs='))
  const rawDirs = dirsArg ? dirsArg.replace('--dirs=', '') : ''
  const extraDirs = rawDirs ? rawDirs.split(',').map(s => s.trim()).filter(Boolean).map(d => path.isAbsolute(d) ? d : path.join(ROOT, d)) : []
  const dirs = [...DEFAULT_DIRS, ...extraDirs]

  const files = walkDirs(dirs)
  const allViolations = []
  for (const f of files) {
    const vs = scanFile(f)
    if (vs.length > 0) allViolations.push({ file: f, violations: vs })
  }

  if (allViolations.length > 0) {
    console.error('\nui-lowercase check failed: found uppercase letters in ui text (strict)')
    for (const item of allViolations) {
      console.error(`\nfile: ${path.relative(ROOT, item.file)}`)
      for (const v of item.violations.slice(0, 20)) {
        console.error(`  - [${v.type}] ${v.snippet.replace(/\n/g, ' ')} `)
      }
    }
    console.error('\nplease lowercase visible ui strings and ui attributes (title, placeholder, alt, aria-label, label).')
    process.exit(1)
  }

  console.log('ui-lowercase check: no violations found')
  process.exit(0)
}

if (require.main === module) main()
