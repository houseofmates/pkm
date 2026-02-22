import { NotionWorkspace, NotionDatabase, NotionPage } from './parser';

// instructions that can later be executed against nocobase
export type Instruction =
    | { type: 'createCollection'; name: string; fields: Record<string, string> }
    | { type: 'createRecord'; collection: string; data: Record<string, any> }
    | { type: 'addRelation'; collection: string; field: string; targetCollection: string };

// naive guess of field types based on sample values. expand as needed.
function guessType(values: any[]): string {
    // if every value is a number, treat as 'number'; if boolean -> 'boolean'; else 'string'
    let hasString = false;
    let hasNumber = false;
    let hasBoolean = false;
    for (const v of values) {
        if (v == null || v === '') continue;
        if (typeof v === 'number') {
            hasNumber = true;
        } else if (typeof v === 'boolean') {
            hasBoolean = true;
        } else if (typeof v === 'string') {
            const maybeNum = Number(v);
            if (!isNaN(maybeNum) && v.trim() !== '') {
                hasNumber = true;
            } else if (v === 'true' || v === 'false') {
                hasBoolean = true;
            } else {
                hasString = true;
            }
        } else {
            hasString = true;
        }
    }
    if (hasString || (hasString && hasNumber)) return 'string';
    if (hasBoolean && !hasString && !hasNumber) return 'boolean';
    if (hasNumber && !hasString) return 'number';
    return 'string';
}

export function transformWorkspace(ws: NotionWorkspace): Instruction[] {
    const instructions: Instruction[] = [];

    // databases -> collection + createRecords
    for (const db of ws.databases) {
        // build field definitions
        const sampleRows = db.rows.slice(0, 20);
        const fields: Record<string, string> = {};
        for (const field of db.fields) {
            const colValues = sampleRows.map(r => r[field]);
            fields[field] = guessType(colValues);
        }
        instructions.push({ type: 'createCollection', name: db.name, fields });
        for (const row of db.rows) {
            instructions.push({ type: 'createRecord', collection: db.name, data: row });
        }
    }

    // pages -> pages collection
    instructions.push({ type: 'createCollection', name: 'pages', fields: { title: 'string', body: 'string' } });
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
