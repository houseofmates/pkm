import { AuthProvider, useAuth } from "@/contexts/auth-context";
// import apkupdater only when needed
import { LoginPage } from "@/pages/login";
import { RootLayout } from "@/pages/root-layout";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { isPublicDomain } from "@/utils/subdomain-router";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { FronterProvider } from "@/contexts/fronter-context";
import { LLMContextProvider } from "@/contexts/llm-context";
import { CanvasErrorBoundary } from "@/features/edgeless";
import { CanvasInitializer } from "@/features/edgeless/components/canvas-initializer";
import {
  isLinkRegistryMigrated,
  backfillLinkRegistry,
} from "@/lib/link-migration";
import { secureLogger } from "@/lib/secure-logger";
import { isCapacitorNative } from "@/lib/platform";
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";

// lazy load heavy components
const Spotlight = lazy(() =>
  import("@/components/Spotlight").then((m) => ({ default: m.Spotlight })),
);

const SetupRequired = lazy(() =>
  import("@/components/setup-required").then((m) => ({
    default: m.SetupRequired,
  })),
);
const TodayPage = lazy(() =>
  import("@/pages/today").then((m) => ({ default: m.TodayPage })),
);
const HomePage = lazy(() =>
  import("@/pages/home").then((m) => ({ default: m.HomePage })),
);
const DatabasesPage = lazy(() =>
  import("@/pages/databases").then((m) => ({ default: m.DatabasesPage })),
);
const CollectionDetailPage = lazy(() =>
  import("@/pages/collection-detail").then((m) => ({
    default: m.CollectionDetailPage,
  })),
);
const HeadmatesPage = lazy(() =>
  import("@/pages/headmates").then((m) => ({ default: m.HeadmatesPage })),
);
const MoodboardPage = lazy(() =>
  import("@/pages/moodboard").then((m) => ({ default: m.MoodboardPage })),
);
const CanvasPage = lazy(() =>
  import("@/pages/canvas-page").then((m) => ({ default: m.CanvasPage })),
);
const DrawingPage = lazy(() =>
  import("@/pages/drawing-page").then((m) => ({ default: m.DrawingPage })),
);
const CapturesPage = lazy(() =>
  import("@/pages/captures").then((m) => ({ default: m.CapturesPage })),
);
const DatabaseCanvasView = lazy(() =>
  import("@/features/databases/components/DatabaseCanvasView").then((m) => ({
    default: m.DatabaseCanvasView,
  })),
);
const PageCanvas = lazy(() =>
  import("@/features/page/components/PageCanvas").then((m) => ({
    default: m.PageCanvas,
  })),
);
const RecordView = lazy(() =>
  import("@/features/records/components/record-view").then((m) => ({
    default: m.RecordView,
  })),
);
const HouseofmatesBuilder = lazy(() =>
  import("@/features/houseofmates-builder/HouseofmatesBuilder").then((m) => ({
    default: m.HouseofmatesBuilder,
  })),
);
const TemplatePage = lazy(() =>
  import("@/pages/template").then((m) => ({ default: m.TemplatePage })),
);
const WorkspacePage = lazy(() =>
  import("@/pages/workspace").then((m) => ({ default: m.WorkspacePage })),
);
const NotionImportPage = lazy(() =>
  import("@/pages/notion-import").then((m) => ({ default: m.default })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((m) => ({ default: m.default })),
);
const PublicDocViewer = lazy(() =>
  import("@/components/journal/public-doc-viewer").then((m) => ({
    default: m.PublicDocViewer,
  })),
);

// rechartsmodule uses named exports - import the module directly for lazy loading
const RechartsModule = lazy(() =>
  import("@/components/journal/recharts-wrapper").then((m) => ({
    default: () => null, // placeholder, actual usage destructures from m directly
  })),
);
const RagTestPage = lazy(() =>
  import("@/pages/rag-test").then((m) => ({ default: m.default })),
);
const JournalPage = lazy(() => import("@/pages/journal"));
const CalendarPage = lazy(() =>
  import("@/pages/calendar").then((m) => ({ default: m.CalendarPage })),
);
const AchievementsPage = lazy(() =>
  import("@/pages/achievements").then((m) => ({ default: m.AchievementsPage })),
);

// simple breathe page component that renders the breathing exercise
function BreathePage() {
  useEffect(() => {
    const ROTATION_PERIOD = 12;
    const BREATH_PERIOD = 12;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const spiral = document.getElementById("breathe-spiral");
    const phaseEl = document.getElementById("breathe-phase");
    const countEl = document.getElementById("breathe-countdown");

    if (!spiral || !phaseEl || !countEl) return;

    if (prefersReducedMotion) {
      spiral.style.transform = "rotate(0deg) scale(1)";
      phaseEl.textContent = "inhale";
      countEl.textContent = "4s";
      return;
    }

    let start: number | null = null;
    let animationId = 0;
    let isMounted = true;

    function animate(timestamp: number) {
      if (!isMounted) return;
      if (!start) start = timestamp;
      const elapsed = (timestamp - start) / 1000;

      const rotProg = (elapsed % ROTATION_PERIOD) / ROTATION_PERIOD;
      const angle = rotProg * 360;

      const breathPhase = elapsed % BREATH_PERIOD;
      let scale: number;
      let cue: string;

      if (breathPhase < 4) {
        scale = 1 + 0.5 * (breathPhase / 4);
        cue = "inhale";
      } else if (breathPhase < 8) {
        scale = 1.5;
        cue = "hold";
      } else {
        scale = 1.5 - 0.5 * ((breathPhase - 8) / 4);
        cue = "exhale";
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

      animationId = requestAnimationFrame(animate);
    }

    animationId = requestAnimationFrame(animate);
    return () => {
      isMounted = false;
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{
        background: "#050505",
      }}
    >
      <svg
        id="breathe-spiral"
        className="w-80 h-80 sm:w-80 sm:h-80 md:w-80 md:h-80 lg:w-96 lg:h-96"
        viewBox="0 0 100 100"
        style={{ transformOrigin: "center" }}
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
          color: "#f6b012",
        }}
      >
        inhale
      </div>
      <div
        id="breathe-countdown"
        className="mt-2 text-3xl sm:text-4xl md:text-5xl"
        style={{
          color: "#f6b012",
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
});

const LoadingFallback = (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// error boundary for lazy load failures
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    secureLogger.error(
      "lazy load error boundary caught error:",
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
            <div className="text-destructive text-lg mb-4">
              failed to load page
            </div>
            <div className="text-muted-foreground text-sm mb-4">
              {this.state.error?.message || "unknown error"}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              reload page
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { token } = useAuth();
  const [updateChecked, setUpdateChecked] = useState(false);
  // state to track if login was triggered via ctrl+e on public domains
  const [loginModeForced, setLoginModeForced] = useState(() => {
    return sessionStorage.getItem("pkm_force_login") === "true";
  });
  // check for apk update only on /apk
  useEffect(() => {
    if (window.location.pathname === "/apk" && !updateChecked && token) {
      const currentVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";
      import("@/utils/apkUpdater")
        .then(({ checkForApkUpdate, downloadAndPromptInstall }) => {
          return checkForApkUpdate(currentVersion, token).then((manifest) => {
            if (manifest) {
              if (
                window.confirm(
                  `a new version (${manifest.version}) is available. update now?`,
                )
              ) {
                downloadAndPromptInstall(manifest.apkUrl);
              }
            }
            setUpdateChecked(true);
          });
        })
        .catch((err) => secureLogger.error("apk update check failed:", err));
    }
  }, [updateChecked, token]);
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null);

  // swipe navigation for mobile
  useSwipeNavigation({
    threshold: 50,
    timeout: 300,
  });

  // handle ctrl+e to toggle login mode on public domains
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        setLoginModeForced((prev) => {
          const newValue = !prev;
          sessionStorage.setItem(
            "pkm_force_login",
            newValue ? "true" : "false",
          );
          secureLogger.info(
            `[App] Login mode ${newValue ? "enabled" : "disabled"} via Ctrl+E`,
          );
          return newValue;
        });
      }
      // escape key to exit login mode on public domains
      if (e.key === "Escape" && isPublicDomain() && loginModeForced) {
        setLoginModeForced(false);
        sessionStorage.removeItem("pkm_force_login");
        secureLogger.info("[App] Login mode disabled via Escape");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loginModeForced]);

  // run link registry migration on mount (non-blocking)
  useEffect(() => {
    // skip migration on mobile until after app loads
    if (isCapacitorNative()) {
      return;
    }

    const runMigration = async () => {
      try {
        const migrated = isLinkRegistryMigrated();
        if (!migrated) {
          secureLogger.info("running link registry backfill migration");
          await backfillLinkRegistry();
        }
      } catch (error) {
        secureLogger.error("link registry migration failed:", error);
      }
    };
    // run in background, don't block ui
    setTimeout(runMigration, 1000);
  }, []);

  // perform a quick backend health check to decide if configuration is missing
  useEffect(() => {
    // on mobile (capacitor), always skip setup check - backend is always remote
    if (isCapacitorNative()) {
      setSetupNeeded(false);
      return;
    }

    // if no token, skip setup check - let the login page handle connectivity
    if (!token) {
      setSetupNeeded(false);
      return;
    }

    // skip health check - nocobase base url lacks cors headers
    // login page handles backend connectivity gracefully
    setSetupNeeded(false);
  }, [token]);

  if (setupNeeded === null) {
    return LoadingFallback;
  }

  if (setupNeeded) {
    return (
      <Suspense fallback={LoadingFallback}>
        <SetupRequired />
      </Suspense>
    );
  }

  // public domain rendering - always show public content unless explicitly in login mode
  if (isPublicDomain()) {
    // when login mode is forced via ctrl+e, show login overlay if not authenticated
    // otherwise show public content
    if (!loginModeForced || token) {
      return (
        <>
          <Suspense fallback={LoadingFallback}>
            <Routes>
              <Route
                path="/"
                element={
                  <LazyLoadErrorBoundary>
                    <HouseofmatesBuilder />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route path="/breathe" element={<BreathePage />} />
              <Route
                path="/doc/:slug"
                element={
                  <LazyLoadErrorBoundary>
                    <PublicDocViewer
                      slug={window.location.pathname.split("/doc/")[1]}
                    />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/:slug"
                element={
                  <LazyLoadErrorBoundary>
                    <HouseofmatesBuilder />
                  </LazyLoadErrorBoundary>
                }
              />
            </Routes>
          </Suspense>
          <Toaster />
        </>
      );
    }
    // loginmodeforced is true and no token - show login page
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
              <Route
                path="/"
                element={
                  <LazyLoadErrorBoundary>
                    <HomePage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/today"
                element={
                  <LazyLoadErrorBoundary>
                    <TodayPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/databases"
                element={
                  <LazyLoadErrorBoundary>
                    <DatabasesPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/databases/hygeine-log"
                element={<Navigate to="/databases/hygiene-log" replace />}
              />
              <Route
                path="/databases/captures"
                element={
                  <LazyLoadErrorBoundary>
                    <CapturesPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/databases/:name"
                element={
                  <LazyLoadErrorBoundary>
                    <CollectionDetailPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/headmates"
                element={
                  <LazyLoadErrorBoundary>
                    <HeadmatesPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/board"
                element={
                  <LazyLoadErrorBoundary>
                    <MoodboardPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/canvas/:id"
                element={
                  <LazyLoadErrorBoundary>
                    <CanvasPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/drawings/:id"
                element={
                  <CanvasErrorBoundary>
                    <DrawingPage />
                  </CanvasErrorBoundary>
                }
              />
              <Route
                path="/databases/:name/:id"
                element={
                  <LazyLoadErrorBoundary>
                    <RecordView />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/captures"
                element={
                  <LazyLoadErrorBoundary>
                    <CapturesPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/db-canvas"
                element={
                  <LazyLoadErrorBoundary>
                    <DatabaseCanvasView />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/page/:id"
                element={
                  <LazyLoadErrorBoundary>
                    <PageCanvas />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/template"
                element={
                  <LazyLoadErrorBoundary>
                    <TemplatePage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/workspace/:id"
                element={
                  <LazyLoadErrorBoundary>
                    <WorkspacePage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/settings"
                element={
                  <LazyLoadErrorBoundary>
                    <SettingsPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/notion-import"
                element={
                  <LazyLoadErrorBoundary>
                    <NotionImportPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/rag-test"
                element={
                  <LazyLoadErrorBoundary>
                    <RagTestPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/journal"
                element={
                  <LazyLoadErrorBoundary>
                    <JournalPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/calendar"
                element={
                  <LazyLoadErrorBoundary>
                    <CalendarPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/achievements"
                element={
                  <LazyLoadErrorBoundary>
                    <AchievementsPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="/awards"
                element={
                  <LazyLoadErrorBoundary>
                    <AchievementsPage />
                  </LazyLoadErrorBoundary>
                }
              />
              <Route
                path="*"
                element={
                  <LazyLoadErrorBoundary>
                    <HomePage />
                  </LazyLoadErrorBoundary>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      ) : (
        <LoginPage />
      )}
      <Toaster />
    </CanvasInitializer>
  );
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
  );
}

export default App;
