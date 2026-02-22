import { describe, it, expect } from 'vitest';
import { transformWorkspace, Instruction } from '../transformer';
import { NotionWorkspace } from '../parser';

describe('Notion transformer', () => {
    it('should generate createCollection and createRecord instructions', () => {
        const ws: NotionWorkspace = {
            pages: [
                { path: '/foo.md', title: 'T', frontmatter: { a: 1 }, content: 'c' }
            ],
            databases: [
                {
                    name: 'db',
                    fields: ['Name', 'Value'],
                    rows: [ { Name: 'A', Value: 1 }, { Name: 'B', Value: 2 } ]
                }
            ],
            assets: []
        };
        const ins = transformWorkspace(ws);
        // expect a collection for db, pages
        const types = ins.map(i => i.type);
        expect(types).toContain('createCollection');
        expect(types).toContain('createRecord');
        // check that pages collection exists
        const colNames = ins.filter(i=>i.type==='createCollection').map(i=>(i as any).name);
        expect(colNames).toEqual(expect.arrayContaining(['db','pages']));
    });
});