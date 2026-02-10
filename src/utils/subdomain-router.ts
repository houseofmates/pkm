
export const getSubdomain = () => {
    const hostname = window.location.hostname;
    // Handle localhost and IP addresses
    if (hostname.includes('localhost') || hostname.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
        // For testing locally, we can simulate a subdomain via localStorage or a query param if needed
        // Or checking hosts file mapping like "test.localhost"
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'www' && !hostname.match(/^\d/)) {
            return parts[0];
        }
        return null;
    }

    const parts = hostname.split('.');
    // Removing TLD and SLD (e.g. houseofmates.space)
    // If parts > 2, the first part is likely a subdomain
    if (parts.length > 2) {
        // Check for 'www' or standard
        if (parts[0] === 'www') return parts[1] === 'houseofmates' ? null : parts[1];
        return parts[0];
    }
    return null;
};

export const isPublicDomain = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const search = window.location.search;

    // EXPLICIT INCLUDE: Port 3010/3001 is always public builder
    if (port === '3010' || port === '3001') return true;

    const subdomain = getSubdomain();

    // EXPLICIT EXCLUSION: pkm is always the private app
    if (subdomain === 'pkm') return false;

    // For local dev, we can use a query param
    if (search.includes('mode=public')) return true;

    // Treat local IP or localhost as public IF it's on the specific ports
    // But if it's on 3000, it's likely the pkm app
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        if (port === '3010' || port === '3001') return true;
        return false;
    }

    // EXPLICIT MARKER for houseofmates.space domains
    // Any subdomain (except pkm, handled above) on houseofmates.space is PUBLIC
    if (hostname.includes('houseofmates.space')) {
        return true;
    }

    return false;
};
