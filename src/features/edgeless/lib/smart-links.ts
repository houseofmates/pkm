
export function parseSmartLinks(text: string): { type: 'smart-link', label: string, action: string, index: number }[] {
    const regex = /@(today|tomorrow|now|\d{1,2}:\d{2})/gi
    const matches = []
    let match

    while ((match = regex.exec(text)) !== null) {
        matches.push({
            type: 'smart-link' as const,
            label: match[0],
            action: 'create-reminder', // simplified action
            index: match.index
        })
    }

    return matches
}

export function createSmartLinkElement(x: number, y: number, label: string) {
    return {
        type: 'smart-link',
        x,
        y,
        width: 120,
        height: 40,
        data: {
            label,
            timestamp: Date.now()
        }
    }
}
