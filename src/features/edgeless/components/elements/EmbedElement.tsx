
interface EmbedElementProps {
    element: any
}

export function EmbedElement({ element }: EmbedElementProps) {
    if (element.data.subType === 'nocobase') {
        return (
            <div className="w-full h-full bg-card border rounded-lg shadow-sm overflow-hidden p-2">
                <div className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    {element.data.title || 'Table View'}
                </div>
                <div className="w-full h-[calc(100%-1.5rem)] bg-muted/20 animate-pulse rounded">
                    {/* Placeholder for actual NocoBase View */}
                    <p className="p-4 text-center text-sm text-muted-foreground">
                        NocoBase Collection: {element.data.collection}
                    </p>
                </div>
            </div>
        )
    }

    if (element.data.subType === 'web') {
        return (
            <div className="w-full h-full bg-background border rounded-lg overflow-hidden flex flex-col">
                <div className="h-6 bg-muted border-b flex items-center px-2 space-x-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-[10px] text-muted-foreground ml-2 truncate max-w-[200px]">
                        {element.data.url}
                    </span>
                </div>
                <iframe
                    src={element.data.url}
                    className="w-full flex-1 border-none"
                    sandbox="allow-scripts allow-same-origin allow-popups"
                />
            </div>
        )
    }

    return null
}
