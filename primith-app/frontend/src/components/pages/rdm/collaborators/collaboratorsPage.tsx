import { useState, useEffect } from "react";
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Users, 
  FolderOpen, 
  Search, 
  Filter, 
  MoreHorizontal,
  Activity,
  UserPlus,
  FileCog,
  Trash2
} from "lucide-react";
import AuthService from "@/services/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EditCollaboratorDialog } from "@/components/pages/rdm/collaborators/editCollaboratorDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Collaborator {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  projects: string[];
  status: string;
  accessPermissions?: AccessPermission[];
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
  projectCount: number;
}

interface AccessPermission {
  resource_type: "project" | "document" | "page" | "document_folder" | "page_folder";
  resource_id: string;
  resource_name?: string;
  access_level: "view" | "edit";
}

interface Resource {
  id: string;
  name: string;
}

export function CollaboratorsPage() {
  const { selectedOrgId } = useOrganization();
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Resource[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Resource[]>([]);
  const [availablePages, setAvailablePages] = useState<Resource[]>([]);
  const [availableDocumentFolders, setAvailableDocumentFolders] = useState<Resource[]>([]);
  const [availablePageFolders, setAvailablePageFolders] = useState<Resource[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCollaborator, setNewCollaborator] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    projects: string[];
    accessPermissions: AccessPermission[];
  }>({
    email: "",
    firstName: "",
    lastName: "",
    role: "external",
    projects: [],
    accessPermissions: [],
  });
  const [resourceSearch, setResourceSearch] = useState("");
  const [_viewMode, _setViewMode] = useState<"list" | "team" | "activity">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isInviteMultipleOpen, setIsInviteMultipleOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState("");
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  useEffect(() => {
    if (selectedOrgId) {
      fetchCollaborators();
      fetchResources();
      setTeams([
        { id: "1", name: "Engineering", memberCount: 12, projectCount: 8 },
        { id: "2", name: "Research", memberCount: 8, projectCount: 5 },
        { id: "3", name: "Administration", memberCount: 4, projectCount: 3 },
      ]);
    }
  }, [selectedOrgId]);

  async function fetchCollaborators() {
    try {
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.tokens) throw new Error("No RDM authentication tokens found");

      let token = rdmAuth.tokens.token;
      console.log("Fetching collaborators with permissions...");
      let response = await fetch(`${import.meta.env.VITE_API_URL}/api/organizations/${selectedOrgId}/collaborators?include=permissions`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.status === 401) {
        const refreshedTokens = await AuthService.refreshRdmAccessToken();
        if (!refreshedTokens) throw new Error("Failed to refresh RDM token");
        token = refreshedTokens.token;
        response = await fetch(`${import.meta.env.VITE_API_URL}/api/organizations/${selectedOrgId}/collaborators?include=permissions`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Raw response data:", data);
      console.log("Fetched collaborators with permissions:", data.collaborators);
      
      // First, create a map of resource IDs to their names from available resources
      const resourceNameMap = new Map();
      [...availableProjects, ...availableDocuments, ...availablePages, ...availableDocumentFolders, ...availablePageFolders]
        .forEach(resource => {
          resourceNameMap.set(resource.id, resource.name);
        });

      console.log("Resource name map:", Object.fromEntries(resourceNameMap));
      
      // Map the permissions array to accessPermissions with the correct structure
      const collaboratorsWithPermissions = (data.collaborators || []).map((collaborator: Collaborator & { permissions?: any[] }) => {
        // Transform the permissions array into accessPermissions format
        const accessPermissions = (collaborator.permissions || []).map(perm => {
          // Try to get the resource name from our map, fallback to ID if not found
          const resourceName = resourceNameMap.get(perm.resource_id) || perm.resource_name || perm.resource_id;
          
          return {
            resource_type: perm.resource_type,
            resource_id: perm.resource_id,
            resource_name: resourceName,
            access_level: perm.permission_level === 'view' ? 'view' : 'edit'
          };
        });

        console.log(`Mapped permissions for ${collaborator.email}:`, accessPermissions);

        return {
          ...collaborator,
          accessPermissions
        };
      });
      
      console.log("Processed collaborators with permissions:", collaboratorsWithPermissions);
      setCollaborators(collaboratorsWithPermissions);
    } catch (error: any) {
      console.error("Error fetching collaborators:", error);
      toast({
        title: "Error",
        description: `Failed to fetch collaborators: ${error.message}`,
        variant: "destructive",
      });
      if (error.message.includes("No RDM authentication tokens") || error.message.includes("Failed to refresh RDM token")) {
        window.location.href = "/login";
      }
    }
  }

  async function handleEditCollaborator(updatedCollaborator: Collaborator) {
    try {
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.tokens) throw new Error("No RDM authentication tokens found");
  
      // Transform accessPermissions back to the API's expected format
      const apiCollaborator = {
        ...updatedCollaborator,
        permissions: updatedCollaborator.accessPermissions?.map(perm => ({
          resource_type: perm.resource_type,
          resource_id: perm.resource_id,
          resource_name: perm.resource_name,
          permission_level: perm.access_level
        }))
      };
      
      console.log("Sending collaborator update request:", {
        url: `${import.meta.env.VITE_API_URL}/api/organizations/${selectedOrgId}/collaborators/${updatedCollaborator.id}`,
        body: JSON.stringify(apiCollaborator, null, 2)
      });

      let token = rdmAuth.tokens.token;
      let response = await fetch(`${import.meta.env.VITE_API_URL}/api/organizations/${selectedOrgId}/collaborators/${updatedCollaborator.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiCollaborator),
      });
  
      if (response.status === 401) {
        const refreshedTokens = await AuthService.refreshRdmAccessToken();
        if (!refreshedTokens) throw new Error("Failed to refresh RDM token");
        token = refreshedTokens.token;
        response = await fetch(`${import.meta.env.VITE_API_URL}/api/organizations/${selectedOrgId}/collaborators/${updatedCollaborator.id}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiCollaborator),
        });
      }
  
      if (!response.ok) {
        const responseText = await response.text();
        console.error("Error response from server:", {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        
        let errorMessage: string;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
        } catch (e) {
          errorMessage = responseText || `HTTP error! status: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
  
      setIsEditDialogOpen(false); // Close the dialog after successful save
      toast({
        title: "Success",
        description: "Collaborator updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating collaborator:", error);
      toast({
        title: "Error",
        description: `Failed to update collaborator: ${error.message}`,
        variant: "destructive",
      });
      if (error.message.includes("No RDM authentication tokens") || error.message.includes("Failed to refresh RDM token")) {
        window.location.href = "/login";
      }
    }
  }

  // Add effect to refresh data when dialog closes
  useEffect(() => {
    if (!isEditDialogOpen) {
      // Reset selected collaborator
      setSelectedCollaborator(null);
      // Refresh the table data
      fetchCollaborators();
    }
  }, [isEditDialogOpen]);

  // Update the dropdown menu item click handler
  const handleEditClick = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsEditDialogOpen(true);
  };

  async function handleAddCollaborator() {
    try {
      setIsAddingCollaborator(true);
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.tokens) throw new Error("No RDM authentication tokens found");
  
      let token = rdmAuth.tokens.token;
      let response = await fetch(`${import.meta.env.VITE_API_URL}/api/organizations/${selectedOrgId}/invite`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCollaborator),
      });
  
      if (response.status === 401) {
        const refreshedTokens = await AuthService.refreshRdmAccessToken();
        if (!refreshedTokens) throw new Error("Failed to refresh RDM token");
        token = refreshedTokens.token;
        response = await fetch(`${import.meta.env.VITE_API_URL}/api/organizations/${selectedOrgId}/invite`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newCollaborator),
        });
      }
  
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
      setIsAddDialogOpen(false);
      fetchCollaborators();
      toast({
        title: "Success",
        description: "Collaborator added successfully",
      });
    } catch (error: any) {
      console.error("Error adding collaborator:", error);
      toast({
        title: "Error",
        description: `Failed to add collaborator: ${error.message}`,
        variant: "destructive",
      });
      if (error.message.includes("No RDM authentication tokens") || error.message.includes("Failed to refresh RDM token")) {
        window.location.href = "/login";
      }
    } finally {
      setIsAddingCollaborator(false);
    }
  }

  async function fetchResources() {
    try {
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.tokens) throw new Error("No RDM authentication tokens found");
      if (!selectedOrgId) throw new Error("No organization selected");

      const token = rdmAuth.tokens.token;
      const fetchWithAuth = async (url: string) => {
        try {
          let response = await fetch(url, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          console.log(`Fetch status for ${url}: ${response.status}`);
          if (response.status === 401) {
            const refreshedTokens = await AuthService.refreshRdmAccessToken();
            if (!refreshedTokens) throw new Error("Failed to refresh RDM token");
            response = await fetch(url, {
              headers: {
                "Authorization": `Bearer ${refreshedTokens.token}`,
                "Content-Type": "application/json",
              },
            });
            console.log(`Retry status for ${url}: ${response.status}`);
          }
          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Failed to fetch ${url}: ${response.status} - ${errorText}`);
            return []; // Return empty array on failure
          }
          const data = await response.json();
          console.log(`Raw data from ${url}:`, data);
          return data;
        } catch (error) {
          console.warn(`Error fetching ${url}:`, error);
          return []; // Return empty array on error
        }
      };

      const projectsData = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/projects?organizationId=${selectedOrgId}`);
      setAvailableProjects(projectsData.projects?.map((p: any) => ({ id: p.id, name: p.name })) || []);
      console.log("Available projects:", availableProjects);

      const documentsData = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/documents?organizationId=${selectedOrgId}`);
      // Handle unwrapped array directly
      setAvailableDocuments(Array.isArray(documentsData) ? documentsData.map((d: any) => ({ id: d.id, name: d.name })) : []);
      console.log("Available documents:", availableDocuments);

      const pagesData = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/pages?organizationId=${selectedOrgId}`);
      // Handle unwrapped array directly
      setAvailablePages(Array.isArray(pagesData) ? pagesData.map((p: any) => ({ id: p.id, name: p.name })) : []);
      console.log("Available pages:", availablePages);

      const docFoldersData = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/document-folders?organizationId=${selectedOrgId}`);
      setAvailableDocumentFolders(docFoldersData.folders?.map((f: any) => ({ id: f.id, name: f.name })) || []);
      console.log("Available document folders:", availableDocumentFolders);

      const pageFoldersData = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/page-folders?organizationId=${selectedOrgId}`);
      setAvailablePageFolders(pageFoldersData.folders?.map((f: any) => ({ id: f.id, name: f.name })) || []);
      console.log("Available page folders:", availablePageFolders);
      
    } catch (error: any) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: `Failed to fetch resources: ${error.message}`,
        variant: "destructive",
      });
      if (error.message.includes("No RDM authentication tokens") || error.message.includes("Failed to refresh RDM token")) {
        window.location.href = "/login";
      }
    }
  }

  const filteredCollaborators = collaborators.filter(collaborator => {
    const matchesSearch = searchQuery === "" || 
      `${collaborator.firstName} ${collaborator.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      collaborator.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || collaborator.role === filterRole;
    const matchesStatus = filterStatus === "all" || collaborator.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const allResources = [
    ...availableProjects.map(r => ({ ...r, type: "project" })),
    ...availableDocuments.map(r => ({ ...r, type: "document" })),
    ...availablePages.map(r => ({ ...r, type: "page" })),
    ...availableDocumentFolders.map(r => ({ ...r, type: "document_folder" })),
    ...availablePageFolders.map(r => ({ ...r, type: "page_folder" })),
  ].filter(r => 
    resourceSearch === "" || 
    r.name.toLowerCase().includes(resourceSearch.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-4 p-8">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Team Collaboration</h1>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
        </div>
          
        <div className="flex items-center justify-between">
          <Tabs defaultValue="list" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="list">
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
                <TabsTrigger value="team">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Teams
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                  
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Filter Collaborators</h4>
                      <div className="space-y-2">
                        <label className="text-sm">Role</label>
                        <Select value={filterRole} onValueChange={setFilterRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any role</SelectItem>
                            <SelectItem value="viewer">Member</SelectItem>
                            <SelectItem value="editor">Admin</SelectItem>
                            <SelectItem value="editor">External</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm">Status</label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setFilterRole("all");
                            setFilterStatus("all");
                          }}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <TabsContent value="list">
              <Table className="border rounded-md">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollaborators.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No collaborators found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCollaborators.map((collaborator) => (
                      <TableRow key={collaborator.id}>
                        <TableCell className="font-medium">{`${collaborator.firstName} ${collaborator.lastName}`}</TableCell>
                        <TableCell>{collaborator.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            collaborator.role === "admin" ? "default" : 
                            collaborator.role === "editor" ? "outline" : "secondary"
                          }>
                            {collaborator.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                {collaborator.projects ? (
                                  collaborator.projects.length === 1 
                                    ? "1 Project" 
                                    : `${collaborator.projects.length} Projects`
                                ) : "0 Projects"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 max-h-60 overflow-auto">
                              <div className="flex flex-wrap gap-1">
                                {collaborator.projects ? collaborator.projects.map((project) => (
                                  <Badge key={project} variant="secondary">
                                    {project}
                                  </Badge>
                                )) : "No projects assigned"}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            collaborator.status === "active" ? "success" : 
                            collaborator.status === "pending" ? "warning" : "secondary"
                          }>
                            {collaborator.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem 
                                onClick={() => handleEditClick(collaborator)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>Resend invitation</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="team">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => (
                  <Card key={team.id}>
                    <CardHeader>
                      <CardTitle>{team.name}</CardTitle>
                      <CardDescription>
                        {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'} · 
                        {team.projectCount} {team.projectCount === 1 ? 'project' : 'projects'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex -space-x-2">
                          <div className="h-8 w-8 rounded-full bg-primary"></div>
                          <div className="h-8 w-8 rounded-full bg-muted"></div>
                          <div className="h-8 w-8 rounded-full bg-secondary"></div>
                          {team.memberCount > 3 && (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
                              +{team.memberCount - 3}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="border-dashed flex items-center justify-center h-[140px]">
                  <Button variant="ghost">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Team
                  </Button>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Activity log for all collaborators in this organization
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <FileCog className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">John Doe</span> modified permissions on <span className="font-medium">Project X</span>
                        </p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">Jane Smith</span> invited <span className="font-medium">5 new collaborators</span>
                        </p>
                        <p className="text-xs text-muted-foreground">Yesterday at 4:30 PM</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      View All Activity
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Collaborator</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="access">Access Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="basic">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input
                      placeholder="First Name"
                      value={newCollaborator.firstName}
                      onChange={(e) => setNewCollaborator({ ...newCollaborator, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input
                      placeholder="Last Name"
                      value={newCollaborator.lastName}
                      onChange={(e) => setNewCollaborator({ ...newCollaborator, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newCollaborator.email}
                    onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="access">
              <div className="space-y-4 py-4">
                <div className="space-y-4">
                  <label className="text-sm font-medium">Access Permissions</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search resources..."
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                        className="pl-8"
                      />
                      {resourceSearch && (
                        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg">
                          <div className="max-h-[200px] overflow-y-auto py-1">
                            {allResources.length === 0 ? (
                              <p className="text-sm text-muted-foreground p-2">No resources found.</p>
                            ) : (
                              allResources.map((resource) => (
                                <div
                                  key={`${resource.type}|${resource.id}`}
                                  className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
                                  onClick={() => {
                                    if (!newCollaborator.accessPermissions.some(p => p.resource_id === resource.id && p.resource_type === resource.type)) {
                                      setNewCollaborator({
                                        ...newCollaborator,
                                        accessPermissions: [
                                          ...newCollaborator.accessPermissions,
                                          { resource_type: resource.type as any, resource_id: resource.id, resource_name: resource.name, access_level: "view" },
                                        ],
                                      });
                                    }
                                    setResourceSearch(""); // Clear search after selection
                                  }}
                                >
                                  <span className="text-sm">{resource.name}</span>
                                  <Badge variant="outline" className="ml-2">{resource.type.replace("_", " ")}</Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="border rounded-md">
                      <div className="max-h-[200px] overflow-y-auto divide-y">
                        {newCollaborator.accessPermissions.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-4">No access permissions added yet.</p>
                        ) : (
                          <>
                            <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
                              <span className="text-sm font-medium">Bulk Actions</span>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const updatedPermissions = [...newCollaborator.accessPermissions];
                                    updatedPermissions.forEach(perm => {
                                      perm.access_level = "view";
                                    });
                                    setNewCollaborator({
                                      ...newCollaborator,
                                      accessPermissions: updatedPermissions
                                    });
                                  }}
                                >
                                  Set All to View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const updatedPermissions = [...newCollaborator.accessPermissions];
                                    updatedPermissions.forEach(perm => {
                                      perm.access_level = "edit";
                                    });
                                    setNewCollaborator({
                                      ...newCollaborator,
                                      accessPermissions: updatedPermissions
                                    });
                                  }}
                                >
                                  Set All to Edit
                                </Button>
                              </div>
                            </div>
                            {newCollaborator.accessPermissions.map((perm, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-background">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">{perm.resource_name || perm.resource_id}</span>
                                  <Badge variant="outline">
                                    {perm.resource_type.replace("_", " ")}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Select
                                    value={perm.access_level}
                                    onValueChange={(value) => {
                                      const updatedPermissions = [...newCollaborator.accessPermissions];
                                      updatedPermissions[index].access_level = value as "view" | "edit";
                                      setNewCollaborator({ ...newCollaborator, accessPermissions: updatedPermissions });
                                    }}
                                  >
                                    <SelectTrigger className="w-24 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="view">View</SelectItem>
                                      <SelectItem value="edit">Edit</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      const updatedPermissions = newCollaborator.accessPermissions.filter((_, i) => i !== index);
                                      setNewCollaborator({ ...newCollaborator, accessPermissions: updatedPermissions });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewCollaborator({
                  email: "",
                  firstName: "",
                  lastName: "",
                  role: "external",
                  projects: [],
                  accessPermissions: [],
                });
                setResourceSearch(""); // Reset search
              }}
              disabled={isAddingCollaborator}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCollaborator}
              disabled={
                isAddingCollaborator ||
                !newCollaborator.email ||
                !newCollaborator.firstName ||
                !newCollaborator.lastName
              }
            >
              {isAddingCollaborator ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteMultipleOpen} onOpenChange={setIsInviteMultipleOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Bulk Invite Collaborators</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Addresses</label>
              <div className="text-xs text-muted-foreground mb-2">
                Enter email addresses separated by commas, spaces, or new lines
              </div>
              <textarea
                className="w-full h-32 p-2 border rounded-md"
                placeholder="user1@example.com, user2@example.com"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteMultipleOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCollaborator && (
        <EditCollaboratorDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setSelectedCollaborator(null);
            }
          }}
          collaborator={selectedCollaborator}
          availableProjects={availableProjects.map(p => p.name)}
          availableResources={[
            ...availableProjects.map(p => ({ id: p.id, name: p.name, type: "project" as const })),
            ...availableDocuments.map(d => ({ id: d.id, name: d.name, type: "document" as const })),
            ...availablePages.map(p => ({ id: p.id, name: p.name, type: "page" as const })),
            ...availableDocumentFolders.map(f => ({ id: f.id, name: f.name, type: "document_folder" as const })),
            ...availablePageFolders.map(f => ({ id: f.id, name: f.name, type: "page_folder" as const }))
          ]}
          onSave={handleEditCollaborator}
        />
      )}
    </div>
  );
}