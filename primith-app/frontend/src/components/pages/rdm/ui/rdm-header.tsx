import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/ui/notification-bell"
import {
 Breadcrumb,
 BreadcrumbItem,
 BreadcrumbLink,
 BreadcrumbList,
 BreadcrumbPage,
 BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminNav } from "@/components/pages/portal/adminNav"
import AuthService from "@/services/auth"
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
 DropdownMenuSub,
 DropdownMenuSubTrigger,
 DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
 X, 
 Box, 
 LogOut,
 User,
 Contrast,
 Sun,
 Moon,
 SquareArrowOutUpRight,
 CircleHelp,
 Settings,
 Check,
 ChevronsUpDown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Organization } from "@/types/document"
import { useOrganization } from '@/components/pages/rdm/context/organizationContext'
import { useNavigation } from '@/components/pages/rdm/context/navigationContext'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
 Command,
 CommandInput,
 CommandList,
 CommandEmpty,
 CommandGroup,
 CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { ProjectService } from "@/services/projectService"
import { Project } from "@/types/projects"

// OrgCombobox component inline
function OrgCombobox({
 organizations,
 selectedOrg,
 onOrgChange,
}: {
 organizations: Organization[]
 selectedOrg: string
 onOrgChange: (orgId: string) => void
}) {
 const [open, setOpen] = useState(false)

 const selectedOrgName =
   organizations.find((org) => org.id === selectedOrg)?.name ||
   "Select Organization"

 return (
   <Popover open={open} onOpenChange={setOpen}>
     <PopoverTrigger asChild>
       <Button
         variant="outline"
         role="combobox"
         aria-expanded={open}
         className="w-[200px] justify-between text-sm h-8"
       >
         {selectedOrgName}
         <ChevronsUpDown className="opacity-50" />
       </Button>
     </PopoverTrigger>
     <PopoverContent className="w-[200px] p-0">
       <Command>
         <CommandInput placeholder="Search organization..." className="h-9" />
         <CommandList>
           <CommandEmpty>No organization found.</CommandEmpty>
           <CommandGroup>
             {organizations.map((org) => (
               <CommandItem
                 key={org.id}
                 value={org.id}
                 onSelect={() => {
                   onOrgChange(org.id)
                   setOpen(false)
                 }}
                 className="text-sm"
               >
                 {org.name}
                 <Check
                   className={cn(
                     "ml-auto",
                     selectedOrg === org.id ? "opacity-100" : "opacity-0"
                   )}
                 />
               </CommandItem>
             ))}
           </CommandGroup>
         </CommandList>
       </Command>
     </PopoverContent>
   </Popover>
 )
}

// ProjectCombobox component inline
function ProjectCombobox({
 projects,
 selectedProjectId,
 onProjectChange,
}: {
 projects: Project[]
 selectedProjectId: string | null
 onProjectChange: (projectId: string | null) => void
}) {
 const [open, setOpen] = useState(false)

 const selectedProjectName =
   selectedProjectId && projects.find((project) => project.id === selectedProjectId)?.name ||
   "Select Project"

 return (
   <Popover open={open} onOpenChange={setOpen}>
     <PopoverTrigger asChild>
       <Button
         variant="outline"
         role="combobox"
         aria-expanded={open}
         className="w-[200px] justify-between text-sm h-8"
       >
         {selectedProjectName}
         <ChevronsUpDown className="opacity-50" />
       </Button>
     </PopoverTrigger>
     <PopoverContent className="w-[200px] p-0">
       <Command>
         <CommandInput placeholder="Search project..." className="h-9" />
         <CommandList>
           <CommandEmpty>No project found.</CommandEmpty>
           <CommandGroup>
             {/* Only show Clear Selection if a project is selected */}
             {selectedProjectId && (
               <CommandItem
                 value="clear-selection"
                 onSelect={() => {
                   onProjectChange(null)
                   setOpen(false)
                 }}
                 className="text-sm text-muted-foreground"
               >
                 <X className="w-4 h-4 mr-2" />
                 Clear selection
               </CommandItem>
             )}
             {projects.map((project) => (
               <CommandItem
                 key={project.id}
                 value={project.id}
                 onSelect={() => {
                   onProjectChange(project.id)
                   setOpen(false)
                 }}
                 className="text-sm"
               >
                 <Box className="w-4 h-4 mr-2" />
                 {project.name}
                 <Check
                   className={cn(
                     "ml-auto",
                     selectedProjectId === project.id ? "opacity-100" : "opacity-0"
                   )}
                 />
               </CommandItem>
             ))}
           </CommandGroup>
         </CommandList>
       </Command>
     </PopoverContent>
   </Popover>
 )
}

