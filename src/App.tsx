
import { AuthProvider, useAuth } from "@/contexts/auth-context"
// import { LoginPage } from "@/pages/login"
// import { RootLayout } from "@/pages/root-layout"
import { Toaster } from "@/components/ui/sonner"
import { useEffect } from "react"

function AppContent() {
  const { token } = useAuth()

  // Force dark mode for this design
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-green-500">AuthProvider Working</h1>
      <p>Token status: {token ? "Logged In" : "Logged Out"}</p>
      <p>If you see 'Logged In' or 'Logged Out', the Authentication layer is solid.</p>
      <Toaster />
    </div>
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
