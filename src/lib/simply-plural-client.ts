export const SimplyPluralClient = {
    /**
     * Returns the base URL for the SimplyPlural API.
     * In DEV mode (Vite), it returns the local proxy path '/api/simplyplural' to avoid CORS.
     * In PROD/Electron, it returns the direct API URL 'https://api.apparyllis.com/v1'.
     */
    get baseUrl(): string {
        // @ts-ignore - import.meta.env is a Vite feature
        return import.meta.env.DEV
            ? '/api/simplyplural'
            : 'https://api.apparyllis.com/v1';
    },

    /**
     * Constructs a full API URL for a given endpoint.
     * @param endpoint The endpoint path (e.g., '/me', '/members/...')
     */
    url(endpoint: string): string {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        return `${this.baseUrl}${cleanEndpoint}`;
    }
};
