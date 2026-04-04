import { AuthProvider, useAuth } from "@/contexts/auth-context"
// import apkUpdater only when needed
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
import { isCapacitorNative } from "@/lib/platform"
import { ErrorBoundary } from "@/components/ui/error-boundary"

// lazy load heavy components
const Spotlight = lazy(() => import("@/components/Spotlight").then(m => ({ default: m.Spotlight })));

const SetupRequired = lazy(() => import("@/components/setup-required").then(m => ({ default: m.SetupRequired })));
const TodayPage = lazy(() => import("@/pages/today").then(m => ({ default: m.TodayPage })));
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
const RagTestPage = lazy(() => import("@/pages/rag-test").then(m => ({ default: m.default })));
const JournalPage = lazy(() => import("@/pages/journal").then(m => ({ default: m.JournalPage })));
const CalendarPage = lazy(() => import("@/pages/calendar").then(m => ({ default: m.CalendarPage })));
const AchievementsPage = lazy(() => import("@/pages/achievements").then(m => ({ default: m.AchievementsPage })));

// Simple breathe page component that renders the breathing exercise
function BreathePage() {
  useEffect(() => {
    const ROTATION_PERIOD = 12;
    const BREATH_PERIOD = 12;
    
    const spiral = document.getElementById('breathe-spiral');
    const phaseEl = document.getElementById('breathe-phase');
    const countEl = document.getElementById('breathe-countdown');
    
    if (!spiral || !phaseEl || !countEl) return;
    
    let start: number | null = null;
    
    function animate(timestamp: number) {
      if (!start) start = timestamp;
      const elapsed = (timestamp - start) / 1000;
      
      const rotProg = (elapsed % ROTATION_PERIOD) / ROTATION_PERIOD;
      const angle = rotProg * 360;
      
      const breathPhase = elapsed % BREATH_PERIOD;
      let scale: number;
      let cue: string;
      
      if (breathPhase < 4) {
        scale = 1 + 0.5 * (breathPhase / 4);
        cue = 'inhale';
      } else if (breathPhase < 8) {
        scale = 1.5;
        cue = 'hold';
      } else {
        scale = 1.5 - 0.5 * ((breathPhase - 8) / 4);
        cue = 'exhale';
      }
      
      const phaseProgress = breathPhase % 4;
      const remaining = Math.ceil(4 - phaseProgress);
      
      if (spiral) {
        spiral.style.transform = `rotate(${angle}deg) scale(${scale})`;
      }
      
      if (phaseEl && phaseEl.textContent !== cue) {
        phaseEl.textContent = cue;
      }
      if (countEl) {
        countEl.textContent = `${remaining}s`;
      }
      
      requestAnimationFrame(animate);
    }
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen"
      style={{ 
        background: '#050505'
      }}
    >

      <svg 
        id="breathe-spiral"
        className="w-80 h-80 sm:w-80 sm:h-80 md:w-80 md:h-80 lg:w-96 lg:h-96"
        viewBox="0 0 100 100"
        style={{ transformOrigin: 'center' }}
      >
        <path 
          d="M50,50 m0,-20 a20,20 0 0,1 20,20 a20,20 0 0,1 -20,20 a20,20 0 0,1 -20,-20 a20,20 0 0,1 20,-20 a30,30 0 0,1 30,30 a30,30 0 0,1 -30,30 a30,30 0 0,1 -30,-30 a30,30 0 0,1 30,-30"
          fill="none"
          stroke="#f6b012"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
      <div 
        id="breathe-phase"
        className="mt-6 text-6xl sm:text-7xl md:text-8xl lowercase"
        style={{ 
          color: '#f6b012'
        }}
      >
        inhale
      </div>
      <div 
        id="breathe-countdown"
        className="mt-2 text-3xl sm:text-4xl md:text-5xl"
        style={{ 
          color: '#f6b012'
        }}
      >
        4s
      </div>
    </div>
  );
}

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
  const { token } = useAuth()
  const [updateChecked, setUpdateChecked] = useState(false)
  // state to track if login was triggered via Ctrl+E on public domains
  const [loginModeForced, setLoginModeForced] = useState(() => {
    return sessionStorage.getItem('pkm_force_login') === 'true'
  })
  // check for APK update ONLY on /apk
  useEffect(() => {
    if (window.location.pathname === "/apk" && !updateChecked && token) {
      const currentVersion = import.meta.env.VITE_APP_VERSION || "0.0.0"
      import("@/utils/apkUpdater").then(({ checkForApkUpdate, downloadAndPromptInstall }) => {
        checkForApkUpdate(currentVersion, token).then(manifest => {
          if (manifest) {
            if (window.confirm(`a new version (${manifest.version}) is available. update now?`)) {
              downloadAndPromptInstall(manifest.apkUrl)
            }
          }
          setUpdateChecked(true)
        })
      })
    }
  }, [updateChecked, token])
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null)

  // handle Ctrl+E to toggle login mode on public domains
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault()
        setLoginModeForced(prev => {
          const newValue = !prev
          sessionStorage.setItem('pkm_force_login', newValue ? 'true' : 'false')
          secureLogger.info(`[App] Login mode ${newValue ? 'enabled' : 'disabled'} via Ctrl+E`)
          return newValue
        })
      }
      // escape key to exit login mode on public domains
      if (e.key === 'Escape' && isPublicDomain() && loginModeForced) {
        setLoginModeForced(false)
        sessionStorage.removeItem('pkm_force_login')
        secureLogger.info('[App] Login mode disabled via Escape')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loginModeForced])

  // run link registry migration on mount (non-blocking)
  useEffect(() => {
    // skip migration on mobile until after app loads
    if (isCapacitorNative()) {
      return;
    }

    const runMigration = async () => {
      try {
        const migrated = isLinkRegistryMigrated()
        if (!migrated) {
          secureLogger.info('running link registry backfill migration')
          await backfillLinkRegistry()
        }
      } catch (error) {
        secureLogger.error('link registry migration failed:', error)
      }
    }
    // run in background, don't block UI
    setTimeout(runMigration, 1000)
  }, [])

  // perform a quick backend health check to decide if configuration is missing
  useEffect(() => {
    // on mobile (capacitor), always skip setup check - backend is always remote
    if (isCapacitorNative()) {
      setSetupNeeded(false);
      return;
    }
    
    // try to fetch stats from the absolute api url if available, otherwise relative
    const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || '';
    const statsUrl = `${baseUrl}/api/stats`;

    fetch(statsUrl)
      .then((r) => {
        if (r.ok) setSetupNeeded(false)
        else setSetupNeeded(true)
      })
      .catch(() => setSetupNeeded(true))
  }, [])

  if (setupNeeded === null) {
    return LoadingFallback
  }

  if (setupNeeded) {
    return (
      <Suspense fallback={LoadingFallback}>
        <SetupRequired />
      </Suspense>
    )
  }

  // public domain rendering - always show public content unless explicitly in login mode
  if (isPublicDomain()) {
    // when login mode is forced via Ctrl+E, show login overlay if not authenticated
    // otherwise show public content
    if (!loginModeForced || token) {
      return (
        <>
          <Suspense fallback={LoadingFallback}>
            <Routes>
              <Route path="/" element={<HouseofmatesBuilder />} />
              <Route path="/breathe" element={<BreathePage />} />
              <Route path="/doc/:slug" element={<PublicDocViewer slug={window.location.pathname.split('/doc/')[1]} />} />
              <Route path="/:slug" element={<HouseofmatesBuilder />} />
            </Routes>
          </Suspense>
          <Toaster />
        </>
      );
    }
    // loginModeForced is true and no token - show login page
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  return (
    <CanvasInitializer>
        {token ? (
          <Suspense fallback={LoadingFallback}>
            <Routes>
              <Route element={<RootLayout />}>
                <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
                <Route path="/today" element={<ErrorBoundary><TodayPage /></ErrorBoundary>} />
                <Route path="/databases" element={<ErrorBoundary><DatabasesPage /></ErrorBoundary>} />
                <Route path="/databases/:name" element={<ErrorBoundary><CollectionDetailPage /></ErrorBoundary>} />
                <Route path="/headmates" element={<ErrorBoundary><HeadmatesPage /></ErrorBoundary>} />
                <Route path="/board" element={<ErrorBoundary><MoodboardPage /></ErrorBoundary>} />
                <Route path="/canvas/:id" element={<ErrorBoundary><CanvasPage /></ErrorBoundary>} />
                <Route path="/drawings/:id" element={
                  <CanvasErrorBoundary>
                    <DrawingPage />
                  </CanvasErrorBoundary>
                } />
                <Route path="/databases/:name/:id" element={<ErrorBoundary><RecordView /></ErrorBoundary>} />
                <Route path="/captures" element={<ErrorBoundary><CapturesPage /></ErrorBoundary>} />
                <Route path="/db-canvas" element={<ErrorBoundary><DatabaseCanvasView /></ErrorBoundary>} />
                <Route path="/page/:id" element={<ErrorBoundary><PageCanvas /></ErrorBoundary>} />
                <Route path="/template" element={<ErrorBoundary><TemplatePage /></ErrorBoundary>} />
                <Route path="/workspace/:id" element={<ErrorBoundary><WorkspacePage /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                <Route path="/notion-import" element={<ErrorBoundary><NotionImportPage /></ErrorBoundary>} />
                <Route path="/rag-test" element={<ErrorBoundary><RagTestPage /></ErrorBoundary>} />
                <Route path="/journal" element={<ErrorBoundary><JournalPage /></ErrorBoundary>} />
                <Route path="/calendar" element={<ErrorBoundary><CalendarPage /></ErrorBoundary>} />
                <Route path="/achievements" element={<ErrorBoundary><AchievementsPage /></ErrorBoundary>} />
                <Route path="/awards" element={<ErrorBoundary><AchievementsPage /></ErrorBoundary>} />
                <Route path="*" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
              </Route>
            </Routes>
          </Suspense>
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
      <BrowserRouter>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  }

  // private pkm site needs all providers
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <FronterProvider>
            <LLMContextProvider>
              <AppContent />
            </LLMContextProvider>
          </FronterProvider>
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
