import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'papaparse';
import yaml from 'js-yaml';

export interface NotionPage {
    /** filesystem path to the markdown file */
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

export interface NotionWorkspace {
    pages: NotionPage[];
    databases: NotionDatabase[];
    assets: string[]; // list of file paths under assets folder
}

/**
 * Walk a directory recursively and collect file paths matching predicate.
 */
async function walk(dir: string, predicate: (f: string) => boolean): Promise<string[]> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            results.push(...await walk(full, predicate));
        } else if (ent.isFile() && predicate(full)) {
            results.push(full);
        }
    }
    return results;
}

async function parseMarkdownFile(filePath: string): Promise<NotionPage> {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
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
    const title = frontmatter.title || path.basename(filePath).replace(/\.md$/, '');
    return { path: filePath, title, frontmatter, content };
}

export async function parseNotionExport(root: string): Promise<NotionWorkspace> {
    const pages: NotionPage[] = [];
    const databases: NotionDatabase[] = [];
    const assets: string[] = [];

    // find markdown pages (.md)
    const mdFiles = await walk(root, f => f.toLowerCase().endsWith('.md'));
    for (const md of mdFiles) {
        try {
            pages.push(await parseMarkdownFile(md));
        } catch (err) {
            console.error(`failed to parse markdown ${md}:`, err);
        }
    }

    // find CSV files (databases) and any accompanying JSON metadata
    const csvFiles = await walk(root, f => f.toLowerCase().endsWith('.csv'));
    for (const csv of csvFiles) {
        const name = path.basename(csv, '.csv');
        const rows: Record<string, any>[] = [];
        const content = await fs.promises.readFile(csv, 'utf-8');
        csvParse(content, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            transformHeader: h => h.trim(),
            complete: (res) => {
                if (res.errors.length) {
                    console.warn(`warnings parsing CSV ${csv}:`, res.errors);
                }
                rows.push(...(res.data as any[]));
            }
        });
        const fields = rows.length > 0 ? Object.keys(rows[0]) : [];

        // try to load metadata JSON with same basename (e.g. db.json)
        let props: Record<string, any> | undefined;
        const jsonPath = path.join(path.dirname(csv), `${name}.json`);
        if (fs.existsSync(jsonPath)) {
            try {
                const raw = await fs.promises.readFile(jsonPath, 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed && parsed.properties) props = parsed.properties;
            } catch (e) {
                console.warn(`failed to parse metadata for ${name}:`, e);
            }
        }

        databases.push({ name, rows, fields, props });
    }

    // collect assets directory if present
    const assetsDir = path.join(root, 'assets');
    if (fs.existsSync(assetsDir)) {
        const assetFiles = await walk(assetsDir, _ => true);
        assets.push(...assetFiles.map(f => path.relative(root, f)));
    }

    return { pages, databases, assets };
}
