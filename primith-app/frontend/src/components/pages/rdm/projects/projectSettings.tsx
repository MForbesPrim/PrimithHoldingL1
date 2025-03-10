// components/pages/rdm/projects/projectSettings.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Tag, 
  Users, 
  Plus, 
  Trash2, 
  Edit,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectService } from "@/services/projectService";
import type { 
  Project, 
  ProjectMember
} from "@/types/projects";

// Types for project properties and tags
interface ProjectProperty {
  id: string;
  projectId: string;
  name: string;
  type: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectTag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSettingsProps {
  open: boolean;
  onClose: () => void;
  project: Project;
  projectService: ProjectService;
  onUpdate: () => void;
}

export function ProjectSettings({ 
  open, 
  onClose, 
  project, 
  projectService, 
  onUpdate 
}: ProjectSettingsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("team");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [properties, setProperties] = useState<ProjectProperty[]>([]);
  const [tags, setTags] = useState<ProjectTag[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Member management
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Property management
  const [showAddPropertyDialog, setShowAddPropertyDialog] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: "",
    type: "text",
    value: ""
  });
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  
  // Tag management
  const [showAddTagDialog, setShowAddTagDialog] = useState(false);
  const [newTag, setNewTag] = useState({
    name: "",
    color: "#3B82F6"
  });
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  
  // Load initial data
  useEffect(() => {
    if (open && project?.id) {
      loadData();
    }
  }, [open, project?.id]);
  
