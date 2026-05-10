import fs from 'fs';
import { describe, it, expect } from 'vitest';

describe('template JSON integration check', () => {
  it('extracts sample JSON from template.tsx and validates top-level shape', () => {
    const src = fs.readFileSync('src/pages/template.tsx', 'utf8');
    const m = src.match(/useState\(`([\s\S]*?)`\)/);
    expect(m).toBeTruthy();
    const jsonText = m ? m[1] : '';
    expect(() => JSON.parse(jsonText)).not.toThrow();
    const parsed = JSON.parse(jsonText);
    expect(parsed.meta).toBeTruthy();
    expect(typeof parsed.meta.name).toBe('string');
    expect(parsed.layout).toBeTruthy();
    expect(Array.isArray(parsed.layout.columns)).toBe(true);
  });
});
