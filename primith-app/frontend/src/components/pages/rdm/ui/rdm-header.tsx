import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/ui/notification-bell"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import AuthService from '@/services/auth'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"
import { useState } from "react"

export function RdmHeader() {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false)

    const rdmAuth = AuthService.getRdmTokens()
    const user = rdmAuth?.user

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName[0]}${lastName[0]}`
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
        </TooltipProvider>

            <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage
                src="/placeholder-avatar.jpg"
                alt={user?.firstName}
                className="text-xs"
            />
            <AvatarFallback className="text-xs">
                {user ? getInitials(user.firstName, user.lastName) : 'U'}
            </AvatarFallback>
            </Avatar>
        </div>
        </header>
    )
    }
