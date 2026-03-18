
// simple hash function to generate a consistent number from a string
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
 * generates a consistent hsl color string for a given text.
 * uses a predefined set of pleasing hues or continuous space.
 */
export function getStringColor(str: string): string {
  if (!str) return '#888888';

  const hash = Math.abs(hashCode(str));
  // generate hue: 0-360
  const hue = hash % 360;
  // generate saturation: 60-90% for vibrancy
  const saturation = 60 + (hash % 30);
  // generate lightness: 45-65% for readability
  const lightness = 45 + (hash % 20);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * calculates a "darker, more vibrant, slightly cooler" outline color
 * based on the input hsl or hex. 
 * note: for simplicity with css usage, this might return a css color-mix string
 * or we calculate it manually if we have the hsl components.
 * 
 * since we generate hsl above, we can manually manipulate it.
 */
export function getOutlineColorFromHsl(hue: number, saturation: number, lightness: number): string {
  // "darker": reduce lightness significantly (keep it readable but dark)
  // user requested "25% darker" -> increase reduction from 40 to 50
  const newL = Math.max(5, lightness - 50);

  // "more vibrant": increase saturation
  const newS = Math.min(100, saturation + 20);

  // "base color only": no hue shift (user said "not blue... just darker base")
  const newH = hue;

  return `hsl(${newH}, ${newS}%, ${newL}%)`;
}

/**
 * helper to get both base and outline styles for a string
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
  // helper for css text-stroke
  // use the calculated specific darker/vibrant outline
  WebkitTextStroke: `3.5px ${outline}`,
  paintOrder: 'stroke fill'
  };
}