// use-semantic-search.ts
// offline-capable semantic search hook
// uses backend lancedb when available, falls back to
// client-side cosine similarity against cached embeddings

import { useState, useCallback } from 'react'
import usePkmStore from '@/store/usePkmStore'

const api_base = (import.meta.env.VITE_PKM_API_URL as string) || 'http://localhost:4110'
const ollama_base = 'http://localhost:11434'

// in-memory embedding cache (survives for session)
const embeddingcache = new Map<string, number[]>()

async function getlocalembedding(text: string): Promise<number[]> {
    const key = text.toLowerCase().trim()
    if (embeddingcache.has(key)) return embeddingcache.get(key)!

    const res = await fetch(`${ollama_base}/api/embed`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'nomic-embed-text', input: key }),
    })
    if (!res.ok) throw new Error(`embedding failed: ${res.status}`)
    const json = await res.json()
    const vec = json.embeddings?.[0] || json.embedding || []
    embeddingcache.set(key, vec)
    return vec
}

function cosinesimilarity(a: number[], b: number[]): number {
    let dot = 0
    let norma = 0
    let normb = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        norma += a[i] * a[i]
        normb += b[i] * b[i]
    }
    return dot / (Math.sqrt(norma) * Math.sqrt(normb) || 1)
}

export interface Semanticsearchresult {
    id: string
    score: number
    [k: string]: unknown
}

export function useSemanticSearch() {
    const [results, setresults] = useState<Semanticsearchresult[]>([])
    const [loading, setloading] = useState(false)
    const [source, setsource] = useState<'backend' | 'local' | null>(null)
    const setsearchresults = usePkmStore((s: { setSearchResults: (r: any[]) => void }) => s.setSearchResults)

    const search = useCallback(
        async (query: string, topk = 10) => {
            if (!query.trim()) return []
            setloading(true)
            setsource(null)

            try {
                // try backend first (lancedb + ollama)
                const res = await fetch(`${api_base}/search`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ q: query, topK: topk }),
                    signal: AbortSignal.timeout(3000),
                })

                if (res.ok) {
                    const json = await res.json()
                    setresults(json.results)
                    setsearchresults(json.results)
                    setsource('backend')
                    return json.results
                }
            } catch {
                console.warn('backend search unreachable, falling back to local')
            }

            // fallback: local cosine similarity against cached embeddings
            try {
                const queryvec = await getlocalembedding(query)
                const scored: { key: string; score: number }[] = []

                for (const [key, vec] of embeddingcache.entries()) {
                    if (key === query.toLowerCase().trim()) continue
                    scored.push({ key, score: cosinesimilarity(queryvec, vec) })
                }

                scored.sort((a, b) => b.score - a.score)
                const hits = scored.slice(0, topk).map((s) => ({ id: s.key, score: s.score }))
                setresults(hits)
                setsearchresults(hits)
                setsource('local')
                return hits
            } catch (err) {
                console.error('local search also failed', err)
                setresults([])
                return []
            } finally {
                setloading(false)
            }
        },
        [setsearchresults]
    )

    return { search, results, loading, source }
}