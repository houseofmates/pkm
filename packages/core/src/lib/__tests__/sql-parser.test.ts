import { describe, it, expect } from 'vitest';
import { parseSQL, SQLParsed } from '../sql-parser';

describe('SQL parser', () => {
  it('parses simple select', () => {
    const sql = 'SELECT a, b FROM table1';
    const p = parseSQL(sql);
    expect(p.fields).toEqual(['a', 'b']);
    expect((p.from as any).name).toEqual('table1');
  });

  it('supports IN expressions in WHERE', () => {
    const p = parseSQL('SELECT * FROM users WHERE id IN (1,2,3)');
    expect(p.where).toContain('IN');
  });

  it('handles UNION queries by returning first part and listing others', () => {
    const p = parseSQL('SELECT id FROM t UNION SELECT id FROM u');
    expect((p.from as any).name).toEqual('t');
    expect(p.union).toHaveLength(1);
    expect((p.union![0].from as any).name).toEqual('u');
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