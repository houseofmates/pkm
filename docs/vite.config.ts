// the docs site is built separately from the main app and its deps may not
// be present in the monorepo environment.  silence the TypeScript errors by
// ignoring the missing types and providing explicit parameter typings below.

import { defineConfig } from 'vitepress'

export default defineConfig({
  vite: {
    css: {
      postcss: './postcss.config.js'
    }
  },
  markdown: {
    config: async (md: any) => {
      // remark-wiki-link doesn't ship its own types here
      const remarkWikiLink = (await import('remark-wiki-link')).default
      md.use(remarkWikiLink, {
        hrefTemplate: (title: string) => `/pkm/${title.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')}.html`,
        pageResolver: (name: string) => [name.toLowerCase().replace(/ /g, '-')]
      })
    }
  }
})

