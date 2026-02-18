
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { LoginPage } from "@/pages/login"
import { RootLayout } from "@/pages/root-layout"
import { Toaster } from "@/components/ui/sonner"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Routes, Route, BrowserRouter } from "react-router-dom"
import { isPublicDomain } from "@/utils/subdomain-router"
import { lazy, Suspense } from "react"
import { FronterProvider } from "@/contexts/fronter-context"
import { LLMContextProvider } from "@/contexts/llm-context"

// lazy load heavy components
const GlobalCommandPalette = lazy(() => import("@/components/global-command-palette").then(m => ({ default: m.GlobalCommandPalette })));
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
const BlogBuilder = lazy(() => import("@/features/blog-builder/BlogBuilder").then(m => ({ default: m.BlogBuilder })));
const TemplatePage = lazy(() => import("@/pages/template").then(m => ({ default: m.TemplatePage })));
const WorkspacePage = lazy(() => import("@/pages/workspace").then(m => ({ default: m.WorkspacePage })));
const PublicDocViewer = lazy(() => import("@/components/journal/public-doc-viewer").then(m => ({ default: m.PublicDocViewer })));




const queryClient = new QueryClient()

// check public mode early
const isPublicByDomain = isPublicDomain();
const isPkmDomain = window.location.hostname.startsWith('pkm.');
const isPublic = isPublicByDomain && !isPkmDomain;

console.log(`[Router] Host: ${window.location.hostname}, isPublicByDomain: ${isPublicByDomain}, isPkm: ${isPkmDomain}, Result Public: ${isPublic}`);

// set branding immediately (before react mounts)
if (typeof document !== 'undefined') {
 const hostname = window.location.hostname;
 if (hostname.includes('dupe')) {
  document.title = "dupemates";
 } else if (hostname.includes('blog')) {
  document.title = "blog";
 } else if (hostname.includes('home')) {
  document.title = "home";
 } else {
  document.title = isPublic ? "house of mates" : "pkm";
 }
 const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
 if (favicon) {
  if (window.location.hostname.includes('dupe')) {
 favicon.href = "/favicon-dupe.png";
  } else if (isPublic) {
 favicon.href = "/favicon-home.png";
  } else {
 favicon.href = "/favicon.png";
  }
 }
}

function AppContent() {
 const { token } = useAuth()

 const LoadingFallback = (
  <div className="h-screen flex items-center justify-center bg-[#050505] text-[var(--primary)] lowercase text-xl">
 {isPublic
  ? (window.location.hostname.includes('dupe')
   ? "dupemates loading..."
   : window.location.hostname.includes('blog')
  ? "blog loading..."
  : "house of mates loading...")
  : `loading ${isPkmDomain ? 'pkm' : 'app'}...`}
  </div>
 );

 // check for critical configuration
 const isConfigured = !!import.meta.env.VITE_API_URL;
 if (!isConfigured && !isPublic) {
  return (
 <Suspense fallback={LoadingFallback}>
  <SetupRequired />
 </Suspense>
  );
 }

 // public site router - bypass standard app for public domains
 if (isPublic) {
  const isBlog = window.location.hostname.includes('blog');

  if (isBlog) {
 return (
  <BrowserRouter>
   <Suspense fallback={LoadingFallback}>
  <Routes>

   <Route path="/" element={<BlogBuilder />} />
   <Route path="/:slug" element={<BlogBuilder />} />
  </Routes>
   </Suspense>
   <Toaster />
  </BrowserRouter>
 );
  }

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
  <>
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
 <Route path="/drawings/:id" element={<DrawingPage />} />
 <Route path="/databases/:name/:id" element={<RecordView />} />
 <Route path="/captures" element={<CapturesPage />} />
 <Route path="/db-canvas" element={<DatabaseCanvasView />} />
 <Route path="/page/:id" element={<PageCanvas />} />
 <Route path="/template" element={<TemplatePage />} />
 <Route path="/workspace/:id" element={<WorkspacePage />} />
   </Route>
  </Routes>
  <GlobalCommandPalette />
  <WilsonChat />
   </Suspense>
  </BrowserRouter>
 ) : <LoginPage />}
 <Toaster />
  </>
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
