import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Basic HTML sanitizer: remove <script> and on* attributes (not a replacement for a full HTML sanitizer)
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
                // disallow javascript: URIs
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
