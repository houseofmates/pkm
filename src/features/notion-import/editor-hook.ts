import { NotionWorkspace } from './parser';

/**
 * mapping for editors to show human‑readable descriptions or completions when
 * dealing with Notion export data.
 */
export const notionTypeMap: Record<string, string> = {
    title: 'string',
    text: 'string',
    rich_text: 'string',
    email: 'string',
    phone_number: 'string',
    url: 'string',
    number: 'number',
    percent: 'number',
    checkbox: 'boolean',
    select: 'string',
    multi_select: 'string[]',
    relation: 'lookup',
    date: 'date',
    files: 'json',
};

/**
 * return suggestions for a given database workspace (collection) that can be
 * used by an editor extension to annotate schema or generate completions.
 */
export function generateSchemaSuggestions(ws: NotionWorkspace) {
    const suggestions: Array<{ collection: string; fields: Record<string, string> }> = [];
    for (const db of ws.databases) {
        const fields: Record<string, string> = {};
        for (const name of db.fields) {
            if (db.props && db.props[name] && db.props[name].type) {
                fields[name] = notionTypeMap[db.props[name].type] || 'string';
            } else {
                fields[name] = 'string';
            }
        }
        suggestions.push({ collection: db.name, fields });
    }
    return suggestions;
}
