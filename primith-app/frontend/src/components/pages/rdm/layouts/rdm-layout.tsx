import { ReactNode, useEffect } from 'react'
import { AppSidebar } from "../ui/app-sidebar"
import { RdmHeader } from "../ui/rdm-header"
import { NavigationProvider } from "@/components/pages/rdm/context/navigationContext"
import { NotificationProvider } from "@/components/pages/rdm/context/notificationContext"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useLocation } from 'react-router-dom'
import { useNavigation } from '@/components/pages/rdm/context/navigationContext'
import { menuItems } from '../context/sidebarMenuItems'

interface RdmLayoutProps {
  children: ReactNode
}

function NavigationWrapper({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { setCurrentSection } = useNavigation()

  useEffect(() => {
    const currentRoute = menuItems.find(item => item.url === location.pathname)
    if (currentRoute) {
      setCurrentSection(currentRoute.title)
    }
  }, [location.pathname, setCurrentSection])

  return <>{children}</>
}

export function RdmLayout({ children }: RdmLayoutProps) {
  return (
    <NavigationProvider>
      <NavigationWrapper>
      <NotificationProvider>
        <SidebarProvider>
          <AppSidebar />
            <SidebarInset>
              <RdmHeader />
              <main className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto pl-4">
                {children}
                </div>
              </main>
            </SidebarInset>
          </SidebarProvider>
        </NotificationProvider>
      </NavigationWrapper>
    </NavigationProvider>
  )
}