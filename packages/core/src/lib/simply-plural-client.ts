export const SimplyPluralClient = {
  /**
 * returns the base url for the simplyplural api.
 * in dev mode (vite), it returns the local proxy path '/api/simplyplural' to avoid cors.
 * in prod/electron, it returns the direct api url 'https://api.apparyllis.com/v1'.
 */
  get baseUrl(): string {
    return import.meta.env.DEV
  ? '/api/simplyplural'
  : 'https://api.apparyllis.com/v1';
  },

  /**
 * constructs a full api url for a given endpoint.
 * @param endpoint the endpoint path (e.g., '/me', '/members/...')
 */
  url(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${this.baseUrl}${cleanEndpoint}`;
  }
};
