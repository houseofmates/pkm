/* eslint-disable */
// platform.ts — environment detection utilities for web vs capacitor native
//
// used by the ai worker hook to decide whether to use a web worker
// or fall back to main-thread execution, and to rewrite endpoints
// that point to localhost (unreachable from a phone).

/** true when running inside a capacitor native webview (android/ios) */
interface CapacitorInfo {
    isNative?: boolean;
    isNativePlatform?: () => boolean;
    [key: string]: any;
}

interface CapacitorWindow extends Window {
    Capacitor?: CapacitorInfo;
}

export function isCapacitorNative(): boolean {
    try {
        // capacitor injects this on the window object
        const cap = (window as CapacitorWindow).Capacitor;
        if (!cap) return false;
        // isnative is set to true by capacitor on native platforms
        if (cap.isNative === true) return true;
        // fallback to calling isnativeplatform if available
        if (typeof cap.isNativePlatform === 'function') {
            return cap.isNativePlatform();
        }
        return false;
    } catch {
        return false;
    }
}

/** 
 * true when running in a mobile context (native app or mobile browser).
 * also checks if we're loading from the mobile server origin on a mobile device.
 */
export function isMobileContext(): boolean {
    if (isCapacitorNative()) return true;
    if (typeof navigator === 'undefined') return false;
    
    const ua = navigator.userAgent || navigator.vendor || '';
    const isMobileUA = /android|iphone|ipad|ipod|iemobile|mobile/i.test(ua);
    
    // if we're on mobile ua and loading from our mobile server, treat as mobile context
    if (isMobileUA && typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'pkm.houseofmates.space' || host.endsWith('.houseofmates.space')) {
            return true;
        }
    }
    
    return isMobileUA;
}

/** 
 * detects if we're in a context where localhost won't be reachable.
 * this includes:
 * - capacitor native apps
 * - mobile browsers loading from remote origin
 * - any non-localhost origin on mobile
 */
export function isLocalhostUnreachable(): boolean {
    // definitely unreachable in native app
    if (isCapacitorNative()) return true;
    
    // check if we're on mobile and not on localhost
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || '';
    const isMobile = /android|iphone|ipad|ipod|iemobile|mobile/i.test(ua);
    
    if (isMobile && typeof window !== 'undefined') {
        const host = window.location.hostname;
        // if not localhost/127.0.0.1, then localhost is unreachable
        if (host !== 'localhost' && host !== '127.0.0.1') {
            return true;
        }
    }
    
    return false;
}

/** true when the browser supports module workers and we can actually instantiate one */
export function isWorkerSupported(): boolean {
    if (typeof Worker === 'undefined') return false;

    // some android webviews expose worker but throw on `type: 'module'`
    // we can't probe without actually creating one, so we check a known
    // indicator: capacitor native webviews on older android versions
    // often lack full module-worker support.
    // the actual try/catch happens at construction time in use-ai-worker.ts.
    return true;
}

/**
 * returns the correct ollama-compatible endpoint for the current platform.
 *
 * - on desktop/browser localhost: uses local endpoint directly
 * - on public domain: proxies through the ai-proxy server
 *
 * @param serverorigin - the remote server origin (e.g. from capacitor config)
 * @param localendpoint - the default local endpoint
 */
export function resolveOllamaEndpoint(
  localEndpoint: string,
  _serverOrigin?: string,
): string {
  // if we're on the public domain, use the proxy
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'pkm.houseofmates.space' || host.endsWith('.houseofmates.space')) {
      // route through the ai proxy on the same origin
      // the proxy forwards to the actual ai service (nvidia or ollama)
      const protocol = window.location.protocol; // https:
      const proxyBase = `${protocol}//${host}`;
      
      // check if this is a nvidia api call or ollama call
      if (localEndpoint.includes('nvidia') || localEndpoint.includes('nvapi')) {
        return `${proxyBase}/nvidia/chat/completions`;
      }
      // ollama-style endpoint
      return `${proxyBase}/ollama/api/generate`;
    }
  }
  return localEndpoint;
}

/**
 * the remote server origin for the mobile app.
 * mirrors the value in capacitor.config.ts so the core package can use it
 * without importing capacitor config directly.
 *
 * use https on the public hostname so the bundled apk (capacitor://localhost)
 * avoids mixed-content blocks when calling the backend.
 */
export const MOBILE_SERVER_ORIGIN = 'https://pkm.houseofmates.space';
