import { useParams, useNavigate } from 'react-router-dom'
import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas'
import { useEdgelessStore } from '@/features/edgeless/store'
import { useEffect, useRef } from 'react'
import { Toolbar } from '@/features/edgeless/components/Toolbar'
import { CanvasControls } from '@/features/edgeless/components/CanvasControls'
import { WilsonChat } from '@/features/chat/wilson-chat'
import { DatabaseSettingsForm } from '@/features/databases/components/database-settings-form'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, ArrowLeft } from 'lucide-react'
import { useAppSetting } from '@/hooks/use-app-setting'

export function CanvasPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {});
    const pageMeta = metadata[id || ''] || {};
    const title = pageMeta.title || 'Untitled';
    const pdfUrl = pageMeta['pdf_url'];

    const updatePdf = (url: string) => {
        const next = { ...metadata, [id || '']: { ...pageMeta, pdf_url: url } };
        setMetadata(next);
    }

    // PDF Handling
    const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                updatePdf(res);
            };
            reader.readAsDataURL(file);
        }
    }

    const pdfInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="w-full h-screen relative overflow-hidden bg-background flex flex-col">
            {/* PDF Layer (Background / Full Screen) */}
            {pdfUrl && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {/* If it's a data URL, iframe might treat it as download. Embed is better. */}
                    <object data={pdfUrl} type="application/pdf" className="w-full h-full pointer-events-auto">
                        <p>PDF cannot be displayed.</p>
                    </object>
                    {/* Button to remove PDF */}
                    <div className="absolute top-20 right-4 pointer-events-auto z-50">
                        <Button variant="destructive" size="sm" onClick={() => updatePdf('')}>Remove PDF</Button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto bg-background/50 backdrop-blur-sm p-1 rounded-lg border shadow-sm">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm leading-none">{title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">canvas</span>
                    </div>
                </div>

                <div className="pointer-events-auto bg-background/50 backdrop-blur-sm p-1 rounded-lg border shadow-sm">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                            <DatabaseSettingsForm
                                collectionName={id || ''}
                                title={title}
                                isPage={true}
                                onDelete={() => {
                                    // Handle delete?
                                    console.log("Delete page", id)
                                }}
                            />
                            {/* PDF Upload Section injected here or inside form? Injected here is easier for now without huge refactor */}
                            <div className="mt-4 pt-4 border-t space-y-2">
                                <span className="text-xs font-semibold uppercase text-muted-foreground">Document PDF</span>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        ref={pdfInputRef}
                                        className="hidden"
                                        accept="application/pdf"
                                        onChange={handlePdfUpload}
                                    />
                                    <Button variant="outline" size="sm" className="w-full" onClick={() => pdfInputRef.current?.click()}>
                                        Upload PDF Layer
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex-1 relative z-10 pointer-events-none">
                {/* Canvas elements should be interactive */}
                <div className="pointer-events-auto w-full h-full">
                    <Toolbar />
                    <CanvasControls />
                    <WilsonChat />
                    <EdgelessCanvas />
                </div>
            </div>
        </div>
    )
}
