import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/ui/notification-bell"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminNav } from '@/components/pages/portal/adminNav'
import AuthService from '@/services/auth'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
import { useState } from "react"
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
  import { LogOut, User, Contrast, Sun, Moon, SquareArrowOutUpRight, CircleHelp, Settings } from "lucide-react"

export function RdmHeader() {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false)

    const rdmAuth = AuthService.getRdmTokens()
    const user = rdmAuth?.user

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName[0]}${lastName[0]}`
    }

    const setTheme = (theme: string) => {
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
        <header className="flex h-16 shrink-0 items-center border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />

        <Breadcrumb>
            <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbLink href="#" className="flex items-center gap-1 font-bold">
                Primith RDM
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage className="font-regular text-[#172B4D]">
                Dashboard
                </BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
        
        <div className="ml-auto flex items-center space-x-4">
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
        </header>
    )
}
