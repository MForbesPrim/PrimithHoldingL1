import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SidebarProvider } from "@/components/ui/sidebar"
import { BrowserRouter } from "react-router-dom"
import { OrganizationProvider } from '@/components/pages/rdm/context/organizationContext'
import { ProjectProvider } from '@/components/pages/rdm/context/projectContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <SidebarProvider defaultOpen={true}>
        <BrowserRouter>
        <OrganizationProvider>
          <ProjectProvider>
          <App />
          </ProjectProvider>
        </OrganizationProvider>
        </BrowserRouter>
      </SidebarProvider>
  </StrictMode>
)
