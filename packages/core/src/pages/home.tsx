import { EdgelessCanvas } from '@/features/edgeless/components/EdgelessCanvas'
import { Toolbar } from '@/features/edgeless/components/Toolbar'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useAppSetting } from '@/hooks/use-app-setting'
import { useEffect, useState } from 'react'
import { updateDrawingMeta, getLatestCheckpoint, saveServerState } from '@/features/edgeless/storage'
import { useEdgelessStore } from '@/features/edgeless/store'
import { canvasSync } from '@/features/edgeless/sync/canvas-sync'
import { toast } from 'sonner'
import { secureLogger } from '@/lib/secure-logger'

export function HomePage() {
const [homeDrawingId, setHomeDrawingId] = useAppSetting<string | null>('homepage_canvas_drawing_id', null)
const setDrawingId = useEdgelessStore((s) => s.setDrawingId)
const [isLoading, setIsLoading] = useState(true)

useEffect(() => {
if (!homeDrawingId) {
const ensureDrawingId = async () => {
try {
const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
? crypto.randomUUID()
: `home-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
await updateDrawingMeta(newId, { title: 'home canvas', syncState: 'pending' })
setHomeDrawingId(newId)
setDrawingId(newId)
setIsLoading(false)
} catch (error) {
secureLogger.error('failed to initialize home canvas', error)
toast.error('failed to initialize canvas')
setIsLoading(false)
}
}
ensureDrawingId()
return
}

const loadAndMerge = async () => {
try {
setDrawingId(homeDrawingId)

// try to load from server first
let serverState = null
try {
serverState = await canvasSync.loadFromServer(homeDrawingId)
} catch (e) {
// server unavailable, use local state
secureLogger.debug('[home] server unavailable, using local state')
}

// get local checkpoint
const localCheckpoint = await getLatestCheckpoint(homeDrawingId)
const localTimestamp = localCheckpoint?.timestamp || 0

if (serverState && serverState.timestamp > localTimestamp) {
// server is newer
secureLogger.debug('[home] loading newer server state', {
serverTs: serverState.timestamp,
localTs: localTimestamp,
})

// save server state to local indexeddb
await saveServerState(homeDrawingId, {
canvas: serverState.canvas,
elements: serverState.elements as any[],
})

// dispatch event to reload canvas from new checkpoint
window.dispatchEvent(
new CustomEvent('pkm:load-server-state', {
detail: { drawingId: homeDrawingId, state: serverState },
})
)
} else if (localCheckpoint) {
// local is newer or server unavailable
secureLogger.debug('[home] using local checkpoint')

// use the store's loadFromOplog function which handles race conditions
await useEdgelessStore.getState().loadFromOplog(homeDrawingId)

// if we have local data and server exists, sync to server
if (serverState !== null) {
await canvasSync.forceSync(homeDrawingId)
}
} else {
secureLogger.debug('[home] no existing state, starting fresh')
}

setIsLoading(false)
} catch (error) {
secureLogger.error('failed to load canvas state', error)
setIsLoading(false)
}
}

loadAndMerge()
}, [homeDrawingId, setHomeDrawingId, setDrawingId])

if (!homeDrawingId || isLoading) {
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
  <ErrorBoundary fallback={<div className="p-6 text-center">Canvas is temporarily unavailable. Please try again later.</div>}>
    <EdgelessCanvas />
  </ErrorBoundary>
  </div>
  </div>
  )
}
