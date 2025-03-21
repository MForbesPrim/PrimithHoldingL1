import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SidebarProvider } from "@/components/ui/sidebar"
import { BrowserRouter } from "react-router-dom"
import { OrganizationProvider } from '@/components/pages/rdm/context/organizationContext'
import { ProjectProvider } from '@/components/pages/rdm/context/projectContext';
import { NotificationProvider } from "@/components/pages/rdm/context/notificationContext"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <SidebarProvider defaultOpen={true}>
        <BrowserRouter>
        <OrganizationProvider>
          <ProjectProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </ProjectProvider>
        </OrganizationProvider>
        </BrowserRouter>
      </SidebarProvider>
  </StrictMode>
)
