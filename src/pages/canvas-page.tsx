import { useParams, useNavigate } from 'react-router-dom'
import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas'
import { useEdgelessStore } from '@/features/edgeless/store'
import { useEffect, useRef } from 'react'
import { Toolbar } from '@/features/edgeless/components/Toolbar'
import { CanvasControls } from '@/features/edgeless/components/CanvasControls'
import { WilsonChat } from '@/features/chat/wilson-chat'
import { DatabaseSettingsForm } from '@/features/databases/components/database-settings-form'
import { Button } from '@/components/ui/button'
import PreviewCanvas from '@/components/preview-canvas'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, ArrowLeft } from 'lucide-react'
import { useAppSetting } from '@/hooks/use-app-setting'
import { Separator } from '@/components/ui/separator'

export function CanvasPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {});
  const pageMeta = metadata[id || ''] || {};
  const title = pageMeta.title || 'Untitled';
  const pdfUrl = pageMeta['pdf_url'];

  const updatePdf = (url: string) => {
  const next = { ...metadata, [id || '']: { ...pagemeta, pdf_url: url } };
  setmetadata(next);
  }

  // pdf handling
  const handlepdfupload = (e: react.changeevent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
  const reader = new FileReader();
  reader.onloadend = () => {
 const res = reader.result as string;
 updatepdf(res);
  };
  reader.readAsDataURL(file);
  }
  }

  const pdfInputRef = useRef<HTMLInputElement>(null);


    // --- header structure aligned with sidebar / page ---
    return (
        <div className="w-full h-screen relative overflow-hidden bg-background flex flex-col">
            {/* pdf layer (background / full screen) */}
            {pdfurl && (
                <div className="absolute inset-0 z-0 pointer-events-none">
                    {/* if it's a data url, iframe might treat it as download. embed is better. */}
                    <object data={pdfUrl} type="application/pdf" className="w-full h-full pointer-events-auto">
                        <p>pdf cannot be displayed.</p>
                    </object>
                    {/* button to remove pdf */}
                    <div className="absolute top-20 right-4 pointer-events-auto z-50">
                        <Button variant="destructive" size="sm" onClick={() => updatePdf('')}>remove pdf</Button>
                    </div>
                </div>
            )}

            {/* fixed top header (sidebar alignment) */}
            <div className="pt-4 shrink-0 bg-background z-50 pointer-events-auto flex flex-col nav-header">
                <div className="px-5 mb-2 h-10 flex items-center justify-between">
                    {/* left: back + title */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-col justify-center h-10">
                            <span className="font-bold text-sm leading-none">{title}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-1">canvas</span>
                        </div>
                    </div>

                    {/* right: settings + pdf upload */}
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10">
                                    <Settings className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="end">
                                <DatabaseSettingsForm
                                    collectionName={id || ''}
                                    title={title}
                                    isPage={true}
                                    onDelete={() => {
                                        // handle delete?
                                        secureLogger.info("Delete page", id)
                                    }}
                                />
                                {/* pdf upload section injected here or inside form? injected here is easier for now without huge refactor */}
                                <div className="mt-4 pt-4 border-t space-y-2">
                                    <span className="text-xs font-semibold uppercase text-muted-foreground">document pdf</span>
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            ref={pdfInputRef}
                                            className="hidden"
                                            accept="application/pdf"
                                            onChange={handlePdfUpload}
                                        />
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => pdfInputRef.current?.click()}>
                                            upload pdf layer
                                        </Button>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                {/* separator removed: nav-header has border-bottom using --header-sep for exact match */}
            </div>

            {/* main canvas area */}
            <div className="flex-1 relative overflow-hidden z-10">
                {/* canvas elements should be interactive */}
                <div className="pointer-events-auto w-full h-full">
                    {/* small demo: multi-column layout overlay for documents */}
                    <div className="px-5 pb-4">
                        <PreviewCanvas
                            columns={[[{ view_type: 'text', title: 'Column A' }, { view_type: 'embed', title: 'PDF Layer' }], [{ view_type: 'notes', title: 'Column B' }]]}
                            columnWidths={[60,40]}
                            renderWidget={(w:any)=> <div className="p-2 text-sm">{w.title}</div>}
                        />
                    </div>
                    {/* toolbar might need z-index adjustment if it overlaps header */}
                    <Toolbar />
                    <CanvasControls />
                    <WilsonChat />
                    <EdgelessCanvas />
                </div>
            </div>
        </div>
    )
}
