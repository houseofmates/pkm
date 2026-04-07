/* *
 * converts snake_case or lowercase strings to title case.
 * handles underscores, hyphens, and preserves known acronyms. */
const ACRONYMS = new Set(['api', 'xp', 'csv', 'json', 'id', 'url', 'uid', 'pdf', 'wysiwyg', 'pkm', 'ai', 'jwt', 'llm']);

export function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// alias for backward compatibility
export const humanizeFieldName = toTitleCase;
