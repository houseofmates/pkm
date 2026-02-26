
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
  const lower = name.toLowerCase().trim();

  // specific overrides
  if (CAPITALIZED_NAMES.has(name) || CAPITALIZED_NAMES.has(name.trim())) {
  // it might be passed in correctly, or we need to find the match from the set
  // since set doesn't let us find case-insensitive match easily without iteration:
  for (const cap of CAPITALIZED_NAMES) {
  if (cap.toLowerCase() === lower) return cap;
  }
  }

  // also check for partial matches/mappings if needed, but user list is specific.
  // the user asked for "walt/walter", so both are in the set.

  // explicit check for set content (case-insensitive)
  for (const allowed of CAPITALIZED_NAMES) {
  if (allowed.toLowerCase() === lower) return allowed;
  }

  // default: return as is.
  return name.trim();
}

export function getCapitalizationClass(name: string): string {
  const formatted = formatHeadmateName(name);
  // if the formatted name starts with an letter (and is in our allowed list),
  // we return a class that forces normal case.
  const firstChar = formatted.charAt(0);
  if (firstChar !== firstChar.toLowerCase() && CAPITALIZED_NAMES.has(formatted)) {
  return 'keep-case'; // Matches index.css exception
  }
  return '';
}