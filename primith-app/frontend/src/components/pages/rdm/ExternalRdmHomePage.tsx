import { useNavigate } from "react-router-dom"
import {
  FileText,
  Folder,
  Box,
  Layers2,
  ChevronDown,
} from "lucide-react"
import { useOrganization } from "@/components/pages/rdm/context/organizationContext"
import { useState, useEffect } from "react"
import { ProjectService } from "@/services/projectService"
import { Project } from "@/types/projects"
import { formatDistanceToNow } from "date-fns"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"

export function ExternalRdmHomePage() {
  const navigate = useNavigate()
  const { selectedOrgId } = useOrganization()
  const [showOrgWarning, setShowOrgWarning] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isProjectsOpen, setIsProjectsOpen] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedOrgId === null) {
        setShowOrgWarning(true)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [selectedOrgId])

  useEffect(() => {
    async function loadProjects() {
      if (!selectedOrgId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const projectService = new ProjectService()
        const fetchedProjects = await projectService.getProjects(selectedOrgId)
        setProjects(fetchedProjects)
      } catch (error) {
        console.error("Failed to load projects:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [selectedOrgId])

  const quickAccessCards = [
    {
      title: "Projects",
      description: "View and manage your active projects",
      icon: Box,
      route: "/rdm/projects",
    },
    {
      title: "Document Management",
      description: "Access and manage your documents and files",
      icon: Layers2,
      route: "/rdm/document-management",
    },
    {
      title: "Pages",
      description: "Create and edit documentation pages",
      icon: FileText,
      route: "/rdm/pages",
    },
  ]

  function getStatusBadgeStyles(status: string) {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function handleProjectClick(projectId: string) {
    navigate(`/rdm/projects/${projectId}`)
  }

  return (
    <div className="flex flex-1 flex-col gap-8 pr-8 pl-6 pt-8 pb-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Primith RDM</h1>
          {showOrgWarning && !selectedOrgId && (
            <div className="flex items-center gap-2 mt-2 text-yellow-600">
              <Folder className="h-4 w-4" />
              <p className="text-sm">Please select an organization to view organization-specific data</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Grid - Glassmorphism Design */}
      <div className="grid gap-6 md:grid-cols-3">
        {quickAccessCards.map((card) => (
          <div
            key={card.title}
            className={`relative cursor-pointer group overflow-hidden rounded-xl transition-all duration-300 ${
              selectedOrgId ? 'hover:translate-y-[-2px] hover:shadow-lg' : 'opacity-50'
            }`}
            onClick={() => selectedOrgId && navigate(card.route)}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              boxShadow: '0 1px 8px rgba(31, 38, 135, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              transform: 'translateY(0)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <div className="absolute -inset-1 transition-opacity rounded-xl" />
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">{card.title}</h3>
                <div className="rounded-full p-2 text-blue-500 transition-all group-hover:scale-110">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Projects Section */}
      <Collapsible
        open={isProjectsOpen}
        onOpenChange={setIsProjectsOpen}
        className="mt-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Projects</h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                isProjectsOpen ? "transform rotate-180" : ""
              }`}/>
              <span className="sr-only">Toggle projects</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-[250px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[200px]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyles(project.status)}`}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {project.description || "No description provided."}
                    </p>
                  </CardContent>
                  <CardFooter className="text-xs text-gray-500">
                    Created {formatDistanceToNow(new Date(project.createdAt))} ago
                  </CardFooter>
                </Card>
              ))}
              {projects.length === 0 && selectedOrgId && (
                <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No projects available</h3>
                  <p className="text-gray-500">
                    You are not a member of any projects in this organization
                  </p>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
} 