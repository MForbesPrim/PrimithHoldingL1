import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SidebarProvider } from "@/components/ui/sidebar"
import { BrowserRouter } from "react-router-dom"
import { ClerkProvider } from "@clerk/clerk-react"

const domain = window.location.hostname;
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const isProduction = domain === 'primith.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}
      signInFallbackRedirectUrl={isProduction ? 'https://portal.primith.com' : 'http://portal.localhost:5173'}
      allowedRedirectOrigins={[
        isProduction ? 
          'https://portal.primith.com' : 
          'http://portal.localhost:5173'
      ]}>
      <SidebarProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SidebarProvider>
    </ClerkProvider>
  </StrictMode>
)
