export const REL_MIN_MATCHES = 2;
export const REL_MIN_SCORE = 0.5;
export const REL_SAMPLE_SIZE = 120;
export const REL_KEY_UNIQUENESS_MIN = 0.6;

export type Dataset = {
  name: string;
  rows: Record<string, any>[];
  fields: string[];
  fieldTypes: Record<string, string>;
  relations?: Array<{ field: string; target: string }>;
};

export function pickKeyField(db: Dataset) {
  const preferred = db.fields.find(f => /^(name|title)$/i.test(f));
  if (preferred) return preferred;
  const firstString = db.fields.find(f => db.fieldTypes[f] === 'string' || db.fieldTypes[f] === 'text');
  return firstString || db.fields[0];
}

export function inferRelations(dbs: Dataset[]) {
  for (const db of dbs) {
    const relations: Array<{ field: string; target: string }> = [];
    for (const field of db.fields) {
      const maybeLookup = db.fieldTypes[field] === 'lookup' || db.fieldTypes[field] === 'string';
      if (!maybeLookup) continue;
      const values = db.rows
        .map(r => r[field])
        .flatMap(v => (Array.isArray(v) ? v : [v]))
        .filter(v => v != null && v !== '')
        .map(v => String(v).trim().toLowerCase())
        .filter(v => v.length > 0)
        .slice(0, REL_SAMPLE_SIZE);
      if (!values.length) continue;

      let best: { target?: string; score: number } = { score: 0 };
      for (const other of dbs) {
        if (other.name === db.name) continue;
        const key = pickKeyField(other);
        if (!key) continue;
        const keyValues = other.rows
          .map(r => r[key])
          .filter(v => v != null && v !== '')
          .map(v => String(v).trim().toLowerCase())
          .filter(v => v.length > 0)
          .slice(0, REL_SAMPLE_SIZE);
        if (!keyValues.length) continue;
        const keySet = new Set(keyValues);
        const uniqueness = keySet.size / keyValues.length;
        if (uniqueness < REL_KEY_UNIQUENESS_MIN) continue;
        const matches = values.filter(v => keySet.has(v)).length;
        const score = matches / values.length;
        if (matches >= REL_MIN_MATCHES && score >= REL_MIN_SCORE && score > best.score) {
          best = { target: other.name, score };
        }
      }
      if (best.target) {
        relations.push({ field, target: best.target });
        db.fieldTypes[field] = 'lookup';
      }
    }
    if (relations.length) db.relations = relations;
  }
  return dbs;
}
