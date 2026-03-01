import { useLayoutEffect } from 'react';
import { useFronter } from '@/contexts/fronter-context';
import { secureLogger } from '@/lib/secure-logger';
import { storageManager } from '@/lib/storage-manager';

export function useThemeReactor() {
  const { activeFronters, overrides, members } = useFronter();

  useLayoutEffect(() => {
    // 1. electron-specific zoom (1.15x)
    const isElectron = (window as any).electron?.isElectron;
    if (isElectron) {
      document.documentElement.style.zoom = "1.15";
    }

    // strategy: use the first active fronter's color.
    // fallback: use the first headmate's color in the system list.
    // fallback 2: use last known color from localStorage to prevent flicker during load.
    const primaryFronterId = activeFronters[0];
    let color: string | undefined;

    if (primaryFronterId) {
      // check overrides first, then members array, then cached colors
      color = overrides[primaryFronterId]?.color;

      if (!color) {
        // check members array from context
        const member = members.find(m => m.id === primaryFronterId);
        color = member?.color;
      }

      if (!color) {
        // check storage manager cache as last resort
        try {
          const colorCache = JSON.parse(storageManager.getItem('member_colors') || '{}');
          color = colorCache[primaryFronterId];
        } catch (e) {
          secureLogger.warn('Failed to read color cache:', e);
        }
      }
    }

    // if still no color found (e.g. initial load), try last_active_color
    if (!color) {
      try {
        const cached = storageManager.getItem('last_active_color');
        if (cached) {
          color = cached;
        }
      } catch (e) {
        secureLogger.warn('Failed to read last_active_color', e);
      }
    }

    if (color) {
      // persist for next load
      storageManager.setItem('last_active_color', color);

      // special case: if color is very dark (like black), use white instead
      const hsl = hexToHsl(color);
      if (hsl) {
        // parse lightness from "h s% l%" format
        const lightnessMatch = hsl.match(/(\d+)%$/);
        const lightness = lightnessMatch ? parseInt(lightnessMatch[1]) : 50;

        // high-contrast detection: if color is very dark, add a helper class
        // to the body so css can apply outlines to accent elements.
        if (lightness < 30) {
          document.body.classList.add('high-contrast-outline');
        } else {
          document.body.classList.remove('high-contrast-outline');
        }

        // if very dark color (like black), override to white
        let finalColor = color;
        if (lightness < 25) {
          finalColor = '#ffffff';
          secureLogger.info('Dark color detected, using white instead');
        }

        // enforce global yellow default if it's white 
        if (finalColor.toLowerCase() === '#ffffff' || finalColor.toLowerCase() === '#fff') {
          finalColor = '#f6b012';
        }

        const finalHsl = hexToHsl(finalColor);
        if (finalHsl) {
          // force injection on both documentelement and body for max coverage
          document.documentElement.style.setProperty('--primary', finalHsl);
          document.documentElement.style.setProperty('--ring', finalHsl);

          // user request: recolor white elements to headmate color
          document.documentElement.style.setProperty('--headmate-white', finalHsl);

          // also force body style as backup for portals outside root
          document.body.style.setProperty('--primary', finalHsl, 'important');
          document.body.style.setProperty('--ring', finalHsl, 'important');
          document.body.style.setProperty('--headmate-white', finalHsl, 'important');

          // ensure window.accentBg is synced for components that use it (sidebar)
          const soft = getAccentBg(finalColor);
          if (typeof window !== 'undefined') (window as any).accentBg = soft;
          document.documentElement.style.setProperty('--primary-soft', soft);
        }
      }
    } else {
      // no color found AND no cache, use default #f6b012 immediately
      const defaultColor = '#f6b012';
      const defaultHsl = hexToHsl(defaultColor);
      if (defaultHsl) {
        document.documentElement.style.setProperty('--primary', defaultHsl);
        document.documentElement.style.setProperty('--ring', defaultHsl);
        document.documentElement.style.setProperty('--headmate-white', defaultHsl);
        document.body.style.setProperty('--primary', defaultHsl, 'important');
        document.body.style.setProperty('--ring', defaultHsl, 'important');
        document.body.style.setProperty('--headmate-white', defaultHsl, 'important');

        const soft = getAccentBg(defaultColor);
        if (typeof window !== 'undefined') (window as any).accentBg = soft;
        document.documentElement.style.setProperty('--primary-soft', soft);
      }
    }

  }, [activeFronters, overrides, members]);
}

// helper: hex to hsl string "h s% l%"
export function hexToHsl(hex: string): string | null {
  // remove #
  hex = hex.replace(/^#/, '');

  // parse
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return null;

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

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

  // format for tailwind/shadcn: "h s% l%" (no commas)
  // h is 0-360, s/l are 0-100
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// helper to get low opacity background (mirrored from root-layout for consistency)
export function getAccentBg(color: string) {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  }
  if (color.startsWith('rgb')) {
    return color.replace(/rgb\(([^)]+)\)/, 'rgba($1, 0.15)');
  }
  // generic fallback that respects the CSS variable
  return `hsl(var(--primary) / 0.15)`;
}
