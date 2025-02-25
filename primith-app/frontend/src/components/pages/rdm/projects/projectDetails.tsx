"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ProjectService } from "@/services/projectService"
import { DocumentService } from "@/services/documentService"
import { PagesService } from "@/services/pagesService"
import type { Project, ProjectArtifact, RoadmapItem } from "@/types/projects"
import type { DocumentMetadata } from "@/types/document"
import type { PageNode } from "@/types/pages"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChevronLeft,
  Edit,
  Calendar,
  Clock,
  FileText,
  CheckSquare,
  List,
  SquareGanttChartIcon as SquareChartGantt,
  Settings,
  Plus,
  Activity,
  Variable,
} from "lucide-react"
import { RoadmapView } from "@/components/pages/rdm/projects/roadmapView"
import { ArtifactsPage } from "@/components/pages/rdm/projects/artifactsTable"
import { ProjectVariablesPanel } from "@/components/pages/rdm/projects/projectVariables"
import { EditProjectDialog } from "@/components/pages/rdm/projects/editProjectDialog"

interface ProjectActivity {
  id: string
  description: string
  timestamp: string
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([])
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([])
  const [recentActivity, setRecentActivity] = useState<ProjectActivity[]>([])
  const [associatedDocuments, setAssociatedDocuments] = useState<DocumentMetadata[]>([])
  const [associatedPages, setAssociatedPages] = useState<PageNode[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [editingProject, setEditingProject] = useState(false)

  const projectService = new ProjectService()
  const documentService = new DocumentService()
  const pagesService = new PagesService()
  const navigate = useNavigate()

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  async function loadProjectData() {
    try {
      if (!projectId) return
      setLoading(true)
      
      // Load project details
      const projectData = await projectService.getProjectById(projectId)
      setProject(projectData)
      
      // Load artifacts
      const artifactsData = await projectService.getProjectArtifacts(projectId)
      setArtifacts(artifactsData)
      
      // Load roadmap items
      const roadmapData = await projectService.getRoadmapItems(projectId)
      setRoadmapItems(roadmapData)
      
      // Load associated documents & pages
      loadAssociatedDocuments()
      loadAssociatedPages()
      
      // Mock activity data - replace with actual service call when available
      const activityData: ProjectActivity[] = [
        {
          id: "1",
          description: "Project created",
          timestamp: new Date(projectData.createdAt).toISOString()
        },
        {
          id: "2", 
          description: "Status updated to " + projectData.status,
          timestamp: new Date(projectData.updatedAt).toISOString()
        }
      ]
      setRecentActivity(activityData)
    } catch (error) {
      console.error("Failed to load project data:", error)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadAssociatedDocuments() {
    if (!projectId || !project?.organizationId) return;
    try {
      const docs = await documentService.getDocuments(null, project.organizationId, projectId);
      setAssociatedDocuments(docs);
    } catch (error) {
      console.error("Failed to load associated documents:", error);
    }
  }
  
  async function loadAssociatedPages() {
    if (!projectId || !project?.organizationId) return;
    try {
      const pages = await pagesService.getPages(project.organizationId, projectId);
      setAssociatedPages(pages);
    } catch (error) {
      console.error("Failed to load associated pages:", error);
    }
  }

  const handleUpdateProject = async (updatedProject: Partial<Project>) => {
    try {
      if (!project?.id) return
      // Update project in the database
      await projectService.updateProject(project.id, updatedProject)
      // Update local state with the new project data
      setProject((prev) => prev ? { ...prev, ...updatedProject } : null)
      setEditingProject(false)
    } catch (error) {
      console.error("Failed to update project:", error)
      // Optionally, add error feedback UI here
    }
  }

  function handleBackClick() {
    navigate("/rdm/projects", { state: { updatedProject: project } });
  }
  
  async function handleDownloadDocument(documentId: string, fileName: string) {
    try {
      const blob = await documentService.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }

  if (loading) {
    return (
      <div className="container h-full overflow-y-auto p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBackClick}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
        </div>
        <div className="animate-pulse">
          <div className="h-8 w-1/3 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-2/3 bg-gray-200 rounded mb-8"></div>
          <div className="h-48 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container h-full overflow-y-auto pl-4">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBackClick}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-gray-500 mb-6">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={handleBackClick}>Go Back to Projects</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <EditProjectDialog
        open={editingProject}
        onClose={() => setEditingProject(false)}
        project={project}
        onSave={handleUpdateProject}
      />
      <div className="mb-4">
        <div className="flex justify-between items-center mb-4">
          <Button variant="outline" size="sm" onClick={handleBackClick} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setEditingProject(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-1">{project.name}</h1>
          <p className="text-gray-600">{project.description}</p>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="border-b w-full justify-start rounded-md pb-0 pt-0">
          <TabsTrigger value="overview" className="rounded-t-lg">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="artifacts" className="rounded-t-lg">
            <List className="h-4 w-4 mr-2" />
            Artifacts
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="rounded-t-lg">
            <SquareChartGantt className="h-4 w-4 mr-2" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="variables" className="rounded-t-lg">
            <Variable className="h-4 w-4 mr-2" />
            Variables
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-medium">Start Date</h3>
                    <p className="text-xs">
                    {project.startDate ? project.startDate.split('T')[0] : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <div>
                    <h3 className="text-sm font-medium">End Date</h3>
                    <p className="text-xs">
                    {project.endDate ? project.endDate.split('T')[0] : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-green-500" />
                  <div>
                    <h3 className="text-sm font-medium">Status</h3>
                    <p className="capitalize text-xs">{project.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Recent Artifacts</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </CardHeader>
              <CardContent>
              {artifacts && artifacts.length > 0 ? (
                  <div className="space-y-4">
                    {artifacts.slice(0, 5).map((artifact) => (
                      <div
                        key={artifact.id}
                        className="p-3 rounded-md border hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{artifact.name}</h4>
                            <p className="text-sm text-gray-500">
                              {artifact.type} • {artifact.status}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full mt-4">
                      View All Artifacts
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No artifacts yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="p-3 rounded-md border hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                          </div>
                          <Activity className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full mt-4">
                      View All Activity
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
                    <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No activity yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="artifacts">
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-md font-semibold">All Artifacts</h2>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Add Artifact
              </Button>
            </div>
            <ArtifactsPage
              artifacts={artifacts}
              onStatusChange={async (artifactId: string, status: string) => {
                await projectService.updateArtifactStatus(artifactId, status)
                loadProjectData()
              }}
            />
          </div>
        </TabsContent>
        <TabsContent value="documents">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Project Documents</h2>
              <Button onClick={() => navigate("/rdm/documents")}>
                Browse Documents
              </Button>
            </div>
            
            {associatedDocuments.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {associatedDocuments.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{doc.fileType}</TableCell>
                        <TableCell>{new Date(doc.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDownloadDocument(doc.id, doc.name)}
                          >
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center p-8 border rounded-md bg-gray-50">
                <p className="text-gray-500 mb-4">No documents associated with this project yet.</p>
                <Button onClick={() => navigate("/rdm/documents")}>
                  Add Documents
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="pages">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Project Pages</h2>
              <Button onClick={() => navigate("/rdm/pages")}>
                Browse Pages
              </Button>
            </div>
            
            {associatedPages.length > 0 ? (
              <div className="grid gap-4">
                {associatedPages.map(page => (
                  <Card key={page.id} className="p-4 cursor-pointer" onClick={() => navigate(`/rdm/pages?pageId=${page.id}`)}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium">{page.name}</h3>
                        <p className="text-sm text-gray-500">
                          Updated {new Date(page.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 border rounded-md bg-gray-50">
                <p className="text-gray-500 mb-4">No pages associated with this project yet.</p>
                <Button onClick={() => navigate("/rdm/pages")}>
                  Add Pages
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="roadmap">
          <RoadmapView
            items={roadmapItems}
            onItemCreate={async (item: Partial<RoadmapItem>) => {
              await projectService.createRoadmapItem(item)
              loadProjectData()
            }}
            onItemUpdate={async (itemId: string, item: Partial<RoadmapItem>) => {
              await projectService.updateRoadmapItem(itemId, item)
              loadProjectData()
            }}
          />
        </TabsContent>
        <TabsContent value="variables">
          <ProjectVariablesPanel projectId={project.id} projectService={projectService} />
        </TabsContent>
      </Tabs>
    </div>
  )
}