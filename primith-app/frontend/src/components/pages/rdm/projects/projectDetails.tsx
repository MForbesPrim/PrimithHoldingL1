import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProjectService } from "@/services/projectService";
import { DocumentService } from "@/services/documentService";
import { PagesService } from "@/services/pagesService";
import type { Project, ProjectArtifact, RoadmapItem, ProjectActivity, ArtifactStatus } from "@/types/projects";
import type { DocumentMetadata } from "@/types/document";
import type { PageNode } from "@/types/pages";
import { Button } from "@/components/ui/button";
import { ProjectSettings } from "@/components/pages/rdm/projects/projectSettings";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity as ActivityIcon,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Edit,
  Calendar,
  Clock,
  Flag,
  FileText,
  CheckSquare,
  List,
  SquareGanttChartIcon as SquareChartGantt,
  Settings,
  Package,
  Plus,
  Activity,
  Variable,
  Loader2
} from "lucide-react";
import { RoadmapView } from "@/components/pages/rdm/projects/roadmapView";
import { ArtifactsPage } from "@/components/pages/rdm/projects/artifactsTable";
import { TasksView } from "@/components/pages/rdm/projects/projectTasksView";
import { ProjectVariablesPanel } from "@/components/pages/rdm/projects/projectVariables";
import { EditProjectDialog } from "@/components/pages/rdm/projects/editProjectDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

import { useToast } from '@/hooks/use-toast';
import { MilestonesView } from "@/components/pages/rdm/projects/milestonesView";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";

interface PageViewerProps {
  pageId: string | null;
  onClose: () => void;
}

