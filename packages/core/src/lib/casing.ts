/**
 * humanize field name - converts snake_case to lowercase with spaces
 * replaces underscores/hyphens with spaces, outputs lowercase
 */
export function humanizeFieldName(str: string): string {
  if (!str) return str;
  return str
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}
