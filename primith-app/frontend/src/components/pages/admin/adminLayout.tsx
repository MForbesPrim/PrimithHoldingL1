import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Shield, ArrowLeft, User, Settings, Contrast, Sun, Moon, LogOut, SquareArrowOutUpRight } from 'lucide-react'
import AuthService from '@/services/auth'
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
import { AdminNav } from '../portal/adminNav'


export function AdminLayout() {
    const navigate = useNavigate()
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
    const user = AuthService.getUser()

    const handleGoBack = () => {
        navigate(-1)
    }

    useEffect(() => {
    const checkAdmin = async () => {
        const adminStatus = await AuthService.isSuperAdmin()
        setIsAdmin(adminStatus)
    }
    checkAdmin()
    }, [])

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

    if (isAdmin === null) {
        return null
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />
    }

    return (
        <div className="flex-1">
        <div className="flex items-center justify-between px-4 h-16 border-b">
        <div className="flex items-center gap-4">
            <button 
                onClick={handleGoBack}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
                <Shield className="w-6 h-6" />
                <h1 className="text-2xl font-bold text-[#172B4D] dark:text-gray-300">Admin Portal</h1>
            </div>
            </div>

            {/* Add Avatar Dropdown */}
            <div className="flex items-center space-x-4">
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
                
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-xs flex items-center">
                    <LogOut className="w-5 h-5 mr-2" />
                    <span>Log out</span>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </div>
        </div>
        <div className="p-6">
            <Outlet />
        </div>
        </div>
  )
}