import "./App.css"
import { Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"

import { HomePage } from "@/components/pages/homePage"
import { LoginPage } from "@/components/pages/loginPage"
import { ContactPage } from "@/components/pages/contactUsPage"
import { PrivacyPage } from "@/components/pages/privacyNotice"
import { AuthRedirect } from "@/redirect"
import { PortalHomePage } from "@/components/pages/portal/portalHomePage"
function App() {
  const domain = window.location.hostname;
  const isPortal = domain === 'portal.primith.com' || domain === 'portal.localhost';

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      {/* Main app container */}
      <div className="flex h-screen w-screen">

        {/* 2) The right-side main area */}
        <div className="flex flex-1 flex-col">
          {/* Main content area with routes */}
          <main className="flex-1">
          <Routes>
              {isPortal  ? (
                // Portal routes
                <>
                  <Route path="/" element={<PortalHomePage />} />
                </>
              ) : (
                // Main site routes
                <>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy-policy" element={<PrivacyPage />} />
                  <Route path="/auth-redirect" element={<AuthRedirect />} />
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
