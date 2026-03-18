import { defineConfig } from 'vitepress'
import path from 'path'
import fs from 'fs'

// ── build a slug → path map from all .md files ──
const contentDir = path.resolve(__dirname, '..')
const pageMap: Record<string, string> = {}

function scanPages(dir: string, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanPages(full, prefix + entry.name + '/')
    } else if (entry.name.endsWith('.md')) {
      const slug = entry.name.replace(/\.md$/, '')
      const pagePath = prefix + slug // e.g. "philosophy/second-brain"
      // map both the bare slug and the full path
      pageMap[slug] = pagePath
      pageMap[pagePath] = pagePath
    }
  }
}
scanPages(contentDir)

// markdown-it plugin to convert [[wiki links]] into <a> tags
function wikiLinksPlugin(md: any) {
  const wikiLinkRe = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

  const defaultRender = md.renderer.rules.text || function (tokens: any[], idx: number) {
    return tokens[idx].content
  }

  md.renderer.rules.text = function (tokens: any[], idx: number, options: any, env: any, self: any) {
    const content = tokens[idx].content
    if (!content.includes('[[')) {
      return defaultRender(tokens, idx, options, env, self)
    }
    return content.replace(wikiLinkRe, (_match: string, target: string, label?: string) => {
      const display = (label || target).trim()
      const rawSlug = target.trim().toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-/]/g, '')
      // look up the correct path, fall back to the raw slug
      const resolvedPath = pageMap[rawSlug] || rawSlug
      const href = `/pkm/${resolvedPath}.html`
      return `<a href="${href}" class="wiki-link">${md.utils.escapeHtml(display)}</a>`
    })
  }
}

// ── auto-generate sidebar from content directories ──
function buildSidebar() {
  const dirs: Record<string, string[]> = {}

  for (const entry of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const dirPath = path.join(contentDir, entry.name)
    const items: string[] = []
    for (const file of fs.readdirSync(dirPath)) {
      if (file.endsWith('.md')) items.push(file.replace(/\.md$/, ''))
    }
    if (items.length) dirs[entry.name] = items.sort()
  }

  const sidebar: any[] = [
    {
      text: 'welcome',
      items: [
        { text: 'pkm wiki', link: '/' },
        { text: 'vision', link: '/vision' }
      ]
    }
  ]

  for (const [dir, pages] of Object.entries(dirs).sort()) {
    sidebar.push({
      text: dir.replace(/-/g, ' '),
      collapsed: false,
      items: pages.map(p => ({
        text: p.replace(/-/g, ' '),
        link: `/${dir}/${p}`
      }))
    })
  }

  return sidebar
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'pkm wiki',
  description: 'personal knowledge management documentation',
  base: '/pkm/',
  themeConfig: {
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'home', link: '/' },
      { text: 'philosophy', link: '/philosophy/second-brain' },
      { text: 'architecture', link: '/architecture/system-overview' }
    ],
    sidebar: buildSidebar()
  },
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Varela+Round:wght@400;700&display=swap', rel: 'stylesheet' }]
  ],
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    config: (md: any) => {
      wikiLinksPlugin(md)
    }
  }
})

