#!/usr/bin/env node
// script: lowercase-comments
// purpose: strict-lowercase every comment in selected src folders while preserving
//          content inside backticks and urls. supports dry-run and apply modes.

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TARGET_DIRS = [
  path.join(ROOT, 'src', 'features'),
  path.join(ROOT, 'src', 'lib'),
  path.join(ROOT, 'src', 'components'),
]
const EXT = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs']

function isUrl(tok) {
  return /^(https?:\/\/|mailto:|www\.)/i.test(tok)
}

function protectBackticksAndUrls(text) {
  // split into segments: backtick-delimited, url-like, and the rest
  const parts = []
  let i = 0
  const re = /(`[^`]*`)|(https?:\/\/\S+|www\.\S+|mailto:\S+)/gi
  let m
  let lastIndex = 0
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) parts.push({ type: 'text', val: text.slice(lastIndex, m.index) })
    if (m[1]) parts.push({ type: 'backtick', val: m[1] })
    else parts.push({ type: 'url', val: m[2] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) parts.push({ type: 'text', val: text.slice(lastIndex) })
  return parts
}

function transformCommentContent(raw) {
  // ensure we do not change anything inside backticks or urls
  const parts = protectBackticksAndUrls(raw)
  return parts
    .map((p) => {
      if (p.type === 'text') return p.val.toLowerCase()
      return p.val // preserve backtick and url segments
    })
    .join('')
}

function processFile(filePath, apply) {
  const src = fs.readFileSync(filePath, 'utf8')
  let changed = false
  let newSrc = src

  // process single-line comments (//...) but ignore double-slash in urls inside code
  newSrc = newSrc.replace(/(^\s*\/\/)(.*)$/gm, (full, prefix, rest) => {
    const transformed = transformCommentContent(rest)
    if (transformed !== rest) {
      changed = true
      return prefix + transformed
    }
    return full
  })

  // process block comments /* ... */ including multiline
  newSrc = newSrc.replace(/\/\*[\s\S]*?\*\//g, (block) => {
    // remove start/end and process inner lines preserving leading * on lines
    const inner = block.slice(2, -2)
    const transformedInner = inner
      .split('\n')
      .map((line) => {
        // preserve leading whitespace and optional '*'
        const m = line.match(/^(\s*\*?\s?)([\s\S]*)$/)
        if (!m) return line
        const prefix = m[1]
        const content = m[2]
        const t = transformCommentContent(content)
        if (t !== content) changed = true
        return prefix + t
      })
      .join('\n')
    return '/*' + transformedinner + '*/'
  })

  // process jsx comments {/* ... */}
  newSrc = newSrc.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (wrap) => {
    const inner = wrap.replace(/^\{\s*\/\*/,'').replace(/\*\/\s*\}$/,'')
    const transformedInner = inner
      .split('\n')
      .map((line) => {
        const m = line.match(/^(\s*\*?\s?)([\s\S]*)$/)
        if (!m) return line
        const prefix = m[1]
        const content = m[2]
        const t = transformCommentContent(content)
        if (t !== content) changed = true
        return prefix + t
      })
      .join('\n')
    return '{/*' + transformedinner + '*/}'
  })

  if (changed && apply) {
    fs.writeFileSync(filePath, newSrc, 'utf8')
  }

  // compute number of comment lines changed for reporting (approx)
  const origComments = (src.match(/(^\s*\/\/.*$)|(\/\*[\s\S]*?\*\/)/gm) || []).join('\n')
  const newComments = (newSrc.match(/(^\s*\/\/.*$)|(\/\*[\s\S]*?\*\/)/gm) || []).join('\n')
  let delta = 0
  if (origComments !== newComments) {
    // approximate count of changed lines
    const origLines = origComments.split('\n')
    const newLines = newComments.split('\n')
    delta = Math.max(0, newLines.length - origLines.length)
    // fallback: count differing lines
    let diffCount = 0
    const lim = Math.min(origLines.length, newLines.length)
    for (let i = 0; i < lim; i++) if (origLines[i] !== newLines[i]) diffCount++
    delta = Math.max(delta, diffCount)
  }

  return { file: filePath, changed, delta }
}

function walkTargets() {
  const files = []
  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) continue
    const stack = [dir]
    while (stack.length) {
      const p = stack.pop()
      const entries = fs.readdirSync(p)
      for (const e of entries) {
        const full = path.join(p, e)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) stack.push(full)
        else if (EXT.includes(path.extname(full))) files.push(full)
      }
    }
  }
  return files
}

function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const dry = !apply

  const files = walkTargets()
  const results = []
  for (const f of files) {
    try {
      const r = processFile(f, apply)
      if (r.changed) results.push(r)
    } catch (err) {
      console.error('error processing', f, err.message)
    }
  }

  // sort by delta desc
  results.sort((a,b) => b.delta - a.delta)

  console.log('\nlowercase-comments report:')
  console.log('mode:', dry ? 'dry-run' : 'apply')
  console.log('files changed:', results.length)
  const totalChanges = results.reduce((s, r) => s + Math.max(1, r.delta), 0)
  console.log('approx changed comment-lines:', totalChanges)
  if (results.length > 0) {
    console.log('\ntop changes:')
    for (let i = 0; i < Math.min(40, results.length); i++) {
      const r = results[i]
      console.log(`${path.relative(ROOT, r.file)} -> ${r.delta || 1}`)
    }
  }

  if (dry) console.log('\nno files were modified (dry-run). run with --apply to write changes.')
}

if (require.main === module) main()
