import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu"
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
import { Sparkle, Grip, LogOut, Settings, User, FolderClosed, Contrast, Sun, Moon } from "lucide-react"
import { Link } from "react-router-dom"
import AuthService from '@/services/auth'

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
              <DropdownMenuLabel>Your Apps</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-xs"><FolderClosed className="w-5 h-5" /> ATR Reporting</DropdownMenuItem>
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

          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Dashboard</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 w-[200px]">
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#" className="text-sm block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          Overview
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#" className="text-sm block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          Analytics
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Settings</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 w-[200px]">
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#" className="text-sm block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          Profile
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a href="#" className="text-sm block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                          Preferences
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="ml-auto flex items-center space-x-4">
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
            <DropdownMenuItem className="cursor-pointer text-xs"><User className="w-5 h-5" /> Account</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs"><Settings className="w-5 h-5" /> Settings</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer text-xs"><Contrast className="w-5 h-5" /> Theme</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer text-xs"><Sun className="w-5 h-5" /> Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer text-xs"><Moon className="w-5 h-5" /> Dark</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xs">
              <LogOut className="w-5 h-5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Portal</h1>
        <p className="text-xl mb-8">You are successfully authenticated!</p>
      </main>
    </div>
  )
}