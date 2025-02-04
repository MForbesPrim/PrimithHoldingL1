import { 
    PanelsTopLeft,
    Box,
    Layers2,
    Grip,
    Handshake,
    Landmark,
    Sparkle,
    Pickaxe,
    Lightbulb,
    Users,
    LockKeyhole,
    StickyNote
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
import { Link } from 'react-router-dom'

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/rdm",
    icon: PanelsTopLeft,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Box,
  },
  {
    title: "Document Management",
    url: "/document-management",
    icon: Layers2,
  },
  {
    title: "Pages",
    url: "#",
    icon: StickyNote,
  },
  {
    title: "Document Insights",
    url: "#",
    icon: Lightbulb,
  },
  {
    title: "Collaborators",
    url: "#",
    icon: Users,
  },
  {
    title: "Admin Console",
    url: "#",
    icon: LockKeyhole,
  },
]

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const handleItemClick = (url: string) => {
    setIsOpen(false)
    setTimeout(() => {
      window.location.href = url
    }, 200)
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
                  onSelect={() => handleItemClick("/")}
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
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
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
