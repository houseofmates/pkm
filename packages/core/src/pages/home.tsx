import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas'
import { Toolbar } from '@/features/edgeless/components/Toolbar'
import { useAppSetting } from '@/hooks/use-app-setting'
import { useEffect } from 'react'
import { updateDrawingMeta } from '@/features/edgeless/storage'
import { useEdgelessStore } from '@/features/edgeless/store'
import { toast } from 'sonner'
import { secureLogger } from '@/lib/secure-logger'

export function HomePage() {
    const [homeDrawingId, setHomeDrawingId] = useAppSetting<string | null>('homepage_canvas_drawing_id', null)
    const setDrawingId = useEdgelessStore((s) => s.setDrawingId)

    useEffect(() => {
        if (homeDrawingId) {
            setDrawingId(homeDrawingId)
            return
        }
        const ensureDrawingId = async () => {
            try {
                const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `home-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
                await updateDrawingMeta(newId, { title: 'home canvas', syncState: 'pending' })
                setHomeDrawingId(newId)
                setDrawingId(newId)
            } catch (error) {
                secureLogger.error('failed to initialize home canvas', error)
                toast.error('failed to initialize canvas')
            }
        }
        ensureDrawingId()
    }, [homeDrawingId, setHomeDrawingId, setDrawingId])

    if (!homeDrawingId) {
        return (
            <div className="w-full h-[100dvh] flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground lowercase">initializing canvas...</div>
            </div>
        )
    }

    return (
        <div className="w-full h-[100dvh] relative overflow-hidden bg-background">
            <div className="absolute inset-0 z-10">
                <Toolbar />
                <EdgelessCanvas />
            </div>
        </div>
    )
}
