
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { LoginPage } from "@/pages/login"
import { RootLayout } from "@/pages/root-layout"
import { Toaster } from "@/components/ui/sonner"
import { useEffect } from "react"
import { GlobalCommandPalette } from "@/components/global-command-palette"
import { BrowserRouter } from "react-router-dom"

function AppContent() {
  const { token } = useAuth()

  // Force dark mode for this design
  useEffect(() => {
    console.log("AppContent Mounted, Token:", !!token);
    document.documentElement.classList.add('dark');
  }, [token]);

  console.log("Rendering AppContent. Token present?", !!token);

  return (

    <>
      {token ? (
        <BrowserRouter>
          <RootLayout />
          {/* <GlobalCommandPalette /> */}
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
