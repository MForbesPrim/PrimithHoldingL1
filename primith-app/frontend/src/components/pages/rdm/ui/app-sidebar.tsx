import { 
  Grip,
  Handshake,
  Landmark,
  Sparkle,
  Pickaxe,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
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
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useNavigation } from '@/components/pages/rdm/context/navigationContext'
import { menuItems } from '../context/sidebarMenuItems'
import AuthService from '@/services/auth'

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExternalUser, setIsExternalUser] = useState(false)
  const { currentSection, setCurrentSection } = useNavigation()
  const navigate = useNavigate()
  const location = useLocation()
  
  useEffect(() => {
    const checkMembershipType = async () => {
      try {
        const membershipType = await AuthService.getMembershipType();
        setIsExternalUser(membershipType === true);
      } catch (error) {
        console.error("Failed to check membership type:", error);
      }
    };
    
    checkMembershipType();
  }, []);

  const handleItemClick = (url: string, title: string) => {
    setIsOpen(false)
    setCurrentSection(title)
    navigate(url)
  }
  
  // Filter menu items based on membership type
  const filteredMenuItems = menuItems.filter(item => {
    // Hide specific sections when user is external (membershipType = true)
    if (isExternalUser && (item.title === "Collaborators" || item.title === "Document Insights")) {
      return false;
    }
    return true;
  });

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
                  className={`mt-.5 mb-1.5 cursor-pointer ${
                    currentSection === "Primith Portal" 
                    ? "bg-accent text-accent-foreground border border-white/20 rounded-sm" 
                    : ""
                  }`}
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
          <SidebarGroupContent className="mt-1">
            <SidebarMenu>
            {filteredMenuItems.map((item) => {
              const isActive = currentSection === item.title || location.pathname === item.url;
              return (
                <SidebarMenuItem key={item.title} className="py-1">
                  <SidebarMenuButton 
                    asChild 
                    className={isActive 
                      ? "bg-accent text-accent-foreground border rounded-sm" 
                      : ""
                    }
                  >
                    <Link to={item.url} onClick={() => handleItemClick(item.url, item.title)}>
                      <item.icon className={isActive ? "text-accent-foreground" : ""} />
                      <span className={`font-bold text-xs ${isActive ? "text-accent-foreground" : ""}`}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )})}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}