function PageViewer({ pageId, onClose }: PageViewerProps) {
  const [page, setPage] = useState<PageNode | null>(null);
  const [loading, setLoading] = useState(true);
  const pagesService = new PagesService();
  const { selectedOrgId } = useOrganization();

  useEffect(() => {
    const loadPage = async () => {
      if (!pageId || !selectedOrgId) return;
      setLoading(true);
      try {
        const pages = await pagesService.getPages(selectedOrgId);
        const pageData = pages.find(p => p.id === pageId);
        if (pageData) {
          setPage(pageData);
        } else {
          console.error('Page not found');
        }
      } catch (error) {
        console.error('Failed to load page:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPage();
  }, [pageId, selectedOrgId]);

  if (!pageId) return null;

  return (
    <Sheet open={!!pageId} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-[800px] sm:w-[800px]">
        <SheetHeader>
          <div className="flex justify-between items-center">
            <SheetTitle>{page?.name || 'Loading...'}</SheetTitle>
          </div>
        </SheetHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : page ? (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page.content || '' }} />
          ) : (
            <div className="text-center p-8 text-gray-500">Failed to load page content.</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ProjectDetailPage() {
  const { toast } = useToast();    
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<ProjectArtifact[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ProjectActivity[]>([]);
  const [associatedDocuments, setAssociatedDocuments] = useState<DocumentMetadata[]>([]);
  const [associatedPages, setAssociatedPages] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingProject, setEditingProject] = useState(false);
  const [showAddArtifactDialog, setShowAddArtifactDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newArtifact, setNewArtifact] = useState({
    name: "",
    type: "document" as "document" | "image" | "video" | "audio" | "file" | "other",
    status: "draft" as "draft" | "in_review" | "approved" | "rejected",
    description: "",
    file: null as File | null,
  });
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [activityPagination, setActivityPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0
  });
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [artifactStatuses, setArtifactStatuses] = useState<ArtifactStatus[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const projectService = new ProjectService();
  const documentService = new DocumentService();
  const pagesService = new PagesService();
  const navigate = useNavigate();

  const artifactTypes = [
    { value: "document", label: "Document" },
    { value: "image", label: "Image" },
    { value: "video", label: "Video" },
    { value: "audio", label: "Audio" },
    { value: "file", label: "File" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadArtifactStatuses();
    }
  }, [projectId]);

  const loadArtifactStatuses = async () => {
    if (!projectId) return;
    try {
      const statuses = await projectService.getArtifactStatuses(projectId);
      setArtifactStatuses(statuses);
    } catch (error) {
      console.error("Failed to load artifact statuses:", error);
    }
  };

  const loadProjectActivity = async (offset = 0, limit = 20) => {
    if (!projectId) return;
    
    setActivityLoading(true);
    try {
      const response = await projectService.getProjectActivity(projectId, offset, limit);
      
      if (response && Array.isArray(response.activities)) {
        setActivities(response.activities);
        
        if (response.pagination) {
          setActivityPagination(response.pagination);
        }
        
        if (offset === 0) {
          setRecentActivity(response.activities.slice(0, 5));
        }
      } else {
        console.warn('Received invalid activity data format:', response);
        setActivities([]);
        if (offset === 0) {
          setRecentActivity([]);
        }
      }
    } catch (error) {
      console.error("Failed to load project activity:", error);
      setActivities([]);
      if (offset === 0) {
        setRecentActivity([]);
      }
    } finally {
      setActivityLoading(false);
    }
  };

  async function loadProjectData() {
    try {
      if (!projectId) return;
      setLoading(true);

      const projectData = await projectService.getProjectById(projectId);
      console.log("Loaded project:", projectData);
      setProject(projectData);

      const artifactsData = await projectService.getProjectArtifacts(projectId);
      console.log("Loaded artifacts:", artifactsData);
      setArtifacts([...(Array.isArray(artifactsData) ? artifactsData : [])]);

      try {
        const roadmapData = await projectService.getRoadmapItems(projectId);
        console.log("Loaded roadmap items:", roadmapData);
        setRoadmapItems(Array.isArray(roadmapData) ? roadmapData : []);
      } catch (roadmapError) {
        console.warn("Failed to load roadmap items:", roadmapError);
        setRoadmapItems([]);
      }

      await loadAssociatedDocuments();
      await loadAssociatedPages();
      
      await loadProjectActivity();
      
    } catch (error) {
      console.error("Failed to load project data:", error);
      setArtifacts([]);
      setRoadmapItems([]);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }

  const handleNextPage = () => {
    const newOffset = activityPagination.offset + activityPagination.limit;
    if (newOffset < activityPagination.total) {
      loadProjectActivity(newOffset, activityPagination.limit);
    }
  };
  
  const handlePrevPage = () => {
    const newOffset = Math.max(0, activityPagination.offset - activityPagination.limit);
    loadProjectActivity(newOffset, activityPagination.limit);
  };

  async function loadAssociatedDocuments() {
    if (!projectId || !project?.organizationId) return;
    try {
      const docs = await documentService.getDocuments(null, project.organizationId, projectId);
      setAssociatedDocuments(Array.isArray(docs) ? docs : []);
    } catch (error) {
      console.error("Failed to load associated documents:", error);
      setAssociatedDocuments([]);
    }
  }

  async function loadAssociatedPages() {
    if (!projectId || !project?.organizationId) return;
    try {
      const pages = await pagesService.getPages(project.organizationId, projectId);
      setAssociatedPages(Array.isArray(pages) ? pages : []);
    } catch (error) {
      console.error("Failed to load associated pages:", error);
      setAssociatedPages([]);
    }
  }

  const handleUpdateProject = async (updatedProject: Partial<Project>) => {
    try {
      if (!project?.id) return;
      await projectService.updateProject(project.id, updatedProject);
      setProject((prev) => (prev ? { ...prev, ...updatedProject } : null));
      setEditingProject(false);
      
      loadProjectActivity();
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  function handleBackClick() {
    navigate("/rdm/projects", { state: { updatedProject: project } });
  }

  async function handleDownloadDocument(documentId: string, fileName: string) {
    try {
      const blob = await documentService.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
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

  const handleAddArtifactClick = () => {
    setNewArtifact({
      name: "",
      type: "document",
      status: "draft",
      description: "",
      file: null,
    });
    setShowAddArtifactDialog(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setNewArtifact((prev) => ({
      ...prev,
      file,
      name: file ? file.name : prev.name,
    }));
  };

  const handleCreateArtifact = async () => {
    if (!projectId || !project?.organizationId || !newArtifact.file) return;

    setIsUploading(true);

    try {
      console.log("Starting artifact creation with projectId:", projectId, "and newArtifact:", newArtifact);
      const uploadedDoc = await documentService.uploadDocument(newArtifact.file, null, project.organizationId);
      console.log("Document uploaded:", uploadedDoc);

      await documentService.associateDocumentWithProject(uploadedDoc.id, projectId);
      console.log("Document associated with project");

      await new Promise((resolve) => setTimeout(resolve, 0));

      const updatedArtifacts = await projectService.getProjectArtifacts(projectId);
      console.log("Fetched updated artifacts:", updatedArtifacts);

      const newArtifactEntry = updatedArtifacts.find((artifact) => artifact.documentId === uploadedDoc.id);
      console.log("New artifact entry found:", newArtifactEntry);

      if (!newArtifactEntry) {
        throw new Error("New artifact entry not found in updated artifacts");
      }

      let finalName = newArtifact.name.trim() || uploadedDoc.name;
      const fileExtension = newArtifact.file.name.includes(".")
        ? "." + newArtifact.file.name.split(".").pop()
        : "";

      if (fileExtension && !finalName.toLowerCase().endsWith(fileExtension.toLowerCase())) {
        finalName += fileExtension;
      }

      console.log("Final artifact name before update:", finalName);
      const updatedArtifactResponse = await projectService.updateArtifact(projectId, newArtifactEntry.id, {
        name: finalName,
        type: newArtifact.type,
        status: newArtifact.status,
        description: newArtifact.description,
        documentId: uploadedDoc.id,
      });
      console.log("Artifact updated successfully:", updatedArtifactResponse);

      const updatedArtifact: ProjectArtifact = {
        ...newArtifactEntry,
        name: finalName,
        type: newArtifact.type,
        status: newArtifact.status,
        description: newArtifact.description || "",
        documentId: uploadedDoc.id,
        id: newArtifactEntry.id,
        projectId: projectId,
        createdBy: newArtifactEntry.createdBy || "",
        updatedBy: newArtifactEntry.updatedBy || "",
        createdAt: newArtifactEntry.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setArtifacts((prev) => {
        const newList = prev.filter((artifact) => artifact.id !== updatedArtifact.id);
        return [...newList, updatedArtifact];
      });

      setAssociatedDocuments((prev) => {
        const newDocs = prev.filter((doc) => doc.id !== uploadedDoc.id);
        return [...newDocs, { ...uploadedDoc, name: finalName }];
      });

      setShowAddArtifactDialog(false);
      
      loadProjectActivity();
    } catch (error) {
      console.error("Failed to create artifact with file:", error);
      alert(`Failed to create artifact: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesType = activityTypeFilter === 'all' ? true : activity.activityType === activityTypeFilter;
    const matchesEntity = entityTypeFilter === 'all' ? true : activity.entityType === entityTypeFilter;
    const matchesSearch = searchQuery ? activity.description.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    return matchesType && matchesEntity && matchesSearch;
  });

  const sortedActivities = [...filteredActivities].sort((a, b) => {
    let aValue, bValue;
    if (sortColumn === 'createdAt') {
      aValue = new Date(a.createdAt);
      bValue = new Date(b.createdAt);
    } else if (sortColumn === 'user') {
      aValue = (a.userName || a.userEmail || '').toLowerCase();
      bValue = (b.userName || b.userEmail || '').toLowerCase();
    } else if (sortColumn === 'activityType') {
      aValue = a.activityType || '';
      bValue = b.activityType || '';
    } else if (sortColumn === 'entityType') {
      aValue = a.entityType || '';
      bValue = b.entityType || '';
    } else if (sortColumn === 'description') {
      aValue = a.description || '';
      bValue = b.description || '';
    } else {
      aValue = '';
      bValue = '';
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (column: React.SetStateAction<string>) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const capitalizeWords = (str: string) => {
    return str.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleViewPage = (pageId: string) => {
    setSelectedPageId(pageId);
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto pt-4 pl-4 pr-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="w-32 h-9 bg-gray-200 rounded animate-pulse" />
            <div className="flex space-x-2">
              <div className="w-20 h-9 bg-gray-200 rounded animate-pulse" />
              <div className="w-24 h-9 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex space-x-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="w-32 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="w-24 h-9 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border rounded-md">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="w-40 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-24 h-3 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="mb-4">
              <div className="w-32 h-5 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border rounded-md">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-32 h-3 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
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
    );
  }

  return (
    <div className="h-full overflow-y-auto pt-4 pl-4 pr-6">
      <ProjectSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          project={project}
          projectService={projectService}
          onUpdate={loadProjectData}
        />
      <PageViewer 
        pageId={selectedPageId} 
        onClose={() => setSelectedPageId(null)} 
      />
      <EditProjectDialog
        open={editingProject}
        onClose={() => setEditingProject(false)}
        project={project}
        onSave={handleUpdateProject}
      />
      <Dialog open={showAddArtifactDialog} onOpenChange={setShowAddArtifactDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add File Artifact to {project.name}</DialogTitle>
            <DialogDescription>Upload a file and provide details for the new artifact.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label htmlFor="artifact-file" className="text-sm font-medium mb-1 block">
                File
              </label>
              <Input
                id="artifact-file"
                type="file"
                onChange={handleFileChange}
                className="cursor-pointer"
                disabled={isUploading}
              />
              {newArtifact.file && (
                <p className="text-sm text-gray-500 mt-1">Selected: {newArtifact.file.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="artifact-name" className="text-sm font-medium mb-1 block">
                Name
              </label>
              <Input
                id="artifact-name"
                value={newArtifact.name}
                onChange={(e) => setNewArtifact((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter artifact name (defaults to filename)"
                disabled={isUploading}
              />
            </div>
            <div>
              <label htmlFor="artifact-type" className="text-sm font-medium mb-1 block">
                Type
              </label>
              <Select
                value={newArtifact.type}
                onValueChange={(value) =>
                  setNewArtifact((prev) => ({
                    ...prev,
                    type: value as "document" | "image" | "video" | "audio" | "file" | "other",
                  }))
                }
                disabled={isUploading}
              >
                <SelectTrigger id="artifact-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {artifactTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="hover:bg-gray-100">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="artifact-status" className="text-sm font-medium mb-1 block">
                Status
              </label>
              <Select
                value={newArtifact.status}
                onValueChange={(value) =>
                  setNewArtifact((prev) => ({
                    ...prev,
                    status: value as "draft" | "in_review" | "approved" | "rejected",
                  }))
                }
                disabled={isUploading}
              >
                <SelectTrigger id="artifact-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {artifactStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: status.color }} 
                        />
                        <span>{status.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="artifact-description" className="text-sm font-medium mb-1 block">
                Description
              </label>
              <Textarea
                id="artifact-description"
                value={newArtifact.description}
                onChange={(e) => setNewArtifact((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter artifact description"
                rows={3}
                disabled={isUploading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddArtifactDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleCreateArtifact} disabled={!newArtifact.file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload and Add Artifact"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-1">{project.name}</h1>
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
          <TabsTrigger value="tasks" className="rounded-t-lg">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="milestones" className="rounded-t-lg">
            <Flag className="h-4 w-4 mr-2" />
            Milestones
          </TabsTrigger>
          <TabsTrigger value="deliverables" className="rounded-t-lg">
            <Package className="h-4 w-4 mr-2" />
            Deliverables
          </TabsTrigger>
          <TabsTrigger value="variables" className="rounded-t-lg">
            <Variable className="h-4 w-4 mr-2" />
            Variables
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-t-lg">
            <ActivityIcon className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="text-sm font-medium">Start Date</h3>
                    <p className="text-xs">
                      {project.startDate ? project.startDate.split("T")[0] : "Not set"}
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
                      {project.endDate ? project.endDate.split("T")[0] : "Not set"}
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
                <Button variant="outline" size="sm" onClick={handleAddArtifactClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add File
                </Button>
              </CardHeader>
              <CardContent>
                {artifacts.length > 0 ? (
                  <div className="space-y-2">
                    {artifacts.slice(0, 5).map((artifact) => (
                      <div
                        key={artifact.id}
                        className="p-3 rounded-md border hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-sm">{artifact.name}</h4>
                            <p className="text-xs text-gray-500">
                              {artifact.type} • {artifact.status}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        setActiveTab("artifacts");
                      }}
                    >
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div
                        key={activity.id}
                        className="p-3 rounded-md border hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Activity className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => {
                        setActiveTab("activity");
                      }}
                    >
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
              <Button size="sm" onClick={handleAddArtifactClick}>
                <Plus className="h-4 w-4 mr-1" />
                Add File
              </Button>
            </div>
              <ArtifactsPage
                artifacts={artifacts}
                projectId={projectId || ""}
                projectService={projectService}
                artifactStatuses={artifactStatuses}
                onUpdateArtifact={async (artifactId: string, data: Partial<ProjectArtifact>) => {
                  try {
                    await projectService.updateArtifact(projectId || "", artifactId, data);
                    toast({
                      title: "Success",
                      description: "Artifact updated successfully",
                      duration: 5000
                    });
                    loadProjectData();
                  } catch (error) {
                    console.error('Error updating artifact:', error);
                    toast({
                      title: "Error",
                      description: "Failed to update artifact",
                      variant: "destructive",
                      duration: 5000
                    });
                  }
                }}
                onDownloadArtifact={handleDownloadDocument}
                onViewPage={handleViewPage}
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
                    {associatedDocuments.map((doc) => (
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
                {associatedPages.map((page) => (
                  <Card
                    key={page.id}
                    className="p-4 cursor-pointer"
                    onClick={() => navigate(`/rdm/pages?pageId=${page.id}`)}
                  >
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
                try {
                    const roadmapItemToCreate = { ...item, projectId: project.id };
                    await projectService.createRoadmapItem(roadmapItemToCreate);
                    await loadProjectData();
                    toast({
                    title: "Success",
                    description: "Roadmap item created successfully",
                    duration: 5000
                    });
                } catch (error) {
                    console.error("Failed to create roadmap item:", error);
                    toast({
                    title: "Error",
                    description: "Failed to create roadmap item",
                    variant: "destructive",
                    duration: 5000
                    });
                }
                }}
                onItemUpdate={async (itemId: string, item: Partial<RoadmapItem>) => {
                try {
                    await projectService.updateRoadmapItem(itemId, item);
                    await loadProjectData();
                    toast({
                    title: "Success",
                    description: "Roadmap item updated successfully",
                    duration: 5000
                    });
                } catch (error) {
                    console.error("Failed to update roadmap item:", error);
                    toast({
                    title: "Error",
                    description: "Failed to update roadmap item",
                    variant: "destructive",
                    duration: 5000
                    });
                }
                }}
                onItemDelete={async (itemId: string) => {
                try {
                    await projectService.deleteRoadmapItem(itemId);
                    await loadProjectData();
                    toast({
                    title: "Success",
                    description: "Roadmap item deleted successfully",
                    duration: 5000
                    });
                } catch (error) {
                    console.error("Failed to delete roadmap item:", error);
                    toast({
                    title: "Error",
                    description: "Failed to delete roadmap item",
                    variant: "destructive",
                    duration: 5000
                    });
                }
                }}
                projectId={project.id}
            />
            </TabsContent>
        <TabsContent value="tasks">
        <TasksView projectId={project.id} projectService={projectService} />
        </TabsContent>
        <TabsContent value="milestones">
          <MilestonesView projectId={project.id} projectService={projectService} />
        </TabsContent>
        <TabsContent value="variables">
          <ProjectVariablesPanel projectId={project.id} projectService={projectService} />
        </TabsContent>
        <TabsContent value="activity">
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-md font-semibold">Project Activity</h2>
            </div>
            {activityLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : activities.length > 0 ? (
              <>
                <div className="flex space-x-4 mb-4">
                <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by activity type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="status_change">Status Change</SelectItem>
                    </SelectContent>
                    </Select>
                    <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by entity type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Entities</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="artifact">Artifact</SelectItem>
                            <SelectItem value="roadmap">Roadmap</SelectItem>
                            <SelectItem value="variable">Variable</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="page">Page</SelectItem>
                            <SelectItem value="artifact_review">Artifact Review</SelectItem>
                        </SelectContent>
                        </Select>
                  <Input
                    placeholder="Search description"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[300px]"
                  />
                </div>

                <p className="mb-2 text-sm text-gray-500">
                  Showing {filteredActivities.length} of {activities.length} activities in current page
                </p>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer">
                          Date {sortColumn === 'createdAt' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                        </TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead onClick={() => handleSort('user')} className="cursor-pointer">
                          User {sortColumn === 'user' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort('activityType')} className="cursor-pointer">
                          Type {sortColumn === 'activityType' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort('entityType')} className="cursor-pointer">
                          Entity Type {sortColumn === 'entityType' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                        </TableHead>
                        <TableHead onClick={() => handleSort('description')} className="cursor-pointer">
                          Description {sortColumn === 'description' && (sortDirection === 'asc' ? <ChevronUp className="inline h-4 w-4" /> : <ChevronDown className="inline h-4 w-4" />)}
                        </TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-sm">
                      {sortedActivities.length > 0 ? (
                        sortedActivities.map((activity) => (
                          <TableRow key={activity.id}>
                            <TableCell>{activity.formattedDate}</TableCell>
                            <TableCell>{new Date(activity.timestamp).toLocaleTimeString()}</TableCell>
                            <TableCell>{activity.userName || activity.userEmail}</TableCell>
                            <TableCell>{capitalizeWords(activity.activityType)}</TableCell>
                            <TableCell>{capitalizeWords(activity.entityType)}</TableCell>
                            <TableCell>{activity.description}</TableCell>
                            <TableCell>
                              {activity.activityType === 'update' && activity.oldValues && activity.newValues && (
                                <div>
                                  {Object.keys(activity.newValues).map((key) => {
                                    const oldVal = activity.oldValues?.[key];
                                    const newVal = activity.newValues?.[key];
                                    if (oldVal !== newVal) {
                                      return <div key={key}>{key}: {oldVal === null ? 'Not Set' : oldVal}</div>;
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {activity.activityType === 'update' && activity.oldValues && activity.newValues && (
                                <div>
                                  {Object.keys(activity.newValues).map((key) => {
                                    const oldVal = activity.oldValues?.[key];
                                    const newVal = activity.newValues?.[key];
                                    if (oldVal !== newVal) {
                                      return <div key={key}>{key}: {newVal === null ? 'Not Set' : newVal}</div>;
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            No activities found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {activityPagination.total > activityPagination.limit && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={handlePrevPage} 
                          className={activityPagination.offset === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      <PaginationItem className="flex items-center px-4">
                        <span className="text-sm text-gray-600">
                          Showing {activityPagination.offset + 1} to {Math.min(activityPagination.offset + activityPagination.limit, activityPagination.total)} of {activityPagination.total}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext 
                          onClick={handleNextPage}
                          className={activityPagination.offset + activityPagination.limit >= activityPagination.total ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            ) : (
              <div className="text-center p-8 border rounded-md bg-gray-50">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No activity recorded for this project yet.</p>
                <p className="text-gray-400 text-sm">Activity will be tracked as changes are made to the project.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}