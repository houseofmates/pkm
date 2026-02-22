import { NotionWorkspace, NotionDatabase, NotionPage } from './parser';

// instructions that can later be executed against nocobase
export type Instruction =
    | { type: 'createCollection'; name: string; fields: Record<string, string> }
    | { type: 'createRecord'; collection: string; data: Record<string, any> }
    | { type: 'addRelation'; collection: string; field: string; targetCollection: string };

// enhanced guessing of field types based on sample values
function guessType(values: any[]): string {
    let hasString = false;
    let hasNumber = false;
    let hasBoolean = false;
    let hasDate = false;
    let hasArray = false;
    let hasLongText = false;
    for (const v of values) {
        if (v == null || v === '') continue;
        if (Array.isArray(v)) {
            hasArray = true;
            continue;
        }
        if (typeof v === 'number') {
            hasNumber = true;
        } else if (typeof v === 'boolean') {
            hasBoolean = true;
        } else if (typeof v === 'string') {
            const trimmed = v.trim();
            // treat any string containing newlines or markdown-like syntax as long text
            if (trimmed.includes('\n') || /[#*_`\-]{2,}/.test(trimmed) || trimmed.length > 200) {
                hasLongText = true;
                hasString = true; // still count as string for fallback
                continue;
            }
            const maybeNum = Number(trimmed);
            if (!isNaN(maybeNum) && trimmed !== '') {
                hasNumber = true;
            } else if (trimmed === 'true' || trimmed === 'false') {
                hasBoolean = true;
            } else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                // simple ISO date detection
                hasDate = true;
            } else if (trimmed.includes(',') || trimmed.startsWith('[')) {
                hasArray = true;
            } else {
                hasString = true;
            }
        } else {
            hasString = true;
        }
    }
    if (hasArray) return 'string[]';
    if (hasDate && !hasString) return 'date';
    if (hasLongText) return 'text';
    if (hasString) return 'string';
    if (hasBoolean) return 'boolean';
    if (hasNumber) return 'number';
    return 'string';
}

// convert Notion property type (from metadata) into a nocobase field type
function notionPropertyToType(type: string): string {
    switch (type.toLowerCase()) {
        case 'title':
            return 'string';
        case 'text':
        case 'rich_text':
            return 'text'; // long text/textarea in nocobase
        case 'email':
        case 'phone_number':
        case 'url':
            return 'string';
        case 'number':
        case 'percent':
            return 'number';
        case 'checkbox':
            return 'boolean';
        case 'select':
        case 'multi_select':
            return 'string';
        case 'relation':
            return 'lookup';
        case 'date':
            return 'date';
        case 'files':
            return 'json';
        default:
            return 'string';
    }
}

export function transformWorkspace(ws: NotionWorkspace): Instruction[] {
    const instructions: Instruction[] = [];

    // databases -> collection + createRecords
    for (const db of ws.databases) {
        // build field definitions (try to respect Notion props if available)
        const sampleRows = db.rows.slice(0, 20);
        const fields: Record<string, string> = {};
        for (const field of db.fields) {
            let ftype: string;
            if (db.props && db.props[field] && db.props[field].type) {
                ftype = notionPropertyToType(db.props[field].type);
            } else {
                const colValues = sampleRows.map(r => r[field]);
                ftype = guessType(colValues);
            }
            fields[field] = ftype;
        }
        instructions.push({ type: 'createCollection', name: db.name, fields });
        for (const row of db.rows) {
            const data = { ...row };
            // if fields include lookup placeholders, we might need relation handling later
            instructions.push({ type: 'createRecord', collection: db.name, data });
        }
    }

    // pages -> pages collection (body should be long text)
    instructions.push({ type: 'createCollection', name: 'pages', fields: { title: 'string', body: 'text' } });
    for (const page of ws.pages) {
        const data: Record<string, any> = {
            title: page.title,
            body: page.content,
            ...page.frontmatter,
        };
        instructions.push({ type: 'createRecord', collection: 'pages', data });
    }

    // TODO: handle relations / lookup fields in the future by analyzing values

    return instructions;
}
