// src/components/pages/rdm/layouts/rdm-layout.tsx
import { ReactNode } from 'react'
import { AppSidebar } from "../ui/app-sidebar"
import { RdmHeader } from "../ui/rdm-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

interface RdmLayoutProps {
  children: ReactNode
}

export function RdmLayout({ children }: RdmLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <RdmHeader />
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}