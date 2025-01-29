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
import { Sparkle, Grip, LogOut, Settings, User, FolderClosed, Contrast, Sun, Moon, SquareArrowOutUpRight, Landmark, Handshake } from "lucide-react"
import { Link } from "react-router-dom"
import AuthService from '@/services/auth'
import { NotificationBell } from "@/components/ui/notification-bell"
import { AdminNav } from './adminNav'

export function PortalHomePage() {
  const user = AuthService.getUser()

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
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="flex h-16 items-center px-4">
        <div className="mr-8 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <div className="rounded-sm p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer">
              <Grip className="w-4 h-4" />
            </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs">Your Apps</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-xs"><FolderClosed className="w-5 h-5" /> Primith ATR</DropdownMenuItem>
              <DropdownMenuLabel className="pt-4 text-xs">More Apps</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-xs"><Landmark className="w-5 h-5" /> Primith Financing</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-xs"><Handshake className="w-5 h-5" /> Primith Consulting</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            to="/"
            className="font-bold tracking-tighter flex items-center gap-2 text-gray-500 hover:text-gray-400 ml-3"
          >
            <Sparkle className="w-5 h-5" />
            <span className="bg-gradient-to-r from-gray-300 to-gray-700 text-transparent bg-clip-text text-md">Primith Portal</span>
          </Link>
        </div>

          <div className="ml-auto flex items-center space-x-4">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="relative h-8 w-8 text-sm rounded-full hover:ring-1 hover:ring-black focus:ring-0 active:ring-0 data-[state=open]:ring-0 cursor-pointer">
                <AvatarImage 
                  src="/placeholder-avatar.jpg" 
                  alt={user ? `${user.firstName} ${user.lastName}` : 'User'} 
                />
                <AvatarFallback>
                  {user ? getInitials(user.firstName, user.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {user ? `${user.firstName} ${user.lastName}` : 'My Account'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <AdminNav />
              
              {/* Account Menu Item */}
              <DropdownMenuItem className="cursor-pointer text-xs flex items-center">
                <User className="w-5 h-5 mr-2" /> 
                <span>Account</span>
              </DropdownMenuItem>
              
              {/* Settings Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer text-xs flex items-center">
                  <Settings className="w-5 h-5 mr-2" /> 
                  <span>Settings</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  
                  {/* Administration with Description */}
                  <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-normal">Administration</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">Control user roles and permissions</p>
                    </div>
                    <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                  </DropdownMenuItem>
                  
                  {/* Licensing with Description */}
                  <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-normal">Licensing</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">View and manage licenses</p>
                    </div>
                    <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                  </DropdownMenuItem>
                  
                  {/* Billing with Description */}
                  <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-normal">Billing</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">Update your billing information</p>
                    </div>
                    <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                  </DropdownMenuItem>
                  
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              {/* Theme Submenu */}
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
              
              <DropdownMenuSeparator />
              
              {/* Log Out Menu Item */}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xs flex items-center">
                <LogOut className="w-5 h-5 mr-2" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4 text-[#172B4D] dark:text-gray-300">
          Hello, {user ? `${user.firstName}` : 'User'}
        </h1>
      </main>
    </div>
  )
}