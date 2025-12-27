import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface RichEditorProps {
    value?: string;
    placeholder?: string;
    className?: string;
    onChange?: (html: string) => void;
    uploadImage?: (file: File) => Promise<string> | string;
}

// Very small, dependency-free rich editor using contentEditable and document.execCommand
export function markdownToHtml(md: string) {
    if (!md) return '';
    // Very lightweight markdown -> HTML converter for paste/initial import
    let out = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Code blocks ```
    out = out.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.replace(/</g,'&lt;')}</code></pre>`);
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

export function RichEditor({ value = '', placeholder, className, onChange, uploadImage }: RichEditorProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const html = value || '';
        if (ref.current && html !== ref.current.innerHTML) {
            ref.current.innerHTML = html || '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const exec = (cmd: string, arg?: string) => {
        document.execCommand(cmd, false, arg);
        // propagate new content
        onChange?.(ref.current?.innerHTML || '');
    };

    const insertImageFromFile = async (file?: File) => {
        if (!file) return;
        if (uploadImage) {
            try {
                const url = await uploadImage(file);
                // Insert figure with caption placeholder
                const frag = document.createRange().createContextualFragment(`<figure><img src="${url}" alt="" /><figcaption contenteditable>Caption...</figcaption></figure><p><br/></p>`);
                ref.current?.appendChild(frag);
                onChange?.(ref.current?.innerHTML || '');
            } catch (e) {
                console.error('Image upload failed', e);
                alert('Image upload failed');
            }
        } else {
            // Fallback: create object URL
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
            // convert lightweight markdown to html
            e.preventDefault();
            const converted = markdownToHtml(text);
            document.execCommand('insertHTML', false, converted);
            onChange?.(ref.current?.innerHTML || '');
        }
    };

    return (
        <div className={cn('w-full', className)}>
            <div className="flex gap-1 mb-2">
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('bold')}>B</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('italic')}>I</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('underline')}>U</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('formatBlock', 'H1')}>H1</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('formatBlock', 'H2')}>H2</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('formatBlock', 'H3')}>H3</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('formatBlock', 'BLOCKQUOTE')}>❝</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('formatBlock', 'PRE')}>Code</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => {
                    const url = prompt('Enter URL');
                    if (url) exec('createLink', url);
                }}>Link</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('insertUnorderedList')}>• List</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('insertOrderedList')}>1. List</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Image</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                    const files = e.target.files;
                    if (!files) return;
                    Array.from(files).forEach(f => insertImageFromFile(f));
                    e.currentTarget.value = '';
                }} multiple />
            </div>
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                onPaste={handlePaste}
                onInput={() => onChange?.(ref.current?.innerHTML || '')}
                onBlur={() => onChange?.(ref.current?.innerHTML || '')}
                className={cn('min-h-[120px] p-2 rounded border bg-card/20 overflow-auto', placeholder ? 'placeholder' : '')}
                data-placeholder={placeholder}
                style={{ outline: 'none' }}
            />
        </div>
    );
}

export default RichEditor;