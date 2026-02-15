
import { useEffect } from 'react';
import { useFronter } from '@/contexts/fronter-context';

export function useThemeReactor() {
    const { activeFronters, overrides, members } = useFronter();

    useEffect(() => {
        // Strategy: Use the FIRST active fronter's color. 
        // Fallback: Use the FIRST headmate's color in the system list.
        let primaryFronterId = activeFronters[0];
        let color: string | undefined;

        if (!primaryFronterId && members.length > 0) {
            // No one is fronting, use the first member
            color = members[0].color;
        } else if (primaryFronterId) {
            // Check overrides first, then members array, then cached colors
            color = overrides[primaryFronterId]?.color;

            if (!color) {
                // Check members array from context
                const member = members.find(m => m.id === primaryFronterId);
                color = member?.color;
            }

            if (!color) {
                // Check localStorage cache as last resort
                try {
                    const colorCache = JSON.parse(localStorage.getItem('member_colors') || '{}');
                    color = colorCache[primaryFronterId];
                } catch (e) {
                    console.warn('Failed to read color cache:', e);
                }
            }
        }

        if (color) {
            // Special case: If color is very dark (like black), use white instead
            const hsl = hexToHsl(color);
            if (hsl) {
                // Parse lightness from "H S% L%" format
                const lightnessMatch = hsl.match(/(\d+)%$/);
                const lightness = lightnessMatch ? parseInt(lightnessMatch[1]) : 50;

                // If very dark color (like black), override to white
                let finalColor = color;
                if (lightness < 25) {
                    finalColor = '#ffffff';
                    console.log('Dark color detected, using white instead');
                }

                const finalHsl = hexToHsl(finalColor);
                if (finalHsl) {
                    // Force injection on BOTH documentElement and body for max coverage
                    document.documentElement.style.setProperty('--primary', finalHsl);
                    document.documentElement.style.setProperty('--ring', finalHsl);

                    // User Request: recolor white elements to headmate color
                    document.documentElement.style.setProperty('--headmate-white', finalHsl);

                    // Also force body style as backup for portals outside root
                    document.body.style.setProperty('--primary', finalHsl, 'important');
                    document.body.style.setProperty('--ring', finalHsl, 'important');
                    document.body.style.setProperty('--headmate-white', finalHsl, 'important');
                }
            }
        } else {
            // No color found, revert to default (will use index.css default which is yellow)
            document.documentElement.style.removeProperty('--primary');
            document.documentElement.style.removeProperty('--ring');
            document.documentElement.style.removeProperty('--headmate-white');
            document.body.style.removeProperty('--primary');
            document.body.style.removeProperty('--ring');
            document.body.style.removeProperty('--headmate-white');
        }

    }, [activeFronters, overrides, members]);
}

// Helper: Hex to HSL string "H S% L%"
export function hexToHsl(hex: string): string | null {
    // Remove #
    hex = hex.replace(/^#/, '');

    // Parse
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (hex.length !== 6) return null;

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // Format for Tailwind/Shadcn: "H S% L%" (no commas)
    // H is 0-360, S/L are 0-100
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
