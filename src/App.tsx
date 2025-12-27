
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { LoginPage } from "@/pages/login"
import { RootLayout } from "@/pages/root-layout"
import { Toaster } from "@/components/ui/sonner"
import { useEffect } from "react"
import { GlobalCommandPalette } from "@/components/global-command-palette"
import { Routes, Route, BrowserRouter } from "react-router-dom"
import { HomePage } from "@/pages/home"
import { DatabasesPage } from "@/pages/databases"
import { CollectionDetailPage } from "@/pages/collection-detail"
import { HeadmatesPage } from "@/pages/headmates"
import { MoodboardPage } from "@/pages/moodboard" // Will create this next

function AppContent() {
  const { token } = useAuth()

  // Force dark mode for this design
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, [token]);

  return (

    <>
      {token ? (
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/databases" element={<DatabasesPage />} />
              <Route path="/databases/:name" element={<CollectionDetailPage />} />
              <Route path="/headmates" element={<HeadmatesPage />} />
              <Route path="/board" element={<MoodboardPage />} />
            </Route>
          </Routes>
          <GlobalCommandPalette />
        </BrowserRouter>
      ) : <LoginPage />}
      <Toaster />
    </>
  )
}

import { FronterProvider } from "@/contexts/fronter-context"

function App() {
  return (
    <AuthProvider>
      <FronterProvider>
        <AppContent />
      </FronterProvider>
    </AuthProvider>
  )
}

export default App
