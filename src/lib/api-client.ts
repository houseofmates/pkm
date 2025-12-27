
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp, type HttpOptions } from '@capacitor/core';

// Configuration for our two APIs
// Configuration for our two APIs
export const APIS = {
    simplyplural: {
        nativeUrl: 'https://api.apparyllis.com/v1',
        proxyUrl: '/api/simplyplural'
    },
    nocobase: {
        nativeUrl: 'https://db.houseofmates.space/api',
        proxyUrl: '/api/nocobase'
    },
    ollama: {
        nativeUrl: 'https://ollama.houseofmates.space/api',
        proxyUrl: '/api/ollama'
    }
};

type ApiType = keyof typeof APIS;

export async function apiRequest(type: ApiType, endpoint: string, options: Partial<HttpOptions> & { responseType?: 'json' | 'text' | 'blob' } = {}) {
    const isNative = Capacitor.isNativePlatform();
    const config = APIS[type];

    // Remove leading slash from endpoint to append correctly
    const path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

    if (isNative) {
        // --- NATIVE MODE: Use CapacitorHttp with Absolute URL ---
        const url = `${config.nativeUrl}/${path}`;

        // Prepare headers (CapacitorHttp expects plain object)
        const headers = { ...options.headers } as Record<string, string>;

        // Ensure method is uppercase
        const method = (options.method || 'GET').toUpperCase();

        try {
            const response = await CapacitorHttp.request({
                ...options,
                url,
                method,
                headers,
            });

            if (response.status >= 400) {
                const err = new Error(`API Error ${response.status}: ${JSON.stringify(response.data)}`) as any;
                err.status = response.status;
                err.data = response.data;
                throw err;
            }

            // Native response data is already parsed
            return response.data;

        } catch (error: any) {
            console.error(`[Native API] ${type} request failed:`, error);
            throw error;
        }

    } else {
        // --- WEB MODE: Use standard fetch with Vite Proxy ---
        const url = `${config.proxyUrl}/${path}`;

        // Transform params to query string for fetch
        let fetchUrl = url;
        if (options.params) {
            const params = new URLSearchParams();
            Object.entries(options.params).forEach(([k, v]) => {
                if (typeof v === 'object') params.append(k, JSON.stringify(v));
                else params.append(k, String(v));
            });
            fetchUrl += `?${params.toString()}`;
        }

        const headers: Record<string, string> = {
            ...(options.data instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers as Record<string, string>)
        };

        try {
            const response = await fetch(fetchUrl, {
                method: options.method || 'GET',
                headers,
                body: options.data instanceof FormData ? options.data : (options.data ? JSON.stringify(options.data) : undefined),
            });

            if (!response.ok) {
                const text = await response.text();
                let parsed: any = text;
                try { parsed = JSON.parse(text); } catch (e) { /* keep raw text */ }
                const err = new Error(`API Error ${response.status}: ${text}`) as any;
                err.status = response.status;
                err.data = parsed;
                throw err;
            }

            // Handle response types
            const respType = options.responseType || 'json';
            if (respType === 'blob') {
                return await response.blob();
            }

            // Handle empty responses
            const text = await response.text();
            if (!text) return {};

            if (respType === 'text') return text;

            try {
                return JSON.parse(text);
            } catch (e) {
                // If response is not JSON (e.g. plain text), return as is or wrap
                return { data: text };
            }

        } catch (error: any) {
            console.error(`[Web API] ${type} request failed:`, error);
            throw error;
        }
    }
}
