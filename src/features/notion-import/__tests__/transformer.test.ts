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
                    fields: ['Name', 'Value', 'Tags', 'Done'],
                    rows: [
                        { Name: 'A', Value: 1, Tags: ['x','y'], Done: 'true' },
                        { Name: 'B', Value: 2, Tags: ['z'], Done: 'false' }
                    ],
                    props: { Name: { type: 'title' }, Done: { type: 'checkbox' } }
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
        // verify pages collection schema includes our frontmatter field 'a'
        const pagesDef = ins.find(i=>i.type==='createCollection' && (i as any).name==='pages') as any;
        expect(pagesDef.fields).toHaveProperty('a');
    });
});