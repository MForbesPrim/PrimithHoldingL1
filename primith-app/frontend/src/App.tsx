// src/App.tsx

import "./App.css"
import { Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"

import { HomePage } from "@/components/pages/homePage"
import { LoginPage } from "@/components/pages/loginPage"
import { ContactPage } from "@/components/pages/contactUsPage"
import { PrivacyPage } from "@/components/pages/privacyNotice"
import { AuthRedirect } from "@/redirect"
import { ProtectedPage } from "@/components/pages/protectedPage"
import { PortalHomePage } from "@/components/pages/portal/portalHomePage"
import { ProtectedRoute } from "@/components/protectedRoute"

function App() {
  const domain = window.location.hostname
  const isPortal = domain === 'portal.primith.com' || domain === 'portal.localhost'
  const isProduction = import.meta.env.PROD // Vite sets this to true in production

  console.log('Current domain:', domain)
  console.log('isPortal:', isPortal)
  console.log('isProduction:', isProduction)
  console.log('Full URL:', window.location.href)

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      {/* Main app container */}
      <div className="flex h-screen w-screen">
        {/* Right-side main area */}
        <div className="flex flex-1 flex-col">
          {/* Main content area with routes */}
          <main className="flex-1">
            <Routes>
              {isPortal ? (
                isProduction ? (
                  // Production: Portal routes are protected
                  <>
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <PortalHomePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth-redirect" element={<AuthRedirect />} />
                    {/* Add other portal-specific routes here */}
                    <Route path="*" element={<Navigate to="/" />} />
                  </>
                ) : (
                  // Development: Portal routes are not protected
                  <>
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <PortalHomePage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth-redirect" element={<AuthRedirect />} />
                    {/* Add other portal-specific routes here */}
                    <Route path="*" element={<Navigate to="/" />} />
                  </>
                )
              ) : (
                // Main site routes
                <>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPage />} />
                  <Route path="/auth-redirect" element={<AuthRedirect />} />
                  <Route path="/protected" element={<ProtectedPage />} />
                  <Route
                    path="/portal"
                    element={
                      <ProtectedRoute>
                        <PortalHomePage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Redirect unknown routes to home */}
                  <Route path="*" element={<Navigate to="/" />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
