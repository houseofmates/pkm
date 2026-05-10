import { describe, it, expect } from 'vitest';
import { notionTypeMap, generateSchemaSuggestions } from '../editor-hook';
import { NotionWorkspace } from '../parser';

describe('notion editor hook', () => {
    it('exposes a mapping and can generate simple suggestions', () => {
        expect(notionTypeMap['number']).toBe('number');
        const ws: NotionWorkspace = {
            pages: [],
            databases: [
                {
                    name: 'db',
                    fields: ['A', 'B'],
                    rows: [],
                    props: { A: { type: 'number' }, B: { type: 'checkbox' } }
                }
            ],
            assets: []
        };
        const sug = generateSchemaSuggestions(ws);
        expect(sug.length).toBe(1);
        expect(sug[0].fields.A).toBe('number');
        expect(sug[0].fields.B).toBe('boolean');
    });
});