import { describe, it, expect } from 'vitest';
import { transformWorkspace } from '../transformer';
import type { NotionWorkspace } from '../parser';

describe('Notion transformer', () => {
    it('generates collections, records, and infers types', async () => {
        const ws: NotionWorkspace = {
            pages: [
                { path: '/foo.md', title: 'T', frontmatter: { a: 1 }, content: 'c' },
            ],
            databases: [
                {
                    name: 'db',
                    fields: ['Name', 'Value', 'Tags', 'Done', 'Long'],
                    rows: [
                        { Name: 'A', Value: 1, Tags: ['x', 'y'], Done: 'true', Long: 'short' },
                        { Name: 'B', Value: 2, Tags: ['z'], Done: 'false', Long: 'l'.repeat(250) },
                    ],
                    props: { Name: { type: 'title' }, Done: { type: 'checkbox' } },
                },
            ],
            assets: [],
        };
        const ins = await transformWorkspace(ws);
        const collections = ins.filter(i => i.type === 'createCollection') as any[];
        const records = ins.filter(i => i.type === 'createRecord');
        expect(collections.map(c => c.name)).toEqual(expect.arrayContaining(['db', 'pages']));
        expect(records.length).toBeGreaterThan(0);
        const dbSchema = collections.find(c => c.name === 'db')!.fields;
        expect(dbSchema.Value).toBe('number');
        expect(dbSchema.Done).toBe('boolean');
        expect(dbSchema.Tags).toBe('string[]');
        expect(dbSchema.Long).toBe('text');
        const pagesDef = collections.find(c => c.name === 'pages')!;
        expect(pagesDef.fields).toHaveProperty('a');
    });

    it('infers relations from Notion relation props and matching values', async () => {
        const ws: NotionWorkspace = {
            pages: [],
            databases: [
                {
                    name: 'Tasks',
                    fields: ['Title', 'Project'],
                    rows: [
                        { Title: 'Task 1', Project: 'Alpha' },
                        { Title: 'Task 2', Project: 'Alpha' },
                        { Title: 'Task 3', Project: 'Beta' },
                    ],
                    props: { Title: { type: 'title' }, Project: { type: 'relation' } },
                },
                {
                    name: 'Projects',
                    fields: ['Name', 'Owner'],
                    rows: [
                        { Name: 'Alpha', Owner: 'Jane' },
                        { Name: 'Beta', Owner: 'John' },
                    ],
                    props: { Name: { type: 'title' } },
                },
            ],
            assets: [],
        };
        const ins = await transformWorkspace(ws);
        const relations = ins.filter(i => i.type === 'addRelation') as any[];
        expect(relations).toHaveLength(1);
        expect(relations[0]).toMatchObject({ collection: 'Tasks', field: 'Project', targetCollection: 'Projects' });
        const taskCollection = (ins.find(i => i.type === 'createCollection' && (i as any).name === 'Tasks') as any);
        expect(taskCollection.fields.Project).toBe('lookup');
    });

    it('gracefully handles empty datasets', async () => {
        const ws: NotionWorkspace = { pages: [], databases: [{ name: 'Empty', fields: [], rows: [], props: {} }], assets: [] };
        const ins = await transformWorkspace(ws);
        expect(ins.filter(i => i.type === 'createCollection').length).toBe(2); // Empty + pages
        expect(ins.filter(i => i.type === 'createRecord').length).toBe(0);
        expect(ins.filter(i => i.type === 'addRelation').length).toBe(0);
    });
});