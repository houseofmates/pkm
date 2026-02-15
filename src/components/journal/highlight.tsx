interface HighlightProps {
    children: string;
    color?: string;
}

export function Highlight({ children, color = '#fef08a' }: HighlightProps) {
    return (
        <mark
            className="px-1 rounded"
            style={{
                backgroundColor: color,
                color: '#000',
                opacity: 0.8
            }}
        >
            {children}
        </mark>
    );
}
