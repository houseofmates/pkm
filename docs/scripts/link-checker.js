import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const contentDir = join(process.cwd(), 'content')
const files = readdirSync(contentDir, { recursive: true }).filter(f => f.endsWith('.md'))

const pages = new Set()
const brokenLinks = []

for (const file of files) {
  const fullPath = join(contentDir, file)
  const content = readFileSync(fullPath, 'utf8')
  const links = [...content.matchAll(/\[\[([^\]]+)\]\]/g)]
  
  const slug = file.replace(/^\//, '').replace(/\.md$/, '').replace(/\/index$/, '').replace(/\//g, '-')
  pages.add(slug)
  
  for (const [, link] of links) {
    const linkSlug = link.toLowerCase().trim().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
    if (!pages.has(linkSlug)) {
      brokenLinks.push({ file, link, resolved: linkSlug })
    }
  }
}

if (brokenLinks.length) {
  console.error('broken wiki links:')
  brokenLinks.forEach(({ file, link, resolved }) => {
    console.error(`  ${file}: [[${link}]] → ${resolved} (missing)`)
  })
  process.exit(1)
}

console.log('all wiki links valid')