export function RdmHeader() {
 const { 
   organizations,
   setOrganizations,
   selectedOrgId,
   setSelectedOrgId,
   isSuperAdmin,
 } = useOrganization()
 
 const { currentSection, setCurrentSection } = useNavigation()
 const { toast } = useToast()
 const [showTooltip, setShowTooltip] = useState(false)
 const [isNotificationOpen, setIsNotificationOpen] = useState(false)
 const rdmAuth = AuthService.getRdmTokens()
 const user = rdmAuth?.user

 // State for projects and selected project
 const [projects, setProjects] = useState<Project[]>([])
 const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
 const projectService = new ProjectService()

 useEffect(() => {
   loadOrganizations()
   const savedProjectId = localStorage.getItem('selectedProjectId')
   if (savedProjectId) {
     setSelectedProjectId(savedProjectId)
   }
 }, [isSuperAdmin])

 useEffect(() => {
   if (selectedOrgId) {
     loadProjects()
   }
 }, [selectedOrgId]) // Load projects when organization changes

 async function loadOrganizations() {
   try {
     let loadedOrgs: Organization[]
     if (isSuperAdmin) {
       loadedOrgs = await AuthService.getOrganizations()
     } else {
       loadedOrgs = await AuthService.getRdmOrganizations()
     }
     setOrganizations(loadedOrgs)
     
     const primithOrg = loadedOrgs.find((org) => org.name === "Primith")
     if (primithOrg) {
       setSelectedOrgId(primithOrg.id)
     } else if (loadedOrgs.length > 0) {
       setSelectedOrgId(loadedOrgs[0].id) // fallback to the first org
     }
   } catch (error) {
     console.error("Failed to load organizations:", error)
     toast({
       title: "Error",
       description: "Failed to load organizations. Please try again.",
       variant: "destructive",
       duration: 5000
     })
   }
 }

 async function loadProjects() {
   try {
     if (selectedOrgId) {
       const fetchedProjects = await projectService.getProjects(selectedOrgId)
       setProjects(fetchedProjects)
       
       // Check if saved project exists in new project list
       const savedProjectId = localStorage.getItem('selectedProjectId')
       if (savedProjectId && fetchedProjects.some(p => p.id === savedProjectId)) {
         setSelectedProjectId(savedProjectId)
       } else {
         localStorage.removeItem('selectedProjectId') // Clear if project no longer exists
         setSelectedProjectId(null)
       }
     }
   } catch (error) {
     console.error("Failed to load projects:", error)
     toast({
       title: "Error",
       description: "Failed to load projects. Please try again.",
       variant: "destructive",
       duration: 5000
     })
   }
 }

 function handleOrgChange(orgId: string) {
   setSelectedOrgId(orgId)
   setProjects([]) // Reset projects when org changes
   setSelectedProjectId(null) // Reset selected project to null
   localStorage.removeItem('selectedProjectId') // Clear stored project
   setCurrentSection("Projects") // Reset to default section
   const selectedOrg = organizations.find((org) => org.id === orgId)
   toast({
     title: "Organization Changed",
     description: `Switched to ${selectedOrg?.name}`,
     duration: 5000
   })
 }

 function handleProjectChange(projectId: string | null) {
   setSelectedProjectId(projectId)
   if (projectId) {
     localStorage.setItem('selectedProjectId', projectId)
     const selectedProject = projects.find((project) => project.id === projectId)
     if (selectedProject) {
       toast({
         title: "Project Changed",
         description: `Switched to ${selectedProject.name}`,
         duration: 5000
       })
     }
   } else {
     localStorage.removeItem('selectedProjectId') // Remove from localStorage when cleared
     toast({
       title: "Project Cleared",
       description: "No project selected",
       duration: 5000
     })
   }
 }

 const getInitials = (firstName: string, lastName: string) => {
   return `${firstName[0]}${lastName[0]}`
 }

 const setTheme = (theme: string) => {
   document.documentElement.classList.remove("light", "dark")
   document.documentElement.classList.add(theme)
   localStorage.setItem("theme", theme)
 }

 const handleLogout = async () => {
   try {
     const response = await fetch(
       `${import.meta.env.VITE_API_URL}/logout`,
       {
         method: "POST",
         credentials: "include",
       }
     )
     if (response.ok) {
       localStorage.removeItem("accessToken")
       localStorage.removeItem("refreshToken")
       const loginUrl =
         import.meta.env.MODE === "development"
           ? "http://portal.localhost:5173/login"
           : "https://portal.primith.com/login"
       window.location.href = loginUrl
     } else {
       console.error("Logout failed")
     }
   } catch (error) {
     console.error("Error during logout:", error)
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
           <OrgCombobox
             organizations={organizations}
             selectedOrg={selectedOrgId}
             onOrgChange={handleOrgChange}
           />
         </BreadcrumbItem>

         <BreadcrumbSeparator />
         <BreadcrumbItem>
           <BreadcrumbPage className="font-regular text-[#172B4D]">
             {currentSection}
           </BreadcrumbPage>
         </BreadcrumbItem>

         <BreadcrumbSeparator />
         <BreadcrumbItem>
           <ProjectCombobox
             projects={projects}
             selectedProjectId={selectedProjectId}
             onProjectChange={handleProjectChange}
           />
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
                     alt={
                       user
                         ? `${user.firstName} ${user.lastName}`
                         : "User"
                     }
                     className="text-xs"
                   />
                   <AvatarFallback className="text-xs">
                     {user ? getInitials(user.firstName, user.lastName) : "U"}
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
               {user ? `${user.firstName} ${user.lastName}` : "My Account"}
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
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Control user roles and permissions
                      </p>
                    </div>
                    <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                  </DropdownMenuItem>

                  <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-normal">Licensing</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        View and manage licenses
                      </p>
                    </div>
                    <SquareArrowOutUpRight className="w-4 h-4 mt-1 text-gray-500" />
                  </DropdownMenuItem>

                  <DropdownMenuItem className="cursor-pointer text-xs font-light flex justify-between items-start p-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-normal">Billing</span>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Update your billing information
                      </p>
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
                  <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="cursor-pointer flex items-center p-2"
                  >
                    <Sun className="w-5 h-5 mr-2" />
                    <span className="text-xs font-normal">Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="cursor-pointer flex items-center p-2"
                  >
                    <Moon className="w-5 h-5 mr-2" />
                    <span className="text-xs font-normal">Dark</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                asChild
                className="cursor-pointer text-xs flex items-center"
              >
                <a                  // This opening tag was missing
                  href={
                    import.meta.env.MODE === "development"
                      ? "http://support.localhost:5173"
                      : "https://support.primith.com"
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

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-xs flex items-center"
              >
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