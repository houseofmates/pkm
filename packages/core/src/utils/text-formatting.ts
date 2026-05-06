
export const CAPITALIZED_NAMES = new Set([
  'S',
  'Mike',
  'Walt',
  'Walter',
  'Deer',
  'L',
  'C',
  'Alastor'
]);

export function formatHeadmateName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  for (const allowed of CAPITALIZED_NAMES) {
    if (allowed.toLowerCase() === lower) return allowed;
  }

  return trimmed;
}

export function getCapitalizationClass(name: string): string {
  const formatted = formatHeadmateName(name);
  // if the formatted name starts with an letter (and is in our allowed list),
  // we return a class that forces normal case.
  const firstChar = formatted.charAt(0);
  if (firstChar !== firstChar.toLowerCase() && CAPITALIZED_NAMES.has(formatted)) {
  return 'keep-case'; // matches index.css exception
  }
  return '';
}

export function humanizeFieldName(name: string): string {
  if (!name) return '';

  // split camelcase and then normalize separators
  const withCamelSplit = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  return withCamelSplit.replace(/[_-]/g, ' ').toLowerCase().trim();
}