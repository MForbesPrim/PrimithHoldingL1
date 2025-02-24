import { useState, useEffect } from "react";
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";
import { ProjectService } from "@/services/projectService";
import { Project } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: "",
    description: "",
    status: "active"
  });
  const [currentView, setCurrentView] = useState<"card" | "list">("card");
  
  const { selectedOrgId } = useOrganization();
  const projectService = new ProjectService();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (selectedOrgId) {
      loadProjects();
    }
  }, [selectedOrgId]);

  // Check for updated project from navigation state
  useEffect(() => {
    const updatedProject = location.state?.updatedProject;
    if (updatedProject) {
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
      );
      // Clear the navigation state to prevent re-processing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

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

  async function loadProjects() {
    try {
      setLoading(true);
      const fetchedProjects = await projectService.getProjects(selectedOrgId);
      setProjects(fetchedProjects);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!selectedOrgId || !newProject.name) return;
    
    try {
      const createdProject = await projectService.createProject({
        ...newProject,
        organizationId: selectedOrgId
      });
      setProjects((prev) => Array.isArray(prev) ? [...prev, createdProject] : [createdProject]);
      setShowNewProjectDialog(false);
      setNewProject({
        name: "",
        description: "",
        status: "active"
      });
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  }

  function handleProjectClick(projectId: string) {
    navigate(`/rdm/projects/${projectId}`);
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setShowNewProjectDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "card" | "list")} className="mb-6">
        <TabsList>
          <TabsTrigger value="card">Card View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
      </Tabs>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-4 w-1/3" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : currentView === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
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
          {(projects ?? []).length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first project to start organizing your work
              </p>
              <Button onClick={() => setShowNewProjectDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects?.map((project) => (
                <tr 
                  key={project.id} 
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <td className="px-4 py-3 text-sm">{project.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(projects ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <p className="text-gray-500">No projects found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter the details for your new project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium mb-1 block">
                Project Name
              </label>
              <Input
                id="name"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium mb-1 block">
                Description
              </label>
              <Textarea
                id="description"
                value={newProject.description || ""}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter project description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProject.name}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}