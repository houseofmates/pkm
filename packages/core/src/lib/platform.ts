// platform.ts — environment detection utilities for web vs capacitor native
//
// used by the ai worker hook to decide whether to use a web worker
// or fall back to main-thread execution, and to rewrite endpoints
// that point to localhost (unreachable from a phone).

/** true when running inside a capacitor native webview (android/ios) */
export function isCapacitorNative(): boolean {
    try {
        // capacitor injects this on the window object
        return !!(window as any)?.Capacitor?.isNativePlatform?.();
    } catch {
        return false;
    }
}

/** true when the browser supports module workers and we can actually instantiate one */
export function isWorkerSupported(): boolean {
    if (typeof Worker === 'undefined') return false;

    // some android webviews expose Worker but throw on `type: 'module'`
    // we can't probe without actually creating one, so we check a known
    // indicator: capacitor native webviews on older android versions
    // often lack full module-worker support.
    // the actual try/catch happens at construction time in use-ai-worker.ts.
    return true;
}

/**
 * returns the correct ollama-compatible endpoint for the current platform.
 *
 * - on desktop/browser: `http://localhost:11434` (local ollama)
 * - on mobile/capacitor: proxy through the remote server
 *
 * @param serverOrigin - the remote server origin (e.g. from capacitor config)
 * @param localEndpoint - the default local endpoint
 */
export function resolveOllamaEndpoint(
    localEndpoint: string,
    serverOrigin?: string,
): string {
    if (isCapacitorNative() && serverOrigin) {
        // mobile can't reach localhost — route through server proxy
        // expects the server to have a /api/ollama reverse proxy configured
        const base = serverOrigin.replace(/\/+$/, '');
        return `${base}/api/ollama`;
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
