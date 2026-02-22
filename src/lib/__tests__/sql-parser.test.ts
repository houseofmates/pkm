import { describe, it, expect } from 'vitest';
import { parseSQL, SQLParsed } from '../sql-parser';

describe('SQL parser', () => {
  it('parses simple select', () => {
    const sql = 'SELECT a, b FROM table1';
    const p = parseSQL(sql);
    expect(p.fields).toEqual(['a', 'b']);
    expect((p.from as any).name).toEqual('table1');
  });

  it('handles alias', () => {
    const p = parseSQL('SELECT x FROM users u');
    expect((p.from as any).name).toEqual('users');
    expect((p.from as any).alias).toEqual('u');
  });

  it('supports subquery in FROM', () => {
    const p = parseSQL('SELECT t.col FROM (SELECT col FROM inner) t WHERE t.col>0');
    expect(p.from).toHaveProperty('subquery');
    const sub = (p.from as any).subquery as SQLParsed;
    expect(sub.fields).toEqual(['col']);
    expect((p.from as any).alias).toEqual('t');
  });

  it('parses joins with subquery', () => {
    const p = parseSQL(
      "SELECT * FROM foo JOIN (SELECT id FROM bar) b ON foo.id=b.id"
    );
    expect(p.joins).toBeDefined();
    expect(p.joins![0].table).toHaveProperty('subquery');
  });

  it('handles group by and having', () => {
    const p = parseSQL('SELECT count(*) FROM t GROUP BY cat HAVING count(*)>1');
    expect(p.groupBy).toEqual('cat');
    expect(p.having).toContain('count');
  });
});