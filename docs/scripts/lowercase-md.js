import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'

const contentDir = join(process.cwd(), 'content')

function scanAndFix(dir) {
  const files = readdirSync(dir)
  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      scanAndFix(fullPath)
    } else if (file.endsWith('.md')) {
      const content = readFileSync(fullPath, 'utf8')
      const lines = content.split('\n')
      let changed = false
      const newLines = lines.map(line => {
        // fix ui text like buttons, labels (not code blocks)
        if (line.match(/^[-*]/) || line.includes('```')) return line
        const fixed = line.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
        if (fixed !== line) changed = true
        return fixed
      })
      if (changed) {
        writeFileSync(fullPath, newLines.join('\n'))
        console.log(`fixed ${fullPath}`)
      }
    }
  }
}

scanAndFix(contentDir)
console.log('lowercase lint complete')

