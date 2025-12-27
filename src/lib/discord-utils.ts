
export function isDiscordLinkExpired(url: string | undefined): boolean {
    if (!url) return false;
    if (!url.includes('media.discordapp.net') && !url.includes('cdn.discordapp.com')) return false;

    try {
        const urlObj = new URL(url);
        const exHex = urlObj.searchParams.get('ex');
        if (exHex) {
            const expiry = parseInt(exHex, 16);
            // Current time in seconds
            const now = Math.floor(Date.now() / 1000);
            return now > expiry;
        }
    } catch (e) {
        return false;
    }
    return false;
}

export const PLACEHOLDER_IMAGE = "https://placehold.co/400x400/333/f6b012?text=Exp";
