import { 
    Grip,
    Handshake,
    Landmark,
    Sparkle,
    Pickaxe,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link, useNavigate } from 'react-router-dom'
import { useNavigation } from '@/components/pages/rdm/context/navigationContext'
import { menuItems } from '../context/sidebarMenuItems'

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { setCurrentSection } = useNavigation()
  const navigate = useNavigate()
  const handleItemClick = (url: string, title: string) => {
    setIsOpen(false)
    setCurrentSection(title)
    navigate(url)
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <div className="mb-2 px-2 py-2">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>

            <DropdownMenuTrigger className="flex w-full font-bold items-center text-xs focus:outline-none">
              <div className="rounded-sm pr-2 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <Grip className="w-4 h-4" />
              </div>
              Apps
            </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-bold text-muted-foreground">Home</p>
                </div>
                <DropdownMenuItem
                  className="mt-.5 mb-1.5 cursor-pointer"
                  onSelect={() => handleItemClick("/", "Primith Portal")}
                >
                  <Sparkle className="mr-2 h-4 w-4" />
                  <span className="text-xs">Primith Portal</span>
                </DropdownMenuItem>
                <Separator className="mb-1" />
                <div className="px-2 py-1.5">
                  <p className="text-xs font-bold text-muted-foreground">Your Apps</p>
                </div>
                <DropdownMenuItem className="mb-1">
                  <Handshake className="mr-2 h-4 w-4" />
                  <span className="text-xs">Primith Consulting</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="mb-1">
                  <Landmark className="mr-2 h-4 w-4" />
                  <span className="text-xs">Primith Financing</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="mb-1">
                  <Pickaxe className="mr-2 h-4 w-4" />
                  <span className="text-xs">Primith Pro</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
            {menuItems.map((item) => (
                <SidebarMenuItem key={item.title} className="py-1">
                <SidebarMenuButton asChild>
                  <Link to={item.url} onClick={() => handleItemClick(item.url, item.title)}>
                    <item.icon />
                    <span className="font-bold text-xs">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
