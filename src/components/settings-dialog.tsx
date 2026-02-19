import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Settings, RefreshCw, Database, Trash2, Zap, ShieldCheck } from 'lucide-react'
import { backfillLinkRegistry } from '@/lib/link-migration'
import { registry } from '@/lib/link-registry'
import { walPendingCount } from '@/lib/write-ahead-log'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export function SettingsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [isRebuilding, setIsRebuilding] = useState(false)
    const [pendingWal, setPendingWal] = useState(0)
    const [linkCount, setLinkCount] = useState(0)

    useEffect(() => {
        if (open) {
            walPendingCount().then(setPendingWal)
            setLinkCount(registry.size())
        }
    }, [open])

    const handleRebuildIndex = async () => {
        setIsRebuilding(true)
        try {
            const res = await backfillLinkRegistry()
            setLinkCount(registry.size())
            toast.success(`index rebuilt: scanned ${res.documents} docs, found ${res.links} links`)
        } catch (e) {
            toast.error('failed to rebuild index')
        } finally {
            setIsRebuilding(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-[#050505] border-border text-foreground">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 lowercase text-primary">
                        <Settings className="h-5 w-5" />
                        pkm settings
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* performance section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground lowercase flex items-center gap-2">
                            <Zap className="h-4 w-4" /> performance
                        </h4>
                        <div className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium lowercase">canvas web worker</p>
                                <p className="text-xs text-muted-foreground lowercase">offloads idb ops to background thread</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-mono text-green-500 lowercase">active</span>
                            </div>
                        </div>
                    </div>

                    {/* data integrity section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground lowercase flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> data integrity
                        </h4>

                        <div className="bg-white/5 p-3 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium lowercase">write-ahead log</p>
                                    <p className="text-xs text-muted-foreground lowercase">journaled writes pending recovery</p>
                                </div>
                                <span className={cn(
                                    "text-xs font-mono lowercase px-2 py-0.5 rounded",
                                    pendingWal > 0 ? "bg-amber-500/20 text-amber-500" : "bg-green-500/20 text-green-500"
                                )}>
                                    {pendingWal} pending
                                </span>
                            </div>

                            <Separator className="bg-border/50" />

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium lowercase">link registry</p>
                                    <p className="text-xs text-muted-foreground lowercase">{linkCount} cross-references tracked</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-primary/50 hover:bg-primary/10 text-primary"
                                    onClick={handleRebuildIndex}
                                    disabled={isRebuilding}
                                >
                                    <RefreshCw className={cn("h-3 w-3 mr-2", isRebuilding && "animate-spin")} />
                                    {isRebuilding ? 'rebuilding...' : 'rebuild index'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* maintenance */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground lowercase flex items-center gap-2">
                            <Database className="h-4 w-4" /> maintenance
                        </h4>
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 h-9 px-3 lowercase"
                            onClick={() => {
                                if (confirm('clear link index? this will break backlinks until rebuilt.')) {
                                    registry.clear()
                                    setLinkCount(0)
                                    toast.success('link index cleared')
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> clear link registry
                        </Button>
                    </div>
                </div>

                <div className="text-[10px] text-center text-muted-foreground pt-4 border-t border-border/50 uppercase tracking-widest">
                    pkm-core v2.6.0-stable // house of mates
                </div>
            </DialogContent>
        </Dialog>
    )
}
