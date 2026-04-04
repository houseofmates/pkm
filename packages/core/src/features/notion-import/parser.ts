import { parse as csvParse } from 'papaparse';
import yaml from 'js-yaml';
import { secureLogger } from '@/lib/secure-logger';

/**
 * Interface for a file-like object that can be read as a stream or text.
 * This allows the parser to work with both Node.js filesystem and Web File/Blob APIs.
 */
export interface NotionSource {
    name: string;
    getPath(): string;
    getText(): Promise<string>;
    getStream(): ReadableStream<Uint8Array> | NodeJS.ReadableStream;
}

export interface NotionPage {
    /** filesystem path or identifier for the markdown file */
    path: string;
    title: string;
    frontmatter: Record<string, any>;
    content: string;
}

export interface NotionDatabase {
    /** filename of the CSV (without extension) */
    name: string;
    rows: Record<string, any>[];
    fields: string[];
    /** optional Notion property metadata (if export includes JSON) */
    props?: Record<string, any>;
}

const IMPORT_DEBUG = typeof process !== 'undefined' && process.env.NOTION_IMPORT_DEBUG === 'true';

export interface NotionWorkspace {
    pages: NotionPage[];
    databases: NotionDatabase[];
    assets: string[]; // list of file paths under assets folder
}

/**
 * Node.js implementation of NotionSource using the filesystem.
 */
export class NodeFsSource implements NotionSource {
    constructor(private filePath: string, private rootRelativePath: string = filePath) { }
    get name() { return this.filePath; }
    getPath() { return this.rootRelativePath; }
    async getText() {
        const fs = await import('fs');
        return fs.promises.readFile(this.filePath, 'utf-8');
    }
    getStream() {
        const fs = require('fs');
        return fs.createReadStream(this.filePath);
    }
}

async function parseMarkdownSource(source: NotionSource): Promise<NotionPage> {
    const raw = await source.getText();
    let frontmatter: Record<string, any> = {};
    let content = raw;
    if (raw.startsWith('---')) {
        const end = raw.indexOf('---', 3);
        if (end !== -1) {
            const fm = raw.slice(3, end);
            try {
                frontmatter = yaml.load(fm) as any || {};
            } catch {
                frontmatter = {};
            }
            content = raw.slice(end + 3).trimStart();
        }
    }
    const title = frontmatter.title || source.name.split(/[\\/]/).pop()?.replace(/\.md$/, '') || '';
    return { path: source.getPath(), title, frontmatter, content };
}

/**
 * Parses a Notion export. Accept sources instead of a root path to support streaming/Web APIs.
 */
export async function parseNotionExport(sources: NotionSource[]): Promise<NotionWorkspace> {
    const pages: NotionPage[] = [];
    const databases: NotionDatabase[] = [];
    const assets: string[] = [];

    for (const source of sources) {
        const lowerName = source.name.toLowerCase();

        if (lowerName.endsWith('.md')) {
            try {
                pages.push(await parseMarkdownSource(source));
            } catch (err) {
                secureLogger.error(`failed to parse markdown ${source.name}:`, err);
            }
        } else if (lowerName.endsWith('.csv')) {
            const name = source.name.split(/[\\/]/).pop()?.replace(/\.csv$/, '') || 'database';
            const rows: Record<string, any>[] = [];

            await new Promise<void>((resolve, reject) => {
                csvParse(source.getStream() as any, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    chunkSize: 1024 * 128, // process in 128KB chunks
                    transformHeader: h => h.trim(),
                    chunk: (results) => {
                        rows.push(...(results.data as any[]));
                    },
                    complete: () => resolve(),
                    error: (error) => reject(error)
                });
            });

            const fields = rows.length > 0 ? Object.keys(rows[0]) : [];

            // try to find matching metadata JSON among sources
            let props: Record<string, any> | undefined;
            const jsonName = source.name.replace(/\.csv$/, '.json');
            const jsonSource = sources.find(s => s.name === jsonName);
            if (jsonSource) {
                try {
                    const raw = await jsonSource.getText();
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.properties) props = parsed.properties;
                } catch (e) {
                    if (IMPORT_DEBUG) secureLogger.warn(`failed to parse metadata for ${name}:`, e);
                }
            }

            databases.push({ name, rows, fields, props });
        } else if (source.getPath().split(/[\\/]/).includes('assets')) {
            assets.push(source.getPath());
        }
    }

    return { pages, databases, assets };
}

