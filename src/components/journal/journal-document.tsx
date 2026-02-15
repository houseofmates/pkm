import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichEditor } from '@/components/ui/rich-editor';
import { format } from 'date-fns';
import { TextContextMenu } from './text-context-menu';
import { MarkdownCheatSheet } from './markdown-cheat-sheet';

interface JournalDocumentProps {
    document: any;
    onUpdate: (updates: any) => void;
    readOnly?: boolean;
}

export function JournalDocument({ document, onUpdate, readOnly = false }: JournalDocumentProps) {
    const [showBannerUpload, setShowBannerUpload] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);
    const [showCheatSheet, setShowCheatSheet] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    // Ctrl+M keyboard shortcut for cheat sheet
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                setShowCheatSheet(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Handle text selection and context menu
    const handleContextMenu = (e: React.MouseEvent) => {
        if (readOnly) return;

        e.preventDefault();
        const selection = window.getSelection();
        let selectedText = selection?.toString() || '';

        // If no selection, select the word under cursor
        if (!selectedText && selection) {
            const range = document.caretRangeFromPoint(e.clientX, e.clientY);
            if (range) {
                const textNode = range.startContainer;
                if (textNode.nodeType === Node.TEXT_NODE) {
                    const text = textNode.textContent || '';
                    const offset = range.startOffset;

                    // Find word boundaries
                    let start = offset;
                    let end = offset;
                    while (start > 0 && /\w/.test(text[start - 1])) start--;
                    while (end < text.length && /\w/.test(text[end])) end++;

                    selectedText = text.substring(start, end);

                    // Select the word
                    const newRange = document.createRange();
                    newRange.setStart(textNode, start);
                    newRange.setEnd(textNode, end);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
        }

        if (selectedText) {
            setContextMenu({ x: e.clientX, y: e.clientY, text: selectedText });
        }
    };

    const handleFormat = (format: string, value?: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();

        let formattedText = '';
        switch (format) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            case 'h1':
                formattedText = `# ${selectedText}`;
                break;
            case 'h2':
                formattedText = `## ${selectedText}`;
                break;
            case 'h3':
                formattedText = `### ${selectedText}`;
                break;
            case 'color':
                formattedText = `<span style="color: ${value}">${selectedText}</span>`;
                break;
            case 'link':
                formattedText = `[${selectedText}](${value})`;
                break;
            default:
                formattedText = selectedText;
        }

        range.deleteContents();
        range.insertNode(document.createTextNode(formattedText));
        setContextMenu(null);
    };

    const handleBannerUpload = async (file: File) => {
        // TODO: Implement banner upload to backend
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload/banner', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            onUpdate({ banner_image: data.url });
            setShowBannerUpload(false);
        } catch (error) {
            console.error('Banner upload failed:', error);
        }
    };

    const handleBannerClick = (e: React.MouseEvent) => {
        if (readOnly) return;
        e.preventDefault();
        setShowBannerUpload(true);
    };

    const documentColor = document.color || '#8b5cf6'; // Default purple
    const createdDate = document.created_at ? new Date(document.created_at) : new Date();

    return (
        <div className="min-h-screen bg-background font-varela">
            {/* Banner Image Area */}
            <div
                className="relative w-full h-64 bg-muted/20 border-b border-primary cursor-pointer group"
                onClick={handleBannerClick}
                onContextMenu={(e) => {
                    if (!readOnly) {
                        e.preventDefault();
                        setShowBannerUpload(true);
                    }
                }}
            >
                {document.banner_image ? (
                    <img
                        src={document.banner_image}
                        alt="Banner"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImageIcon className="w-8 h-8" />
                            <span className="text-sm lowercase">
                                {readOnly ? 'no banner image' : 'click to add banner image'}
                            </span>
                        </div>
                    </div>
                )}

                {showBannerUpload && !readOnly && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                        <div className="bg-background p-6 rounded-lg shadow-xl max-w-md w-full">
                            <h3 className="text-lg font-semibold mb-4 lowercase">upload banner image</h3>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleBannerUpload(file);
                                }}
                                className="w-full"
                            />
                            <div className="flex gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowBannerUpload(false)}
                                    className="flex-1 lowercase"
                                >
                                    cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Centered Content Container */}
            <div className="max-w-3xl mx-auto px-6 py-12">
                {/* Title */}
                <h1
                    className="text-5xl font-bold text-center mb-4 font-varela"
                    style={{ color: documentColor }}
                    contentEditable={!readOnly}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                        if (!readOnly) {
                            onUpdate({ title: e.currentTarget.textContent });
                        }
                    }}
                >
                    {document.title || 'Untitled Journal Entry'}
                </h1>

                {/* Date */}
                <div className="text-center text-muted-foreground text-lg mb-8 font-varela">
                    {format(createdDate, 'MMMM d, yyyy')}
                </div>

                {/* Divider */}
                <div className="w-24 h-0.5 bg-primary mx-auto mb-12" />

                {/* Content Editor */}
                <div
                    ref={contentRef}
                    className="prose prose-lg max-w-none font-varela"
                    onContextMenu={handleContextMenu}
                >
                    <RichEditor
                        value={document.content || ''}
                        onChange={(content) => !readOnly && onUpdate({ content })}
                        placeholder="start writing your journal entry..."
                        className="min-h-[500px] text-lg leading-relaxed"
                    />
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <TextContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    selectedText={contextMenu.text}
                    onClose={() => setContextMenu(null)}
                    onFormat={handleFormat}
                />
            )}

            {/* Markdown Cheat Sheet */}
            <MarkdownCheatSheet
                open={showCheatSheet}
                onClose={() => setShowCheatSheet(false)}
            />
        </div>
    );
}
