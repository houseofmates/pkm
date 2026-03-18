export interface MarkdownLink {
  type: 'wiki' | 'markdown' | 'url';
  target: string;
  text: string;
  line: number;
}

export interface ParsedMarkdown {
  frontmatter: Record<string, string | string[]>;
  title: string;
  content: string;
  plainText: string;
  links: MarkdownLink[];
  tags: string[];
  wordCount: number;
}

// ── frontmatter ──────────────────────────────────────────────

function parseFrontmatter(raw: string): { frontmatter: Record<string, string | string[]>; body: string } {
  const frontmatter: Record<string, string | string[]> = {};

  if (!raw.startsWith('---')) {
    return { frontmatter, body: raw };
  }

  const endIdx = raw.indexOf('\n---', 3);
  if (endIdx === -1) {
    return { frontmatter, body: raw };
  }

  const yamlBlock = raw.slice(4, endIdx);
  const body = raw.slice(endIdx + 4).trimStart();

  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // inline yaml arrays: [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    } else {
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

// ── link extraction ──────────────────────────────────────────

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;
const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const BARE_URL_RE = /(?<!\()https?:\/\/[^\s)>\]]+/g;

function extractLinks(content: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    let m: RegExpExecArray | null;

    WIKI_LINK_RE.lastIndex = 0;
    while ((m = WIKI_LINK_RE.exec(line)) !== null) {
      links.push({ type: 'wiki', target: m[1].trim(), text: (m[2] || m[1]).trim(), line: lineNum });
    }

    MD_LINK_RE.lastIndex = 0;
    while ((m = MD_LINK_RE.exec(line)) !== null) {
      // skip images
      if (line[m.index - 1] === '!') continue;
      links.push({ type: 'markdown', target: m[2].trim(), text: m[1].trim(), line: lineNum });
    }

    BARE_URL_RE.lastIndex = 0;
    while ((m = BARE_URL_RE.exec(line)) !== null) {
      links.push({ type: 'url', target: m[0], text: m[0], line: lineNum });
    }
  }

  return links;
}

// ── plain text extraction ────────────────────────────────────

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')          // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // bold
    .replace(/\*([^*]+)\*/g, '$1')         // italic
    .replace(/__([^_]+)__/g, '$1')         // bold alt
    .replace(/_([^_]+)_/g, '$1')           // italic alt
    .replace(/~~([^~]+)~~/g, '$1')         // strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, '')    // code
    .replace(/^\s*[-*+]\s+/gm, '')         // list markers
    .replace(/^\s*\d+\.\s+/gm, '')         // ordered list markers
    .replace(/^\s*>\s?/gm, '')             // blockquotes
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1') // md links → text
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_m, target, alias) => alias || target) // wiki links
    .replace(/!\[.*?\]\(.*?\)/g, '')       // images
    .replace(/---+/g, '')                  // horizontal rules
    .replace(/\n{3,}/g, '\n\n')            // excessive newlines
    .trim();
}

// ── main parser ──────────────────────────────────────────────

export function parseMarkdownFile(raw: string, filePath: string): ParsedMarkdown {
  const { frontmatter, body } = parseFrontmatter(raw);

  // extract title: prefer frontmatter, then first h1, then filename
  let title = '';
  if (typeof frontmatter.title === 'string' && frontmatter.title) {
    title = frontmatter.title;
  } else {
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    } else {
      const basename = filePath.split('/').pop() || filePath;
      title = basename.replace(/\.md$/i, '');
    }
  }

  // extract tags from frontmatter
  let tags: string[] = [];
  if (Array.isArray(frontmatter.tags)) {
    tags = frontmatter.tags.map(t => String(t).trim().toLowerCase());
  } else if (typeof frontmatter.tags === 'string') {
    tags = frontmatter.tags.split(',').map(t => t.trim().toLowerCase());
  }

  // also pick up inline #hashtags from body
  const hashtagRe = /(?:^|\s)#([a-z0-9_-]+)/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hashtagRe.exec(body)) !== null) {
    const tag = hm[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }

  const links = extractLinks(body);
  const plainText = stripMarkdown(body);
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return {
    frontmatter,
    title: title.toLowerCase(),
    content: body,
    plainText,
    links,
    tags,
    wordCount,
  };
}
