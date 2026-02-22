// simple SQL parser with basic subquery support
// intended for lightweight client-side completion and testing

export interface SQLParsed {
  fields: string[];
  from: TableRef;
  joins?: JoinClause[];
  where?: string;
  groupBy?: string;
  having?: string;
  orderBy?: { field: string; dir: 'ASC' | 'DESC' };
  limit?: number;
  union?: SQLParsed[]; // additional SELECTs in a UNION
}

export type TableRef =
  | { name: string; alias?: string }
  | { subquery: SQLParsed; alias?: string };

interface JoinClause {
  table: TableRef;
  on?: string;
}

function splitWhitespace(str: string): string[] {
  return str.trim().split(/\s+/);
}

// utility to extract a balanced parenthesized segment
function takeBalanced(str: string): [string, string] {
  if (!str.startsWith('(')) return ['', str];
  let level = 0;
  let idx = 0;
  for (; idx < str.length; idx++) {
    const ch = str[idx];
    if (ch === '(') level++;
    else if (ch === ')') {
      level--;
      if (level === 0) {
        idx++;
        break;
      }
    }
  }
  return [str.slice(0, idx), str.slice(idx)];
}

export function parseSQL(sql: string): SQLParsed {
  // handle simple UNION by parsing each segment recursively and preserving them
  const uText = sql.toUpperCase();
  if (uText.includes(' UNION ')) {
    const parts = sql.split(/\sUNION\s/i).map(p => p.trim());
    const parsedFirst = parseSQL(parts[0]);
    parsedFirst.union = parts.slice(1).map(p => parseSQL(p));
    return parsedFirst;
  }

  const cleaned = sql.trim().replace(/\s+/g, ' ');
  const upper = cleaned.toUpperCase();
  if (!upper.startsWith('SELECT ')) throw new Error('SQL must start with SELECT');
  const fromIdx = upper.indexOf(' FROM ');
  if (fromIdx === -1) throw new Error('SQL missing FROM');
  const fieldsStr = cleaned.slice(7, fromIdx).trim();
  let after = cleaned.slice(fromIdx + 6).trim();

  const parsed: SQLParsed = { fields: fieldsStr.split(',').map(f => f.trim()), from: { name: '' } };

  // parse FROM clause (table or subquery)
  if (after.startsWith('(')) {
    const [sub, rest] = takeBalanced(after);
    const inner = sub.slice(1, -1);
    const subParsed = parseSQL(inner);
    after = rest.trim();
    // optional alias
    const tokens = splitWhitespace(after);
    let alias: string | undefined;
    if (tokens.length && !['WHERE', 'JOIN', 'GROUP', 'ORDER', 'LIMIT'].includes(tokens[0].toUpperCase())) {
      alias = tokens[0];
      after = after.slice(alias.length).trim();
    }
    parsed.from = { subquery: subParsed, alias };
  } else {
    const tokens = splitWhitespace(after);
    let name = tokens[0];
    let alias: string | undefined;
    if (tokens.length > 1 && !['JOIN', 'WHERE', 'GROUP', 'ORDER', 'LIMIT'].includes(tokens[1].toUpperCase())) {
      alias = tokens[1];
      after = after.slice((name + ' ' + alias).length).trim();
    } else {
      after = after.slice(name.length).trim();
    }
    parsed.from = { name, alias };
  }

  // joins
  const joins: JoinClause[] = [];
  while (true) {
    const m = after.match(/^JOIN\s+/i);
    if (!m) break;
    after = after.slice(m[0].length).trim();
    let tableRef: TableRef;
    if (after.startsWith('(')) {
      const [sub, rest] = takeBalanced(after);
      const subParsed = parseSQL(sub.slice(1, -1));
      after = rest.trim();
      const tokens = splitWhitespace(after);
      let alias: string | undefined;
      if (tokens.length && !tokens[0].toUpperCase().startsWith('ON')) {
        alias = tokens[0];
        after = after.slice(alias.length).trim();
      }
      tableRef = { subquery: subParsed, alias };
    } else {
      const tokens = splitWhitespace(after);
      let name = tokens[0];
      let alias: string | undefined;
      if (tokens.length > 1 && !tokens[1].toUpperCase().startsWith('ON')) {
        alias = tokens[1];
        after = after.slice((name + ' ' + alias).length).trim();
      } else {
        after = after.slice(name.length).trim();
      }
      tableRef = { name, alias };
    }
    // extract ON clause
    let on: string | undefined;
    const onMatch = after.match(/^ON\s+([^]+?)(?=\sJOIN\s|\sWHERE\s|\sGROUP\s|\sORDER\s|\sLIMIT|$)/i);
    if (onMatch) {
      on = onMatch[1].trim();
      after = after.slice(onMatch[0].length).trim();
    }
    joins.push({ table: tableRef, on });
  }
  if (joins.length) parsed.joins = joins;

  // where, groupby, having, orderby, limit as in earlier implementation
  const whereMatch = after.match(/^WHERE\s([^]+?)(?:\sGROUP BY|\sORDER BY|\sLIMIT|$)/i);
  if (whereMatch) {
    parsed.where = whereMatch[1].trim();
    after = after.slice(whereMatch[0].length).trim();
  }
  const groupMatch = after.match(/^GROUP BY\s([\w.]+)/i);
  if (groupMatch) {
    parsed.groupBy = groupMatch[1];
    after = after.slice(groupMatch[0].length).trim();
    const havingMatch = after.match(/^HAVING\s([^]+?)(?:\sORDER BY|\sLIMIT|$)/i);
    if (havingMatch) {
      parsed.having = havingMatch[1].trim();
      after = after.slice(havingMatch[0].length).trim();
    }
  }
  const orderMatch = after.match(/^ORDER BY\s([\w.]+)(?:\s+(ASC|DESC))?/i);
  if (orderMatch) {
    parsed.orderBy = { field: orderMatch[1], dir: (orderMatch[2] as 'ASC' | 'DESC') || 'ASC' };
    after = after.slice(orderMatch[0].length).trim();
  }
  const limitMatch = after.match(/^LIMIT\s(\d+)/i);
  if (limitMatch) {
    parsed.limit = parseInt(limitMatch[1], 10);
    after = after.slice(limitMatch[0].length).trim();
  }

  return parsed;
}
