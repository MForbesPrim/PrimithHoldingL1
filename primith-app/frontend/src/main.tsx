import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SidebarProvider } from "@/components/ui/sidebar"
import { BrowserRouter } from "react-router-dom"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <SidebarProvider defaultOpen={true}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SidebarProvider>
  </StrictMode>
)
