
import { useEffect } from 'react';
import { useFronter } from '@/contexts/fronter-context';
import { secureLogger } from '@/lib/secure-logger';

export function useThemeReactor() {
  const { activeFronters, overrides, members } = useFronter();

  useEffect(() => {
  // 1. electron-specific zoom (1.15x)
  const isElectron = (window as any).electron?.isElectron;
  if (isElectron) {
  document.documentElement.style.zoom = "1.15";
  }

  // strategy: use the first active fronter's color.
  // fallback: use the first headmate's color in the system list.
  const primaryFronterId = activeFronters[0];
  let color: string | undefined;

  if (!primaryFronterId && members.length > 0) {
  // no one is fronting, use the first member
  color = members[0].color;
  } else if (primaryFronterId) {
  // check overrides first, then members array, then cached colors
  color = overrides[primaryFronterId]?.color;

  if (!color) {
 // check members array from context
 const member = members.find(m => m.id === primaryFronterId);
 color = member?.color;
  }

  if (!color) {
 // check localstorage cache as last resort
 try {
 const colorCache = JSON.parse(localStorage.getItem('member_colors') || '{}');
 color = colorCache[primaryFronterId];
 } catch (e) {
 secureLogger.warn('Failed to read color cache:', e);
 }
  }
  }

  if (color) {
  // special case: if color is very dark (like black), use white instead
  const hsl = HexToHsl(color);
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

 const finalHsl = HexToHsl(finalColor);
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
 }
  }
  } else {
  // no color found, revert to default (will use index.css default which is yellow)
  document.documentElement.style.removeProperty('--primary');
  document.documentElement.style.removeProperty('--ring');
  document.documentElement.style.removeProperty('--headmate-white');
  document.body.style.removeProperty('--primary');
  document.body.style.removeProperty('--ring');
  document.body.style.removeProperty('--headmate-white');
  }

  }, [activeFronters, overrides, members]);
}

// helper: hex to hsl string "h s% l%"
export function HexToHsl(hex: string): string | null {
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
