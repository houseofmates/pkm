import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface RichEditorProps {
    value?: string;
    placeholder?: string;
    className?: string;
    onChange?: (html: string) => void;
    uploadImage?: (file: File) => Promise<string> | string;
    showToolbar?: boolean;
}

// Very small, dependency-free rich editor using contentEditable and document.execCommand
export function markdownToHtml(md: string) {
    if (!md) return '';
    // Very lightweight markdown -> HTML converter for paste/initial import
    let out = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Code blocks ```
    out = out.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.replace(/</g, '&lt;')}</code></pre>`);
    // Headings
    out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    out = out.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    out = out.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // Blockquote
    out = out.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    // Images
    out = out.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />');
    // Links
    out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    // Lists
    out = out.replace(/^(?:\*|-) +(.*)$/gim, '<li>$1</li>');
    out = out.replace(/(<li>.*<\/li>\s?)+/gms, match => `<ul>${match}</ul>`);
    // Paragraphs
    out = out.replace(/^(?!<h|<ul|<pre|<blockquote|<img|<p)([^\n]+)$/gim, '<p>$1</p>');
    return out;
}

// ... imports
import { useState } from 'react';

// Simplified Command Menu Concept
function SlashMenu({ onSelect, onClose, position }: { onSelect: (cmd: string) => void, onClose: () => void, position: { top: number, left: number } }) {
    const commands = [
        { id: 'h1', label: 'Heading 1', icon: 'H1' },
        { id: 'h2', label: 'Heading 2', icon: 'H2' },
        { id: 'ul', label: 'Bullet List', icon: '•' },
        { id: 'ol', label: 'Numbered List', icon: '1.' },
        { id: 'blockquote', label: 'Quote', icon: '❝' },
        { id: 'pre', label: 'Code Block', icon: '<>' },
        { id: 'image', label: 'Image', icon: '🖼️' },
    ];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed z-50 w-48 bg-popover text-popover-foreground border rounded-md shadow-md p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: position.top + 24, left: position.left }}
        >
            <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">Basic Blocks</div>
            {commands.map(cmd => (
                <button
                    key={cmd.id}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 hover:text-accent-foreground text-sm rounded-sm text-left"
                    onClick={() => onSelect(cmd.id)}
                >
                    <span className="w-5 text-center font-mono opacity-70 text-xs">{cmd.icon}</span>
                    <span>{cmd.label}</span>
                </button>
            ))}
        </div>
    );
}

export function RichEditor({ value = '', placeholder, className, onChange, uploadImage, showToolbar = true }: RichEditorProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    // Slash Menu State
    const [slashMenu, setSlashMenu] = useState<{ open: boolean, top: number, left: number } | null>(null);

    useEffect(() => {
        // Sync html ...
        const html = value || '';
        if (ref.current && html !== ref.current.innerHTML) {
            // Only update if significantly different to avoid cursor jumping
            // Actually, with simple contentEditable, updating innerHTML resets cursor.
            // We should only update if not focused or if empty?
            // For now, naive implementation.
            if (document.activeElement !== ref.current) {
                ref.current.innerHTML = html || '';
            }
        }
    }, [value]);

    const exec = (cmd: string, arg?: string) => {
        document.execCommand(cmd, false, arg);
        ref.current?.focus();
        onChange?.(ref.current?.innerHTML || '');
        setSlashMenu(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === '/') {
            // Check if we are at start of line or preceded by space?
            // For simplicity, just trigger menu at cursor
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                setSlashMenu({
                    open: true,
                    top: rect.top,
                    left: rect.left
                });
            }
        }
    };

    const handleSlashSelect = (cmdId: string) => {
        // Remove the '/' that triggered it?
        // Since we didn't preventDefault, the '/' is likely in the text.
        // We might want to remove the last character.
        document.execCommand('delete', false); // Delete the '/'

        switch (cmdId) {
            case 'h1': exec('formatBlock', 'H1'); break;
            case 'h2': exec('formatBlock', 'H2'); break;
            case 'ul': exec('insertUnorderedList'); break;
            case 'ol': exec('insertOrderedList'); break;
            case 'blockquote': exec('formatBlock', 'BLOCKQUOTE'); break;
            case 'pre': exec('formatBlock', 'PRE'); break;
            case 'image': fileRef.current?.click(); break;
        }
        setSlashMenu(null);
    };

    // ... insertImageFromFile, handlePaste ...

    // (Copy paste previous helper functions manually if needed or assume they persist if not overwritten widely)
    // Actually replace_file_content overwrites the range, so I need to include them if I am replacing the component body.
    // The previous tool call view_file output implies I should preserve them. 
    // I will include them simplified.

    const insertImageFromFile = async (file?: File) => {
        if (!file) return;
        if (uploadImage) {
            try {
                const url = await uploadImage(file);
                const frag = document.createRange().createContextualFragment(`<figure><img src="${url}" alt="" /><figcaption contenteditable>Caption...</figcaption></figure><p><br/></p>`);
                ref.current?.appendChild(frag);
                onChange?.(ref.current?.innerHTML || '');
            } catch (e) {
                console.error('Image upload failed', e);
            }
        } else {
            const url = URL.createObjectURL(file);
            const frag = document.createRange().createContextualFragment(`<figure><img src="${url}" alt="" /><figcaption contenteditable>Caption...</figcaption></figure><p><br/></p>`);
            ref.current?.appendChild(frag);
            onChange?.(ref.current?.innerHTML || '');
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text/plain');
        const html = e.clipboardData.getData('text/html');
        if (text && !html) {
            e.preventDefault();
            const converted = markdownToHtml(text);
            document.execCommand('insertHTML', false, converted);
            onChange?.(ref.current?.innerHTML || '');
        }
    };

    return (
        <div className={cn('w-full relative', className)}>
            {/* Hidden Input for Images */}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                const files = e.target.files;
                if (!files) return;
                Array.from(files).forEach(f => insertImageFromFile(f));
                e.currentTarget.value = '';
            }} multiple />

            {slashMenu && (
                <>
                    <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setSlashMenu(null)} />
                    <SlashMenu
                        onSelect={handleSlashSelect}
                        onClose={() => setSlashMenu(null)}
                        position={slashMenu}
                    />
                </>
            )}

            {showToolbar && (
                <div className="flex gap-1 mb-2 opacity-20 hover:opacity-100 transition-opacity duration-300">
                    {/* ... Toolbar Buttons (Simplified for brevity, or kept) ... */}
                    <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('bold')}>B</button>
                    <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('italic')}>I</button>
                    <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('formatBlock', 'H1')}>H1</button>
                    <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('insertUnorderedList')}>•</button>
                    <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => fileRef.current?.click()}>IMG</button>
                </div>
            )}
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                onPaste={handlePaste}
                onInput={() => onChange?.(ref.current?.innerHTML || '')}
                // onBlur={() => onChange?.(ref.current?.innerHTML || '')} // Disabled to allow clicking menu
                onKeyDown={handleKeyDown}
                className={cn('min-h-[120px] p-2 rounded focus:outline-none prose prose-invert max-w-none', placeholder ? 'placeholder' : '')}
                data-placeholder={placeholder}
            />
        </div>
    );
}

export default RichEditor;