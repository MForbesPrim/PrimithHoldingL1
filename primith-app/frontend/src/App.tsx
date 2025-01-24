import "./App.css"
import { Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"

import { HomePage } from "@/components/pages/homePage"
import { LoginPage } from "@/components/pages/loginPage"
import { ContactPage } from "@/components/pages/contactUsPage"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {/* Main app container */}
      <div className="flex h-screen w-screen">

        {/* 2) The right-side main area */}
        <div className="flex flex-1 flex-col">
          {/* Main content area with routes */}
          <main className="flex-1">
            <Routes>
              {/* Home page */}
              <Route path="/" element={<HomePage/>} />
              {/* Login page */}
              <Route
                path="/login"
                element={
                  <LoginPage
                  />
                }
              />
              <Route
                path="/contact"
                element={
                  <ContactPage
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
