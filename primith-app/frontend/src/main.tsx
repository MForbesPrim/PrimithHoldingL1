import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SidebarProvider } from "@/components/ui/sidebar"
import { BrowserRouter } from "react-router-dom"
import { OrganizationProvider } from '@/components/pages/rdm/context/organizationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <SidebarProvider defaultOpen={true}>
        <BrowserRouter>
        <OrganizationProvider>
          <App />
        </OrganizationProvider>
        </BrowserRouter>
      </SidebarProvider>
  </StrictMode>
)
