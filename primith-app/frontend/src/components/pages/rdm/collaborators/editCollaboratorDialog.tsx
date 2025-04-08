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
  accessPermissions?: AccessPermission[];
}

interface AccessPermission {
  resource_type: "project" | "document" | "page" | "document_folder" | "page_folder";
  resource_id: string;
  resource_name?: string;
  access_level: "view";
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
  availableResources?: Resource[];
  onSave: (updatedCollaborator: Collaborator) => Promise<void>;
}

export function EditCollaboratorDialog({
  open,
  onOpenChange,
  collaborator,
  availableResources = [],
  onSave,
}: EditCollaboratorDialogProps) {
  const [editedCollaborator, setEditedCollaborator] = useState<Collaborator>({
    ...collaborator,
    accessPermissions: collaborator.accessPermissions || []
  });
  const [resourceSearch, setResourceSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (open) {
      console.log("Dialog opened. Collaborator data:", {
        id: collaborator.id,
        email: collaborator.email,
        firstName: collaborator.firstName,
        lastName: collaborator.lastName
      });
      console.log("Access Permissions:", collaborator.accessPermissions);
      
      if (!collaborator.accessPermissions) {
        console.log("No access permissions found in collaborator object");
      } else {
        console.log(`Found ${collaborator.accessPermissions.length} permissions`);
        collaborator.accessPermissions.forEach((perm, index) => {
          console.log(`Permission ${index + 1}:`, {
            type: perm.resource_type,
            id: perm.resource_id,
            name: perm.resource_name,
            level: perm.access_level
          });
        });
      }

      setEditedCollaborator({
        ...collaborator,
        accessPermissions: collaborator.accessPermissions || []
      });
    }
  }, [collaborator, open]);
  
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
  
  const addResourcePermission = (resource: Resource) => {
    console.log("Adding new resource permission:", {
      resource_type: resource.type,
      resource_id: resource.id,
      resource_name: resource.name
    });
    
    if (!editedCollaborator.accessPermissions) {
      editedCollaborator.accessPermissions = [];
    }
    
    const existingIndex = editedCollaborator.accessPermissions.findIndex(
      p => p.resource_id === resource.id && p.resource_type === resource.type
    );
    
    if (existingIndex === -1) {
      const updatedPermissions: AccessPermission[] = [
        ...editedCollaborator.accessPermissions,
        {
          resource_type: resource.type,
          resource_id: resource.id,
          resource_name: resource.name,
          access_level: "view" as const
        }
      ];
      console.log("Updated permissions after add:", updatedPermissions);
      setEditedCollaborator({
        ...editedCollaborator,
        accessPermissions: updatedPermissions
      });
    }
    
    setResourceSearch("");
  };
  
  const removePermission = (index: number) => {
    console.log("Removing permission at index:", index);
    const updatedPermissions = [...(editedCollaborator.accessPermissions || [])];
    const removedPermission = updatedPermissions[index];
    console.log("Permission being removed:", removedPermission);
    updatedPermissions.splice(index, 1);
    console.log("Updated permissions after remove:", updatedPermissions);
    setEditedCollaborator({
      ...editedCollaborator,
      accessPermissions: updatedPermissions
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Collaborator</DialogTitle>
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
                    value={editedCollaborator.firstName}
                    onChange={(e) => setEditedCollaborator({
                      ...editedCollaborator,
                      firstName: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={editedCollaborator.lastName}
                    onChange={(e) => setEditedCollaborator({
                      ...editedCollaborator,
                      lastName: e.target.value
                    })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={editedCollaborator.email}
                  onChange={(e) => setEditedCollaborator({
                    ...editedCollaborator,
                    email: e.target.value
                  })}
                />
              </div>
              
            </div>
          </TabsContent>
          
          <TabsContent value="access">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Access Permissions</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Grant specific access to documents, pages, and folders
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {editedCollaborator.accessPermissions?.length || 0} Permission{editedCollaborator.accessPermissions?.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {/* Current permissions */}
                <div className="border rounded-md">
                  <div className="p-4 border-b bg-muted/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Current Permissions</h4>
                        <p className="text-xs text-muted-foreground">
                          Edit or remove existing permissions below
                        </p>
                      </div>
                    </div>
                  </div>
                  <ScrollArea className="h-[200px] rounded-b-md">
                    <div className="divide-y">
                      {!editedCollaborator.accessPermissions || editedCollaborator.accessPermissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">No access permissions added yet.</p>
                      ) : (
                        editedCollaborator.accessPermissions.map((perm, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-background hover:bg-muted/40 transition-colors">
                            <div className="flex items-center space-x-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{perm.resource_name}</span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {perm.resource_type.split('_').join(' ')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removePermission(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Add new permissions */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Add New Permission</h4>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search resources to add permissions..."
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
                </div>
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