// Blog utility functions

export function generateSlug(title: string, existingSlugs: string[] = []): string {
    // Convert to lowercase and replace non-alphanumeric with hyphens
    let baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 2;

    // Handle duplicates
    while (existingSlugs.includes(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
}

export function generateExcerpt(content: any, maxLength: number = 150): string {
    // Extract text from page elements
    let text = '';

    if (Array.isArray(content)) {
        for (const element of content) {
            if (element.type === 'text' && element.content) {
                text += element.content + ' ';
            }
        }
    }

    // Trim and cut at sentence boundary
    text = text.trim();
    if (text.length <= maxLength) return text;

    // Try to cut at last sentence within limit
    const cutText = text.substring(0, maxLength);
    const lastPeriod = cutText.lastIndexOf('.');
    const lastQuestion = cutText.lastIndexOf('?');
    const lastExclamation = cutText.lastIndexOf('!');

    const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);

    if (lastSentence > maxLength * 0.7) {
        return text.substring(0, lastSentence + 1);
    }

    // Otherwise cut at last space
    const lastSpace = cutText.lastIndexOf(' ');
    return text.substring(0, lastSpace) + '...';
}

export function calculateReadingTime(content: any): number {
    // Count words in content
    let wordCount = 0;

    if (Array.isArray(content)) {
        for (const element of content) {
            if (element.type === 'text' && element.content) {
                wordCount += element.content.split(/\s+/).length;
            }
        }
    }

    // Average reading speed: 200 words per minute
    const minutes = Math.ceil(wordCount / 200);
    return Math.max(1, minutes); // Minimum 1 minute
}

export function getMoodColor(mood?: string): string {
    switch (mood) {
        case 'low':
            return '#6b7280'; // gray
        case 'medium':
            return '#f59e0b'; // amber
        case 'high':
            return '#10b981'; // green
        case 'mixed':
            return '#8b5cf6'; // purple
        default:
            return '#6b7280';
    }
}

export function getEnergyColor(energy?: string): string {
    switch (energy) {
        case 'depleted':
            return '#ef4444'; // red
        case 'low':
            return '#f59e0b'; // amber
        case 'moderate':
            return '#3b82f6'; // blue
        case 'high':
            return '#10b981'; // green
        default:
            return '#6b7280';
    }
}
