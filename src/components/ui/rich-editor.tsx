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
export function RichEditor({ value = '', placeholder, className, onChange, uploadImage }: RichEditorProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (ref.current && value !== ref.current.innerHTML) {
            ref.current.innerHTML = value || '';
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
                exec('insertImage', url as string);
            } catch (e) {
                console.error('Image upload failed', e);
                alert('Image upload failed');
            }
        } else {
            // Fallback: create object URL
            const url = URL.createObjectURL(file);
            exec('insertImage', url);
        }
    };

    return (
        <div className={cn('w-full', className)}>
            <div className="flex gap-1 mb-2">
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('bold')}>B</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('italic')}>I</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('underline')}>U</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => {
                    const url = prompt('Enter URL');
                    if (url) exec('createLink', url);
                }}>Link</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('insertUnorderedList')}>• List</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => exec('insertOrderedList')}>1. List</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Image</button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) insertImageFromFile(f);
                    e.currentTarget.value = '';
                }} />
            </div>
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
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