  const loadData = async () => {
    if (!project?.id) return;
    
    setLoading(true);
    try {
      // Load members
      const membersData = await projectService.getProjectMembers(project.id);
      setMembers(Array.isArray(membersData) ? membersData : []);
      
      // Load properties
      const propertiesData = await projectService.getProjectProperties(project.id);
      setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      
      // Load tags
      const tagsData = await projectService.getProjectTags(project.id);
      setTags(Array.isArray(tagsData) ? tagsData : []);
    } catch (error) {
      console.error("Failed to load project settings data:", error);
      toast({
        title: "Error",
        description: "Failed to load settings data",
        className: "text-red-600",
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Team members section
  const searchUsers = async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await projectService.searchUsers(term, project.organizationId);
      // Filter out users who are already members
      const filteredResults = results.filter(user => 
        !members.some(member => member.userId === user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Failed to search users:", error);
      toast({
        title: "Error",
        description: "Failed to search for users",
        className: "text-red-600",
        duration: 5000
      });
    }
  };
  
  const handleUserSelect = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  
  const handleAddMembers = async () => {
    if (!selectedUsers.length) {
      toast({
        title: "Missing information",
        description: "Please select users to add",
        className: "text-red-600",
        duration: 5000
      });
      return;
    }
    
    setIsSaving(true);
    try {
      await Promise.all(
        selectedUsers.map(userId => 
          projectService.addProjectMember(project.id, userId, selectedRole)
        )
      );
      
      toast({
        title: "Success",
        description: `Added ${selectedUsers.length} member(s) to the project`,
        duration: 5000
      });
      
      setShowAddMemberDialog(false);
      setSelectedUsers([]);
      setSelectedRole('member');
      setSearchTerm("");
      setSearchResults([]);
      
      // Reload members
      loadData();
      onUpdate();
    } catch (error) {
      console.error("Failed to add members:", error);
      toast({
        title: "Error",
        description: "Failed to add members to the project",
        className: "text-red-600",
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    try {
      await projectService.removeProjectMember(project.id, memberId);
      
      toast({
        title: "Success",
        description: "Member removed from project",
        duration: 5000
      });
      
      // Update local state
      setMembers(members.filter(member => member.id !== memberId));
      onUpdate();
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member from project",
        className: "text-red-600",
        duration: 5000
      });
    }
  };
  
  const handleChangeMemberRole = async (memberId: string, role: 'owner' | 'admin' | 'member') => {
    try {
      await projectService.updateMemberRole(project.id, memberId, role);
      
      toast({
        title: "Success",
        description: "Member role updated",
        duration: 5000
      });
      
      // Update local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId ? { ...member, role } : member
        )
      );
    } catch (error) {
      console.error("Failed to update member role:", error);
      
      // Check for specific error about last owner
      const errorMessage = error instanceof Error && error.message.includes("at least one owner") 
        ? "Cannot update: Project must have at least one owner"
        : "Failed to update member role";
      
      toast({
        title: "Error",
        description: errorMessage,
        className: "text-red-600",
        duration: 5000
      });
    }
  };

  const handleToggleMemberStatus = async (memberId: string, isActive: boolean) => {
    try {
      // Call the API to toggle status
      await projectService.toggleMemberStatus(project.id, memberId, isActive);
      
      toast({
        title: "Success",
        description: `Member ${isActive ? 'activated' : 'deactivated'}`,
        duration: 5000
      });
      
      // Update the local state immediately
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId ? { ...member, isActive } : member
        )
      );
    } catch (error) {
      console.error("Failed to update member status:", error);
      
      // Check for specific error about last active member
      const errorMessage = error instanceof Error && error.message.includes("at least one active member") 
        ? "Cannot deactivate: Project must have at least one active member"
        : "Failed to update member status";
      
      toast({
        title: "Error",
        description: errorMessage,
        className: "text-red-600",
        duration: 5000
      });
    }
  };
  
  // Custom properties section
  const handleAddProperty = async () => {
    if (!newProperty.name) {
      toast({
        title: "Missing information",
        description: "Please provide a property name",
        className: "text-red-600",
        duration: 5000
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await projectService.addProjectProperty(project.id, newProperty);
      
      toast({
        title: "Success",
        description: "Property added successfully",
        duration: 5000
      });
      
      setProperties([...properties, result]);
      setShowAddPropertyDialog(false);
      setNewProperty({ name: "", type: "text", value: "" });
      onUpdate();
    } catch (error) {
      console.error("Failed to add property:", error);
      toast({
        title: "Error",
        description: "Failed to add property",
        className: "text-red-600",
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateProperty = async (propertyId: string, data: Partial<ProjectProperty>) => {
    try {
      await projectService.updateProjectProperty(project.id, propertyId, data);
      
      toast({
        title: "Success",
        description: "Property updated successfully",
        duration: 5000
      });
      
      // Update local state
      setProperties(properties.map(prop => 
        prop.id === propertyId ? { ...prop, ...data } : prop
      ));
      onUpdate();
    } catch (error) {
      console.error("Failed to update property:", error);
      toast({
        title: "Error",
        description: "Failed to update property",
        className: "text-red-600",
        duration: 5000
      });
    }
  };
  
  const handleDeleteProperty = async (propertyId: string) => {
    try {
      await projectService.deleteProjectProperty(project.id, propertyId);
      
      toast({
        title: "Success",
        description: "Property deleted successfully",
        duration: 5000
      });
      
      // Update local state
      setProperties(properties.filter(prop => prop.id !== propertyId));
      setPropertyToDelete(null);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast({
        title: "Error",
        description: "Failed to delete property",
        className: "text-red-600",
        duration: 5000
      });
    }
  };
  
  // Tags section
  const handleAddTag = async () => {
    if (!newTag.name) {
      toast({
        title: "Missing information",
        description: "Please provide a tag name",
        className: "text-red-600",
        duration: 5000
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await projectService.addProjectTag(project.id, newTag);
      
      toast({
        title: "Success",
        description: "Tag added successfully",
        duration: 5000
      });
      
      setTags([...tags, result]);
      setShowAddTagDialog(false);
      setNewTag({ name: "", color: "#3B82F6" });
      onUpdate();
    } catch (error) {
      console.error("Failed to add tag:", error);
      toast({
        title: "Error",
        description: "Failed to add tag",
        className: "text-red-600",
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateTag = async (tagId: string, data: Partial<ProjectTag>) => {
    try {
      await projectService.updateProjectTag(project.id, tagId, data);
      
      toast({
        title: "Success",
        description: "Tag updated successfully",
        duration: 5000
      });
      
      // Update local state
      setTags(tags.map(tag => 
        tag.id === tagId ? { ...tag, ...data } : tag
      ));
      onUpdate();
    } catch (error) {
      console.error("Failed to update tag:", error);
      toast({
        title: "Error",
        description: "Failed to update tag",
        className: "text-red-600",
        duration: 5000
      });
    }
  };
  
  const handleDeleteTag = async (tagId: string) => {
    try {
      await projectService.deleteProjectTag(project.id, tagId);
      
      toast({
        title: "Success",
        description: "Tag deleted successfully",
        duration: 5000
      });
      
      // Update local state
      setTags(tags.filter(tag => tag.id !== tagId));
      setTagToDelete(null);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        className: "text-red-600",
        duration: 5000
      });
    }
  };

  const tabs = [
    { id: "team", label: "Team Members", icon: <Users className="h-4 w-4 mr-2" /> },
    { id: "properties", label: "Properties", icon: <Tag className="h-4 w-4 mr-2" /> },
    { id: "tags", label: "Tags", icon: <Tag className="h-4 w-4 mr-2" /> }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] min-h-[400px] max-h-[80vh] overflow-hidden flex p-0 gap-0">
        <div className="w-[220px] border-r bg-muted/40 p-0 overflow-auto">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>Project Settings</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-1 p-2">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "outline" : "ghost"}
                className={`justify-start ${activeTab === tab.id ? "" : "text-muted-foreground"}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <DialogHeader className="p-6 border-b">
            <DialogTitle>{project.name} - {tabs.find(t => t.id === activeTab)?.label}</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="p-6">
              {activeTab === "team" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Project Team Members</h3>
                    <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Members
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Team Members</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="search-users">Search Users</Label>
                            <Input
                              id="search-users"
                              placeholder="Search by name or email"
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value);
                                searchUsers(e.target.value);
                              }}
                            />
                          </div>
                          
                          {searchResults.length > 0 && (
                            <div className="border rounded-md max-h-[200px] overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[30px]"></TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {searchResults.map((user) => (
                                    <TableRow 
                                      key={user.id} 
                                      className={selectedUsers.includes(user.id) ? "bg-blue-50" : ""}
                                    >
                                      <TableCell>
                                        <input
                                          type="checkbox"
                                          checked={selectedUsers.includes(user.id)}
                                          onChange={() => handleUserSelect(user.id)}
                                          className="rounded"
                                        />
                                      </TableCell>
                                      <TableCell>{user.name}</TableCell>
                                      <TableCell>{user.email}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                          
                          {selectedUsers.length > 0 && (
                            <div className="space-y-2">
                              <Label htmlFor="role-select">Assign Role</Label>
                              <Select 
                                value={selectedRole} 
                                onValueChange={(value) => setSelectedRole(value as 'owner' | 'admin' | 'member')}
                              >
                                <SelectTrigger id="role-select">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">Owner</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddMembers} disabled={!selectedUsers.length || isSaving}>
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Add Selected Members'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {members.length > 0 ? (
                    <Card>
                      <Table>
                        <TableHeader >
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added On</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.id} className={!member.isActive ? "opacity-60" : ""}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {member.avatar && (
                                    <img 
                                      src={member.avatar} 
                                      alt={member.userName} 
                                      className="w-8 h-8 rounded-full"
                                    />
                                  )}
                                  <span>{member.userName}</span>
                                </div>
                              </TableCell>
                              <TableCell>{member.email}</TableCell>
                              <TableCell>
                                <Select 
                                  value={member.role} 
                                  onValueChange={(value) => handleChangeMemberRole(
                                    member.id, 
                                    value as 'owner' | 'admin' | 'member'
                                  )}
                                >
                                  <SelectTrigger className="h-8 w-[120px]">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                {member.isActive ? (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(member.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleToggleMemberStatus(member.id, !member.isActive)}
                                    title={member.isActive ? "Deactivate member" : "Activate member"}
                                  >
                                    {member.isActive ? (
                                      <XCircle className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    )}
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleRemoveMember(member.id)}
                                    title="Remove member"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <Users className="h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">No team members added yet</p>
                        <Button 
                          variant="outline"
                          onClick={() => setShowAddMemberDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Your First Team Member
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              
              {activeTab === "properties" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Custom Project Properties</h3>
                    <Dialog open={showAddPropertyDialog} onOpenChange={setShowAddPropertyDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Property
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Custom Property</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="property-name">Property Name</Label>
                            <Input
                              id="property-name"
                              placeholder="Enter property name"
                              value={newProperty.name}
                              onChange={(e) => setNewProperty({...newProperty, name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="property-type">Property Type</Label>
                            <Select 
                              value={newProperty.type} 
                              onValueChange={(value) => setNewProperty({...newProperty, type: value})}
                            >
                              <SelectTrigger id="property-type">
                                <SelectValue placeholder="Select property type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="boolean">Yes/No</SelectItem>
                                <SelectItem value="url">URL</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="property-value">Default Value (Optional)</Label>
                            {newProperty.type === 'boolean' ? (
                              <Select 
                                value={newProperty.value} 
                                onValueChange={(value) => setNewProperty({...newProperty, value})}
                              >
                                <SelectTrigger id="property-value">
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Yes</SelectItem>
                                  <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : newProperty.type === 'date' ? (
                              <Input
                                id="property-value"
                                type="date"
                                value={newProperty.value}
                                onChange={(e) => setNewProperty({...newProperty, value: e.target.value})}
                              />
                            ) : (
                              <Input
                                id="property-value"
                                type={newProperty.type === 'number' ? 'number' : 'text'}
                                placeholder={`Enter default ${newProperty.type} value`}
                                value={newProperty.value}
                                onChange={(e) => setNewProperty({...newProperty, value: e.target.value})}
                              />
                            )}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowAddPropertyDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddProperty} disabled={!newProperty.name || isSaving}>
                            {isSaving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              'Add Property'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <AlertDialog open={!!propertyToDelete} onOpenChange={() => setPropertyToDelete(null)}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this property and its value from the project.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => propertyToDelete && handleDeleteProperty(propertyToDelete)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {properties.length > 0 ? (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Property Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {properties.map((property) => (
                            <TableRow key={property.id}>
                              <TableCell className="font-medium">
                                {property.name}
                              </TableCell>
                              <TableCell className="capitalize">
                                {property.type}
                              </TableCell>
                              <TableCell>
                                {property.type === 'boolean' ? (
                                  <Badge variant={property.value === 'true' ? 'secondary' : 'secondary'} className={property.value === 'true' ? 'bg-green-100 text-green-800' : ''}>
                                    {property.value === 'true' ? 'Yes' : 'No'}
                                  </Badge>
                                ) : property.type === 'url' ? (
                                    property.value ? (
                                        <a 
                                          href={property.value} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:underline flex items-center"
                                        >
                                          {property.value.substring(0, 30)}
                                          {property.value.length > 30 ? '...' : ''}
                                          <Tag className="h-3 w-3 ml-1" />
                                        </a>
                                      ) : 'Not set'
                                    ) : (
                                      property.value || 'Not set'
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
  <div className="flex justify-end space-x-2">
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => {
        const newValue = window.prompt(`Update value for ${property.name}:`, property.value);
        if (newValue !== null) {
          handleUpdateProperty(property.id, { value: newValue });
        }
      }}
    >
      <Edit className="h-4 w-4 text-gray-500" />
    </Button>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => setPropertyToDelete(property.id)}
    >
      <Trash2 className="h-4 w-4 text-red-500" />
    </Button>
  </div>
</TableCell>
</TableRow>
))}
</TableBody>
</Table>
</Card>
) : (
<Card>
  <CardContent className="flex flex-col items-center justify-center p-6">
    <Tag className="h-12 w-12 text-gray-400 mb-4" />
    <p className="text-gray-500 mb-4">No custom properties defined yet</p>
    <Button 
      variant="outline"
      onClick={() => setShowAddPropertyDialog(true)}
    >
      <Plus className="h-4 w-4 mr-1" />
      Add Your First Property
    </Button>
  </CardContent>
</Card>
)}
</div>
)}

{activeTab === "tags" && (
<div className="space-y-4">
  <div className="flex justify-between items-center">
    <h3 className="text-lg font-medium">Project Tags</h3>
    <Dialog open={showAddTagDialog} onOpenChange={setShowAddTagDialog}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Tag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project Tag</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tag-name">Tag Name</Label>
            <Input
              id="tag-name"
              placeholder="Enter tag name"
              value={newTag.name}
              onChange={(e) => setNewTag({...newTag, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag-color">Tag Color</Label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="tag-color"
                value={newTag.color}
                onChange={(e) => setNewTag({...newTag, color: e.target.value})}
                className="h-8 w-8 border rounded cursor-pointer"
              />
              <div 
                className="px-3 py-1 rounded-full text-sm text-white"
                style={{ backgroundColor: newTag.color }}
              >
                {newTag.name || 'Tag Preview'}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddTagDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddTag} disabled={!newTag.name || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Tag'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  
  <AlertDialog open={!!tagToDelete} onOpenChange={() => setTagToDelete(null)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently delete this tag from the project.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-red-600 hover:bg-red-700"
          onClick={() => tagToDelete && handleDeleteTag(tagToDelete)}
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  
  {tags.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tags.map((tag) => (
        <Card key={tag.id} className="flex items-center p-3">
          <div 
            className="w-3 h-3 rounded-full mr-3"
            style={{ backgroundColor: tag.color }}
          />
          <div className="flex-1">
            <p className="font-medium">{tag.name}</p>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newName = window.prompt(`Update name for tag ${tag.name}:`, tag.name);
                if (newName !== null) {
                  handleUpdateTag(tag.id, { name: newName });
                }
              }}
            >
              <Edit className="h-4 w-4 text-gray-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTagToDelete(tag.id)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  ) : (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <Tag className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500 mb-4">No tags defined yet</p>
        <Button 
          variant="outline"
          onClick={() => setShowAddTagDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Your First Tag
        </Button>
      </CardContent>
    </Card>
  )}
</div>
)}
</div>
)}
</div>
</DialogContent>
</Dialog>
);
}