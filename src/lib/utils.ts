import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getContrastColor(hex: string): string {
  // remove hash if present
  const cleanHex = hex.replace('#', '');

  // parse input
  let r = 0, g = 0, b = 0;

  if (cleanHex.length === 3) {
  r = parseInt(cleanHex[0] + cleanHex[0], 16);
  g = parseInt(cleanHex[1] + cleanHex[1], 16);
  b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
  r = parseInt(cleanHex.substring(0, 2), 16);
  g = parseInt(cleanHex.substring(2, 4), 16);
  b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
  return '#ffffff'; // default to white if invalid
  }

  // calculate relative luminance (using rec. 601 for simplicity as requested/analyzed)
  // formula: 0.299*r + 0.587*g + 0.114*b
  const title = (r * 299 + g * 587 + b * 114) / 1000;

  // threshold ~117 (based on #737679 analysis)
  // #737679 => 117.4
  // > 117 means light background => black text
  // <= 117 means dark background => white text
  return title > 117 ? '#000000' : '#ffffff';
}

// basic html sanitizer: remove <script> and on* attributes (not a replacement for a full html sanitizer)
export function sanitizeHTML(html: string) {
  if (!html) return '';
  try {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // remove scripts/styles
  doc.querySelectorAll('script,style').forEach(n => n.remove());
  // remove event handler attributes
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
  const toRemoveAttrs: string[] = [];
  while (walker.nextNode()) {
  const el = walker.currentNode as Element;
  [...el.attributes].forEach(attr => {
 if (/^on/i.test(attr.name)) {
 toRemoveAttrs.push(`${el.tagName}->${attr.name}`);
 el.removeAttribute(attr.name);
 }
 // disallow javascript: uris
 if (attr.value && attr.value.toLowerCase().includes('javascript:')) {
 el.removeAttribute(attr.name);
 }
  });
  }
  return doc.body.innerHTML || '';
  } catch (e) {
  console.warn('sanitizeHTML failed', e);
  return '';
  }
}
