import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { LoginPage } from "@/pages/login"
import { RootLayout } from "@/pages/root-layout"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Routes, Route, BrowserRouter } from "react-router-dom"
import { isPublicDomain } from "@/utils/subdomain-router"
import { lazy, Suspense, useEffect, useState } from "react"
import { FronterProvider } from "@/contexts/fronter-context"
import { LLMContextProvider } from "@/contexts/llm-context"
import { CanvasErrorBoundary } from "@/features/edgeless"
import { CanvasInitializer } from "@/features/edgeless/components/canvas-initializer"
import { isLinkRegistryMigrated, backfillLinkRegistry } from "@/lib/link-migration"
import { secureLogger } from "@/lib/secure-logger"

// lazy load heavy components
const Spotlight = lazy(() => import("@/components/Spotlight").then(m => ({ default: m.Spotlight })));
const WilsonChat = lazy(() => import("@/features/chat/wilson-chat").then(m => ({ default: m.WilsonChat })));
const SetupRequired = lazy(() => import("@/components/setup-required").then(m => ({ default: m.SetupRequired })));
const HomePage = lazy(() => import("@/pages/home").then(m => ({ default: m.HomePage })));
const DatabasesPage = lazy(() => import("@/pages/databases").then(m => ({ default: m.DatabasesPage })));
const CollectionDetailPage = lazy(() => import("@/pages/collection-detail").then(m => ({ default: m.CollectionDetailPage })));
const HeadmatesPage = lazy(() => import("@/pages/headmates").then(m => ({ default: m.HeadmatesPage })));
const MoodboardPage = lazy(() => import("@/pages/moodboard").then(m => ({ default: m.MoodboardPage })));
const CanvasPage = lazy(() => import("@/pages/canvas-page").then(m => ({ default: m.CanvasPage })));
const DrawingPage = lazy(() => import("@/pages/drawing-page").then(m => ({ default: m.DrawingPage })));
const CapturesPage = lazy(() => import("@/pages/captures").then(m => ({ default: m.CapturesPage })));
const DatabaseCanvasView = lazy(() => import("@/features/databases/components/DatabaseCanvasView").then(m => ({ default: m.DatabaseCanvasView })));
const PageCanvas = lazy(() => import("@/features/page/components/PageCanvas").then(m => ({ default: m.PageCanvas })));
const RecordView = lazy(() => import("@/features/records/components/record-view").then(m => ({ default: m.RecordView })));
const HouseofmatesBuilder = lazy(() => import("@/features/houseofmates-builder/HouseofmatesBuilder").then(m => ({ default: m.HouseofmatesBuilder })));
const TemplatePage = lazy(() => import("@/pages/template").then(m => ({ default: m.TemplatePage })));
const WorkspacePage = lazy(() => import("@/pages/workspace").then(m => ({ default: m.WorkspacePage })));
const NotionImportPage = lazy(() => import("@/pages/notion-import").then(m => ({ default: m.default })));
const SettingsPage = lazy(() => import("@/pages/settings").then(m => ({ default: m.default })));
const PublicDocViewer = lazy(() => import("@/components/journal/public-doc-viewer").then(m => ({ default: m.PublicDocViewer })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

const LoadingFallback = (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

function AppContent() {
  const { token, isLoading } = useAuth()
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null)

  // run link registry migration on mount
  useEffect(() => {
    const runMigration = async () => {
      try {
        const migrated = await isLinkRegistryMigrated()
        if (!migrated) {
          secureLogger.info('running link registry backfill migration')
          await backfillLinkRegistry()
        }
      } catch (error) {
        secureLogger.error('link registry migration failed:', error)
      }
    }
    runMigration()
  }, [])

  // perform a quick backend health check to decide if configuration is missing
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => {
        if (r.ok) setSetupNeeded(false)
        else setSetupNeeded(true)
      })
      .catch(() => setSetupNeeded(true))
  }, [])

  if (setupNeeded === null || isLoading) {
    return LoadingFallback
  }

  if (setupNeeded) {
    return <SetupRequired />
  }

  // if we reach here the backend is configured; show login / normal app
  if (!token && !isPublicDomain()) {
    return <LoginPage />
  }

  // public domain rendering
  if (isPublicDomain()) {
    return (
      <BrowserRouter>
        <Suspense fallback={LoadingFallback}>
          <Routes>
            <Route path="/" element={<HouseofmatesBuilder />} />
            <Route path="/doc/:slug" element={<PublicDocViewer slug={window.location.pathname.split('/doc/')[1]} />} />
            <Route path="/:slug" element={<HouseofmatesBuilder />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    );
  }

  return (
    <CanvasInitializer>
      {token ? (
        <BrowserRouter>
          <Suspense fallback={LoadingFallback}>
            <Routes>
              <Route element={<RootLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/databases" element={<DatabasesPage />} />
                <Route path="/databases/:name" element={<CollectionDetailPage />} />
                <Route path="/headmates" element={<HeadmatesPage />} />
                <Route path="/board" element={<MoodboardPage />} />
                <Route path="/canvas/:id" element={<CanvasPage />} />
                <Route path="/drawings/:id" element={
                  <CanvasErrorBoundary>
                    <DrawingPage />
                  </CanvasErrorBoundary>
                } />
                <Route path="/databases/:name/:id" element={<RecordView />} />
                <Route path="/captures" element={<CapturesPage />} />
                <Route path="/db-canvas" element={<DatabaseCanvasView />} />
                <Route path="/page/:id" element={<PageCanvas />} />
                <Route path="/template" element={<TemplatePage />} />
                <Route path="/workspace/:id" element={<WorkspacePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/notion-import" element={<NotionImportPage />} />
              </Route>
            </Routes>
            <Spotlight />
            <WilsonChat />
          </Suspense>
        </BrowserRouter>
      ) : <LoginPage />}
      <Toaster />
    </CanvasInitializer>
  )
}

function App() {
  // check if public domain
  const isPublic = isPublicDomain();

  if (isPublic) {
    // public site doesn't need fronterprovider or llmcontextprovider
    return (
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </AuthProvider>
    );
  }

  // private pkm site needs all providers
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <FronterProvider>
          <LLMContextProvider>
            <AppContent />
          </LLMContextProvider>
        </FronterProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
