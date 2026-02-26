import type { NotionWorkspace, NotionDatabase } from './parser';

// instructions that can later be executed against nocobase
export type Instruction =
    | { type: 'createCollection'; name: string; fields: Record<string, string> }
    | { type: 'createRecord'; collection: string; data: Record<string, any> }
    | { type: 'addRelation'; collection: string; field: string; targetCollection: string };

const REL_MIN_MATCHES = 2;
const REL_MIN_SCORE = 0.5;
const REL_SAMPLE_SIZE = 120; // cap value comparisons for performance
const REL_KEY_UNIQUENESS_MIN = 0.6; // require keys to be reasonably unique

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

    // helper to pick the likely title/key field of a database
    const pickKeyField = (db: NotionDatabase, fieldTypes: Record<string, string>) => {
        const preferred = db.fields.find(f => /^(name|title)$/i.test(f));
        if (preferred) return preferred;
        const firstString = db.fields.find(f => fieldTypes[f] === 'string' || fieldTypes[f] === 'text');
        return firstString || db.fields[0];
    };

    // infer a relation target by matching values to candidate key fields in other databases
    const inferRelationTarget = (
        fieldValues: any[],
        currentDb: string,
        dbFieldTypes: Record<string, Record<string, string>>,
    ): string | undefined => {
        const flattened = fieldValues.flatMap(v => (Array.isArray(v) ? v : [v]))
            .filter(v => v != null && v !== '')
            .map(v => String(v).trim().toLowerCase())
            .filter(v => v.length > 0)
            .slice(0, REL_SAMPLE_SIZE);
        if (flattened.length === 0) return undefined;

        let best: { target?: string; score: number } = { score: 0 };
        for (const db of ws.databases) {
            if (db.name === currentDb) continue;
            const fieldTypes = dbFieldTypes[db.name] || {};
            const keyField = pickKeyField(db, fieldTypes);
            if (!keyField) continue;
            const keyValues = db.rows
                .map(r => r[keyField])
                .filter(v => v != null && v !== '')
                .map(v => String(v).trim().toLowerCase())
                .slice(0, REL_SAMPLE_SIZE);
            if (keyValues.length === 0) continue;
            const keySet = new Set(keyValues);
            const uniqueness = keySet.size / keyValues.length;
            if (uniqueness < REL_KEY_UNIQUENESS_MIN) continue;
            const matches = flattened.filter(v => keySet.has(v)).length;
            const score = matches / flattened.length;
            if (matches >= REL_MIN_MATCHES && score >= REL_MIN_SCORE && score > best.score) {
                best = { target: db.name, score };
            }
        }
        return best.target;
    };

    // cache field type guesses per database for reuse during relation inference
    const dbFieldTypes: Record<string, Record<string, string>> = {};

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
        dbFieldTypes[db.name] = fields;
        instructions.push({ type: 'createCollection', name: db.name, fields });
        for (const row of db.rows) {
            const data = { ...row };
            // if fields include lookup placeholders, we might need relation handling later
            instructions.push({ type: 'createRecord', collection: db.name, data });
        }
    }

    // pages -> pages collection (body should be long text)
    // also include any frontmatter keys as fields, guessing their type
    const pageFields: Record<string, string> = { title: 'string', body: 'text' };
    for (const page of ws.pages) {
        for (const key of Object.keys(page.frontmatter)) {
            if (!(key in pageFields)) {
                pageFields[key] = guessType([page.frontmatter[key]]);
            }
        }
    }
    instructions.push({ type: 'createCollection', name: 'pages', fields: pageFields });
    for (const page of ws.pages) {
        const data: Record<string, any> = {
            title: page.title,
            body: page.content,
            ...page.frontmatter,
        };
        instructions.push({ type: 'createRecord', collection: 'pages', data });
    }

    // infer and register relations based on Notion metadata or cross-dataset value matching
    for (const db of ws.databases) {
        const fieldTypes = dbFieldTypes[db.name] || {};
        for (const field of db.fields) {
            const propType = db.props?.[field]?.type;
            const looksLikeRelation = propType === 'relation' || fieldTypes[field] === 'lookup';
            if (!looksLikeRelation) continue;
            const target = inferRelationTarget(db.rows.map(r => r[field]), db.name, dbFieldTypes);
            if (target) {
                instructions.push({
                    type: 'addRelation',
                    collection: db.name,
                    field,
                    targetCollection: target,
                });
                // make sure schema reflects lookup type
                dbFieldTypes[db.name][field] = 'lookup';
            }
        }
    }

    return instructions;
}
