
// Simple hash function to generate a consistent number from a string
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Generates a consistent HSL color string for a given text.
 * Uses a predefined set of pleasing hues or continuous space.
 */
export function getStringColor(str: string): string {
    if (!str) return '#888888';

    const hash = Math.abs(hashCode(str));
    // Generate hue: 0-360
    const hue = hash % 360;
    // Generate saturation: 60-90% for vibrancy
    const saturation = 60 + (hash % 30);
    // Generate lightness: 45-65% for readability
    const lightness = 45 + (hash % 20);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Calculates a "darker, more vibrant, slightly cooler" outline color
 * based on the input HSL or Hex. 
 * Note: For simplicity with CSS usage, this might return a CSS color-mix string
 * or we calculate it manually if we have the HSL components.
 * 
 * Since we generate HSL above, we can manually manipulate it.
 */
export function getOutlineColorFromHsl(hue: number, saturation: number, lightness: number): string {
    // "Darker": reduce lightness significantly (keep it readable but dark)
    // User requested "25% darker" -> Increase reduction from 40 to 50
    const newL = Math.max(5, lightness - 50);

    // "More vibrant": increase saturation
    const newS = Math.min(100, saturation + 20);

    // "Base Color Only": NO Hue shift (User said "not blue... just darker base")
    const newH = hue;

    return `hsl(${newH}, ${newS}%, ${newL}%)`;
}

/**
 * Helper to get both base and outline styles for a string
 */
export function getColorStyles(str: string) {
    const hash = Math.abs(hashCode(str));
    const h = hash % 360;
    const s = 60 + (hash % 30);
    const l = 45 + (hash % 20);

    const base = `hsl(${h}, ${s}%, ${l}%)`;
    const outline = getOutlineColorFromHsl(h, s, l);

    return {
        color: base,
        outlineColor: outline,
        // Helper for CSS text-stroke
        // Use the calculated specific darker/vibrant outline
        WebkitTextStroke: `3.5px ${outline}`,
        paintOrder: 'stroke fill'
    };
}
