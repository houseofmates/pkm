import { describe, it, expect } from 'vitest';
import { inferRelations, type Dataset } from '@/backend/relation-inference';

describe('relation inference', () => {
  it('infers relations only when uniqueness and score thresholds are met', () => {
    const dbs: Dataset[] = [
      {
        name: 'Tasks',
        fields: ['Title', 'Project'],
        rows: [
          { Title: 'T1', Project: 'Alpha' },
          { Title: 'T2', Project: 'Alpha' },
          { Title: 'T3', Project: 'Beta' },
        ],
        fieldTypes: { Title: 'string', Project: 'string' },
      },
      {
        name: 'Projects',
        fields: ['Name'],
        rows: [
          { Name: 'Alpha' },
          { Name: 'Beta' },
          { Name: 'Gamma' },
        ],
        fieldTypes: { Name: 'string' },
      },
    ];

    const result = inferRelations(dbs);
    const tasks = result.find(d => d.name === 'Tasks');
    expect(tasks?.relations).toEqual([{ field: 'Project', target: 'Projects' }]);
    expect(tasks?.fieldTypes.Project).toBe('lookup');
  });

  it('ignores low-signal relations when uniqueness is poor', () => {
    const dbs: Dataset[] = [
      {
        name: 'Orders',
        fields: ['Customer'],
        rows: Array.from({ length: 20 }).map((_, i) => ({ Customer: `cust-${i % 2}` })),
        fieldTypes: { Customer: 'string' },
      },
      {
        name: 'Customers',
        fields: ['Name'],
        rows: Array.from({ length: 5 }).map((_, i) => ({ Name: `cust-${i % 2}` })),
        fieldTypes: { Name: 'string' },
      },
    ];

    const result = inferRelations(dbs);
    const orders = result.find(d => d.name === 'Orders');
    expect(orders?.relations).toBeUndefined();
  });
});
