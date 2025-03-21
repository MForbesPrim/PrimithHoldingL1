import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Collaborator {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  projects: string[];
  status: string;
  accessPermissions?: AccessPermission[]; // Add this new property
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
  type: "project" | "document" | "page" | "document_folder" | "page_folder";
}

interface EditCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: Collaborator;
  availableProjects: string[];
  availableResources?: Resource[]; // Add this new prop
  onSave: (updatedCollaborator: Collaborator) => Promise<void>;
}

export function EditCollaboratorDialog({
  open,
  onOpenChange,
  collaborator,
  availableProjects,
  availableResources = [], // Default to empty array
  onSave,
}: EditCollaboratorDialogProps) {
  const [editedCollaborator, setEditedCollaborator] = useState<Collaborator>({
    ...collaborator,
    accessPermissions: collaborator.accessPermissions || []
  });
  const [projectSearch, setProjectSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    setEditedCollaborator({
      ...collaborator,
      accessPermissions: collaborator.accessPermissions || []
    });
  }, [collaborator, open]);
  
  const filteredProjects = availableProjects.filter(project => 
    project.toLowerCase().includes(projectSearch.toLowerCase())
  );
  
  const filteredResources = availableResources.filter(resource => 
    resource.name.toLowerCase().includes(resourceSearch.toLowerCase())
  );
  
  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(editedCollaborator);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving collaborator:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleProject = (project: string) => {
    if (editedCollaborator.projects.includes(project)) {
      setEditedCollaborator({
        ...editedCollaborator,
        projects: editedCollaborator.projects.filter(p => p !== project)
      });
    } else {
      setEditedCollaborator({
        ...editedCollaborator,
        projects: [...editedCollaborator.projects, project]
      });
    }
  };
  
  const addResourcePermission = (resource: Resource) => {
    if (!editedCollaborator.accessPermissions) {
      editedCollaborator.accessPermissions = [];
    }
    
    // Check if permission already exists
    const existingIndex = editedCollaborator.accessPermissions.findIndex(
      p => p.resource_id === resource.id && p.resource_type === resource.type
    );
    
    if (existingIndex === -1) {
      setEditedCollaborator({
        ...editedCollaborator,
        accessPermissions: [
          ...editedCollaborator.accessPermissions,
          {
            resource_type: resource.type,
            resource_id: resource.id,
            resource_name: resource.name,
            access_level: "view" // Default to view
          }
        ]
      });
    }
    
    setResourceSearch("");
  };
  
  const removePermission = (index: number) => {
    const updatedPermissions = [...(editedCollaborator.accessPermissions || [])];
    updatedPermissions.splice(index, 1);
    setEditedCollaborator({
      ...editedCollaborator,
      accessPermissions: updatedPermissions
    });
  };
  
  const updatePermissionLevel = (index: number, level: "view" | "edit") => {
    const updatedPermissions = [...(editedCollaborator.accessPermissions || [])];
    updatedPermissions[index].access_level = level;
    setEditedCollaborator({
      ...editedCollaborator,
      accessPermissions: updatedPermissions
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Collaborator</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="mt-4">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="role">Role</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
          </TabsList>
          
          {/* Info tab content remains the same */}
          <TabsContent value="info" className="space-y-4">
            {/* Existing info fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
                <Input
                  id="firstName"
                  value={editedCollaborator.firstName}
                  onChange={(e) => setEditedCollaborator({
                    ...editedCollaborator,
                    firstName: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
                <Input
                  id="lastName"
                  value={editedCollaborator.lastName}
                  onChange={(e) => setEditedCollaborator({
                    ...editedCollaborator,
                    lastName: e.target.value
                  })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={editedCollaborator.email}
                onChange={(e) => setEditedCollaborator({
                  ...editedCollaborator,
                  email: e.target.value
                })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <Select
                value={editedCollaborator.status}
                onValueChange={(value) => setEditedCollaborator({
                  ...editedCollaborator,
                  status: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          
          {/* Role tab content remains the same */}
          <TabsContent value="role" className="space-y-4">
            {/* Existing role content */}
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">Role</label>
              <Select
                value={editedCollaborator.role}
                onValueChange={(value) => setEditedCollaborator({
                  ...editedCollaborator,
                  role: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-muted p-3 rounded-md text-sm">
              <h4 className="font-semibold mb-2">Role Permissions:</h4>
              <p><strong>Viewer:</strong> Can view content but cannot make changes</p>
              <p><strong>Editor:</strong> Can view and edit content but cannot manage users</p>
              <p><strong>Admin:</strong> Full access including user management</p>
            </div>
          </TabsContent>
          
          {/* Projects tab content remains the same */}
          <TabsContent value="projects" className="space-y-4">
            {/* Existing projects content */}
            <div className="flex items-center space-x-2 mb-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="mb-2">
              <h4 className="font-medium text-sm mb-1">Assigned Projects ({editedCollaborator.projects.length})</h4>
              <div className="flex flex-wrap gap-1 mb-4">
                {editedCollaborator.projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects assigned</p>
                ) : (
                  editedCollaborator.projects.map((project) => (
                    <Badge 
                      key={project} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleProject(project)}
                    >
                      {project} ✕
                    </Badge>
                  ))
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-sm mb-1">Available Projects</h4>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-1">
                  {filteredProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matching projects found</p>
                  ) : (
                    filteredProjects.map((project) => (
                      <div 
                        key={project} 
                        className={`px-2 py-1 rounded cursor-pointer hover:bg-muted ${editedCollaborator.projects.includes(project) ? 'bg-muted' : ''}`}
                        onClick={() => toggleProject(project)}
                      >
                        <span className="text-sm">{project}</span>
                        {editedCollaborator.projects.includes(project) && (
                          <Badge variant="outline" className="ml-2 text-xs">Assigned</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
          
          {/* New Access tab */}
          <TabsContent value="access" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Granular Access Permissions</label>
              </div>
              <p className="text-xs text-muted-foreground">
                Grant specific access to documents, pages, and folders
              </p>
              
              {/* Search resources */}
              <div className="relative mt-4">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  className="pl-8"
                />
                
                {/* Dropdown for search results */}
                {resourceSearch && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg">
                    <ScrollArea className="max-h-[200px] py-1">
                      {filteredResources.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">No resources found.</p>
                      ) : (
                        filteredResources.map((resource) => (
                          <div
                            key={`${resource.type}|${resource.id}`}
                            className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
                            onClick={() => addResourcePermission(resource)}
                          >
                            <span className="text-sm">{resource.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {resource.type.replace("_", " ")}
                            </Badge>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
              
              {/* Current permissions */}
              <div className="border rounded-md mt-4">
                <ScrollArea className="max-h-[250px]">
                  <div className="divide-y">
                    {!editedCollaborator.accessPermissions || editedCollaborator.accessPermissions.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4">No access permissions added yet.</p>
                    ) : (
                      editedCollaborator.accessPermissions.map((perm, index) => (
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
                              onValueChange={(value) => updatePermissionLevel(index, value as "view" | "edit")}
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
                              onClick={() => removePermission(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}