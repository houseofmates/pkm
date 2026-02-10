
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

    // Specific Overrides
    if (CAPITALIZED_NAMES.has(name) || CAPITALIZED_NAMES.has(name.trim())) {
        // It might be passed in correctly, or we need to find the match from the set
        // Since Set doesn't let us find case-insensitive match easily without iteration:
        for (const cap of CAPITALIZED_NAMES) {
            if (cap.toLowerCase() === lower) return cap;
        }
    }

    // Also check for partial matches/mappings if needed, but user list is specific.
    // The user asked for "Walt/Walter", so both are in the Set.

    // Explicit check for Set content (case-insensitive)
    for (const allowed of CAPITALIZED_NAMES) {
        if (allowed.toLowerCase() === lower) return allowed;
    }

    // Default: Return as is.
    return name.trim();
}

export function getCapitalizationClass(name: string): string {
    const formatted = formatHeadmateName(name);
    // If the formatted name starts with an uppercase letter (and is in our allowed list),
    // we return a class that forces normal case.
    const firstChar = formatted.charAt(0);
    if (firstChar !== firstChar.toLowerCase() && CAPITALIZED_NAMES.has(formatted)) {
        return 'keep-case'; // Matches index.css exception
    }
    return '';
}
