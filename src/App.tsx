
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { LoginPage } from "@/pages/login"
import { RootLayout } from "@/pages/root-layout"
import { Toaster } from "@/components/ui/sonner"
import { useEffect } from "react"

function AppContent() {
  const { token } = useAuth()

  // Force dark mode for this design
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <>
      {token ? <RootLayout /> : <LoginPage />}
      <Toaster />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
