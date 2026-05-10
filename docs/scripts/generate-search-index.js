import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import FlexSearch from 'flexsearch'

const contentDir = join(process.cwd(), 'content')
const indexFile = join(process.cwd(), '.vitepress', 'search-index.json')

const index = new FlexSearch.Index({
  tokenize: 'forward',
  language: 'en',
  cache: false
})

function scanDir(dir) {
  const results = []
  const list = readdirSync(dir)
  list.forEach(file => {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results.push(...scanDir(fullPath))
    } else if (file.endsWith('.md')) {
      results.push(fullPath)
    }
  })
  return results
}

const files = scanDir(contentDir)

for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const content = readFileSync(file, 'utf8')
  const slug = file.replace(contentDir, '').replace(/^\//, '').replace(/\.md$/, '').replace(/\/index$/, '').replace(/\//g, '-')
  
  // extract title, headings, content
  const titleMatch = content.match(/^# (.+)$/m)
  const title = titleMatch ? titleMatch[1] : slug
  
  const headings = [...content.matchAll(/^##? (.+)$/gm)].map(m => m[1])
  
  index.add(i, [title, ...headings, content].join(' ').substring(0, 10000))
  
  console.log(`indexed ${slug} (${i+1}/${files.length})`)
}

const searchIndex = {
  index: index.export(),
  documents: files.map((file, id) => ({
    id,
    slug: file.replace(contentDir, '').replace(/^\//, '').replace(/\.md$/, '').replace(/\/index$/, '').replace(/\//g, '-'),
    path: `/${file.replace(contentDir, '').replace(/^\//, '').replace(/\.md$/, '')}`
  }))
}

writeFileSync(indexFile, JSON.stringify(searchIndex))
console.log(`search index written (${Object.keys(searchIndex.documents).length} pages)`)
