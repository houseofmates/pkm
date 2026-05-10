import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'

const contentDir = join(process.cwd(), 'content')
const backlinksDir = join(process.cwd(), '.vitepress', 'backlinks')

// clear old backlinks
import { rmSync } from 'fs'
rmSync(backlinksDir, { recursive: true, force: true })
import { mkdirSync } from 'fs'
mkdirSync(backlinksDir, { recursive: true })

// scan all md files
const pages = new Map()
const files = scanDir(contentDir)

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const { data, content: body } = matter(content)
  
  const titleSlug = file.replace(contentDir, '').replace(/^\//, '').replace(/\.md$/, '').replace(/\/index$/, '').replace(/\//g, '-')
  pages.set(titleSlug, { path: `/${titleSlug}`, title: data.title || titleSlug, file })

  // extract [[links]]
  const links = [...body.matchAll(/\[\[([^\]]+?)\]\]/g)].map(match => match[1].toLowerCase().trim().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''))
  for (const link of links) {
    if (!pages.has(link)) continue
    const target = pages.get(link)
    if (!target.backlinks) target.backlinks = []
    target.backlinks.push({ from: titleSlug, path: `/${titleSlug}` })
  }
}

// write backlinks json
for (const [slug, page] of pages) {
  writeFileSync(join(backlinksDir, `${slug}.json`), JSON.stringify(page.backlinks || [], null, 2))
}

console.log(`generated backlinks for ${pages.size} pages`)

function scanDir(dir) {
  let results = []
  const list = readdirSync(dir)
  list.forEach(file => {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)
    if (stat.isDirectory() && file !== 'node_modules') {
      results = results.concat(scanDir(fullPath))
    } else if (file.endsWith('.md')) {
      results.push(fullPath)
    }
  })
  return results
}

