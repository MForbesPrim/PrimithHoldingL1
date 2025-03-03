import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu"
import { Sparkle, Grip, LogOut, Settings, User, FolderClosed, Contrast, Sun, Moon, SquareArrowOutUpRight, Landmark, Handshake, Lightbulb, CircleHelp } from "lucide-react"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import AuthService from '@/services/auth'
import { NotificationBell } from "@/components/ui/notification-bell"
import { AdminNav } from './adminNav'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatBot } from "@/components/pages/portal/primithChat"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

export function PortalHomePage() {
  const user = AuthService.getUser()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false)
  const handleRdmNavigation = async () => {
    try {
      // Pass `navigate` into AuthService
      await AuthService.navigateToRdm(navigate)
    } catch (error) {
      toast({
        title: "Access Denied",
        description: (<span>You don't have access to RDM. Please contact your administrator.</span>),
        variant: "default",
        duration: 5000,
      })
    }
  }


  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`
  }

  const setTheme = (theme: string) => {
    // Logic to set the theme (e.g., update localStorage or a state management system)
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        const loginUrl = import.meta.env.MODE === 'development'
          ? 'http://portal.localhost:5173/login'
          : 'https://portal.primith.com/login'
        window.location.href = loginUrl
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  return (
<div className="min-h-screen bg-background overflow-x-hidden">
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="mr-8 flex items-center space-x-2">
          {/* Apps Menu (Grip) */}
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <div className="rounded-sm p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                      <Grip className="w-4 h-4" />
                    </div>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Apps Menu</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs ">Your Apps</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-xs mt-.5 mb-1.5">
                    <FolderClosed className="w-5 h-5" /> Primith RDM
                  </DropdownMenuItem>
                  <DropdownMenuLabel className="text-xs mb-1">More Apps</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer text-xs mb-1">
                    <Landmark className="w-5 h-5" /> Primith Financing
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs mb-1">
                    <Handshake className="w-5 h-5" /> Primith Consulting
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs mb-1">
                    <Lightbulb className="w-5 h-5" /> Primith Pro
                  </DropdownMenuItem>
                  </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/"
            className="font-bold tracking-tighter flex items-center gap-2 text-gray-500 hover:text-gray-400"
          >
            <Sparkle className="w-5 h-5" />
            <span className="bg-gradient-to-r from-gray-300 to-gray-700 text-transparent bg-clip-text text-md">
              Primith Portal
            </span>
          </Link>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <TooltipProvider>
            {/* Chat Assistant */}
            <ChatBot 
                isOpen={isChatOpen}
                setIsOpen={setIsChatOpen}
                          />
            {/* Notifications */}
            <TooltipProvider>
                <Tooltip open={showTooltip && !isNotificationOpen}>
                    <TooltipTrigger asChild>
                      <div 
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <NotificationBell 
                                isOpen={isNotificationOpen}
                                setIsOpen={setIsNotificationOpen}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Notifications</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Account Settings */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-1 hover:ring-black">
                      <AvatarImage 
                        src="/placeholder-avatar.jpg" 
                        alt={user ? `${user.firstName} ${user.lastName}` : 'User'} 
                        className="text-xs"
                      />
                      <AvatarFallback className="text-xs">
                        {user ? getInitials(user.firstName, user.lastName) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Account Settings</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      {user ? `${user.firstName} ${user.lastName}` : 'My Account'}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
  
                    <AdminNav />
                    
                    <DropdownMenuItem className="cursor-pointer text-xs flex items-center">
                      <User className="w-5 h-5 mr-2" /> 
                      <span>Account</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer text-xs flex items-center">
                        <Settings className="w-5 h-5 mr-2" /> 
                        <span>Settings</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-normal">Administration</span>
                            <p className="text-[10px] text-gray-500 mt-0.5">Control user roles and permissions</p>
                          </div>
                          <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-normal">Licensing</span>
                            <p className="text-[10px] text-gray-500 mt-0.5">View and manage licenses</p>
                          </div>
                          <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-normal">Billing</span>
                            <p className="text-[10px] text-gray-500 mt-0.5">Update your billing information</p>
                          </div>
                          <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer text-xs flex items-center">
                        <Contrast className="w-5 h-5 mr-2" /> 
                        <span>Theme</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer flex items-center p-2">
                          <Sun className="w-5 h-5 mr-2" /> 
                          <span className="text-xs font-normal">Light</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer flex items-center p-2">
                          <Moon className="w-5 h-5 mr-2" /> 
                          <span className="text-xs font-normal">Dark</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem asChild className="cursor-pointer text-xs flex items-center">
                        <a 
                            href={import.meta.env.MODE === 'development' 
                                ? 'http://support.localhost:5173'
                                : 'https://support.primith.com'
                            }
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center"
                        >
                            <CircleHelp className="w-5 h-5 mr-2" />
                            <span>Help Center</span>
                            <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500 ml-auto" />
                        </a>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xs flex items-center">
                      <LogOut className="w-5 h-5 mr-2" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </div>
    </nav>
    <div className="flex">
    <div className="w-24 shrink-0"></div>
    <main className="container px-4 py-8 max-w-full mr-10">
    <h1 className="text-3xl font-bold mb-4 dark:text-gray-300">
        Hello, {user ? `${user.firstName}` : 'User'}
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
      <Card 
        onClick={handleRdmNavigation} 
        className="cursor-pointer max-w-sm hover:shadow-lg transition-shadow"
      >
        <CardHeader>
          <CardTitle className="text-lg font-bold">Primith RDM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Click here to access the Reporting and Document Management system.
          </p>
        </CardContent>
      </Card>
      
      <Card className="max-w-sm opacity-60 cursor-not-allowed">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Primith Financing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Financial solutions and services for business operations and growth.
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">Coming soon</p>
        </CardContent>
      </Card>
      
      <Card className="max-w-sm opacity-60 cursor-not-allowed">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Primith Consulting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Expert guidance and advisory services for business optimization.
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">Coming soon</p>
        </CardContent>
      </Card>
      
      <Card className="max-w-sm opacity-60 cursor-not-allowed">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Primith Pro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Professional services and custom solutions tailored to your needs.
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">Coming soon</p>
        </CardContent>
      </Card>
    </div>
    </main>
    </div>
  </div>
  )
}