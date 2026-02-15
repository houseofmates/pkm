import { useState, useEffect } from 'react';
import { useBuilder } from '../HouseofmatesBuilder';
import { api } from '@/api/nocobase-client';
import { Link, ExternalLink, FileText, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    elementId: string;
    onClose: () => void;
}

interface PageOption {
    slug: string;
    title: string;
}

export function ElementPropertiesPanel({ elementId, onClose }: Props) {
    const { page, updateElement, site_identifier, collectionNames } = useBuilder();
    const element = page?.elements.find(el => el.id === elementId);

    const [linkType, setLinkType] = useState<'none' | 'external' | 'internal'>(
        element?.link ? (element.link.startsWith('/') ? 'internal' : 'external') : 'none'
    );
    const [externalUrl, setExternalUrl] = useState(
        element?.link && !element.link.startsWith('/') ? element.link : ''
    );
    const [internalPage, setInternalPage] = useState(
        element?.link?.startsWith('/') ? element.link.slice(1) : ''
    );
    const [pages, setPages] = useState<PageOption[]>([]);
    const [loadingPages, setLoadingPages] = useState(false);

    // Fetch available pages for the internal link dropdown
    useEffect(() => {
        const fetchPages = async () => {
            setLoadingPages(true);
            try {
                const res = await api.listRecords(collectionNames.website, {
                    filter: { site: site_identifier },
                    fields: ['slug', 'title'],
                    pageSize: 100
                });
                const data = res?.data || res?.data?.data || [];
                setPages(data.map((p: any) => ({ slug: p.slug, title: p.title })));
            } catch (e) {
                console.error('Failed to fetch pages:', e);
                setPages([]);
            } finally {
                setLoadingPages(false);
            }
        };
        if (linkType === 'internal') {
            fetchPages();
        }
    }, [linkType, site_identifier]);

    if (!element) return null;

    const handleSave = () => {
        let link: string | undefined;

        if (linkType === 'external' && externalUrl.trim()) {
            // Ensure URL has protocol
            link = externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`;
        } else if (linkType === 'internal' && internalPage) {
            link = `/${internalPage}`;
        } else {
            link = undefined;
        }

        updateElement(elementId, { link });
        toast.success('link updated');
        onClose();
    };

    const handleRemoveLink = () => {
        updateElement(elementId, { link: undefined });
        setLinkType('none');
        setExternalUrl('');
        setInternalPage('');
        toast.success('link removed');
    };

    return (
        <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 builder-modal" onClick={onClose}>
            <div
                className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 w-96 max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-[var(--primary)] lowercase flex items-center gap-2">
                        <Link className="w-5 h-5" />
                        link action
                    </h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Link Type Selection */}
                <div className="space-y-3 mb-6">
                    <label className="block text-white/60 text-sm lowercase">link type</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setLinkType('none')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm lowercase transition-colors ${linkType === 'none'
                                ? 'selected-icon-btn font-bold'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            none
                        </button>
                        <button
                            onClick={() => setLinkType('external')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm lowercase transition-colors ${linkType === 'external'
                                ? 'selected-icon-btn font-bold'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            external
                        </button>
                        <button
                            onClick={() => setLinkType('internal')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm lowercase transition-colors ${linkType === 'internal'
                                ? 'selected-icon-btn font-bold'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                        >
                            internal
                        </button>
                    </div>
                </div>

                {/* External URL Input */}
                {linkType === 'external' && (
                    <div className="mb-6">
                        <label className="block text-white/60 text-sm lowercase mb-2 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            external url
                        </label>
                        <input
                            type="text"
                            value={externalUrl}
                            onChange={(e) => setExternalUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30"
                        />
                    </div>
                )}

                {/* Internal Page Dropdown */}
                {linkType === 'internal' && (
                    <div className="mb-6">
                        <label className="block text-white/60 text-sm lowercase mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            select page
                        </label>
                        {loadingPages ? (
                            <div className="text-white/40 text-sm py-3">loading pages...</div>
                        ) : pages.length === 0 ? (
                            <div className="text-white/40 text-sm py-3">no pages found</div>
                        ) : (
                            <div className="relative">
                                <select
                                    value={internalPage}
                                    onChange={(e) => setInternalPage(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none cursor-pointer"
                                >
                                    <option value="" className="bg-[#0c0c0c]">-- select a page --</option>
                                    {pages.map(p => (
                                        <option key={p.slug} value={p.slug} className="bg-[#0c0c0c]">
                                            {p.title} (/{p.slug})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                            </div>
                        )}
                    </div>
                )}

                {/* Preview */}
                {(linkType === 'external' && externalUrl) || (linkType === 'internal' && internalPage) ? (
                    <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-xs text-white/40 lowercase mb-1">link preview</p>
                        <p className="text-sm text-[var(--primary)] font-mono break-all">
                            {linkType === 'external'
                                ? (externalUrl.startsWith('http') ? externalUrl : `https://${externalUrl}`)
                                : `/${internalPage}`
                            }
                        </p>
                    </div>
                ) : null}

                {/* Actions */}
                <div className="flex gap-3">
                    {element.link && (
                        <button
                            onClick={handleRemoveLink}
                            className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold hover:bg-red-500/30 transition-colors lowercase"
                        >
                            remove link
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={linkType !== 'none' && !((linkType === 'external' && externalUrl.trim()) || (linkType === 'internal' && internalPage))}
                        className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-black font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 lowercase"
                    >
                        save link
                    </button>
                </div>
            </div>
        </div>
    );
}
