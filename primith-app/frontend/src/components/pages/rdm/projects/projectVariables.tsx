import { ProjectVariable } from "@/types/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, Loader2, Save, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AuthService from '@/services/auth'; // Import AuthService
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

interface ProjectVariablesPanelProps {
  projectId: string;
  projectService: any;
}

export function ProjectVariablesPanel({ projectId, projectService }: ProjectVariablesPanelProps) {
  const [variables, setVariables] = useState<ProjectVariable[]>([]);
  const [newVariable, setNewVariable] = useState({ key: "", value: "", description: "" });
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [variableToDelete, setVariableToDelete] = useState<ProjectVariable | null>(null);
  const [isProjectMember, setIsProjectMember] = useState(false);
  const { toast } = useToast();

  // Load variables and check membership when component mounts
  useEffect(() => {
    loadVariables();
    checkProjectMembership();
  }, [projectId]);

  const loadVariables = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjectVariables(projectId);
      setVariables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load variables:", error);
      toast({
        title: "Error",
        description: "Failed to load project variables",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to check if current user is a project member
  const checkProjectMembership = async () => {
    try {
      // Get current user ID from AuthService
      const rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth?.user?.id) {
        setIsProjectMember(false);
        return;
      }
      
      const currentUserId = rdmAuth.user.id;
      
      // Get project members and check if current user is a member
      const members = await projectService.getProjectMembers(projectId);
      const isMember = members.some((member: any) => member.userId === currentUserId);
      setIsProjectMember(isMember);
    } catch (error) {
      console.error("Failed to check project membership:", error);
      setIsProjectMember(false);
    }
  };

  const handleAddVariable = async () => {
    if (!newVariable.key || !newVariable.value) return;
    
    try {
      setAdding(true);
      const variable = await projectService.setProjectVariable(
        projectId,
        newVariable.key,
        newVariable.value,
        newVariable.description
      );
      
      if (variable) {
        setVariables([...variables, variable]);
        setNewVariable({ key: "", value: "", description: "" });
        toast({
          title: "Success",
          description: "Variable added successfully"
        });
      }
    } catch (error) {
      console.error("Failed to add variable:", error);
      toast({
        title: "Error",
        description: "Failed to add variable",
        variant: "destructive"
      });
    } finally {
      setAdding(false);
    }
  };

  const handleEditVariable = (variableId: string, currentValue: string) => {
    setEditingVariable(variableId);
    setEditValue(currentValue);
  };

  const handleSaveEdit = async (variable: ProjectVariable) => {
    try {
      const updatedVariable = await projectService.setProjectVariable(
        projectId,
        variable.key,
        editValue,
        variable.description
      );
      
      // Use the updatedVariable returned from the API
      setVariables(variables.map(v => 
        v.id === variable.id ? updatedVariable : v
      ));
      
      toast({
        title: "Success",
        description: "Variable updated successfully"
      });
    } catch (error) {
      console.error("Failed to update variable:", error);
      toast({
        title: "Error",
        description: "Failed to update variable",
        variant: "destructive"
      });
    } finally {
      setEditingVariable(null);
    }
  };

  const confirmDelete = (variable: ProjectVariable) => {
    setVariableToDelete(variable);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteVariable = async () => {
    if (!variableToDelete) return;
    
    try {
      setDeleting(variableToDelete.id);
      await projectService.deleteProjectVariable(projectId, variableToDelete.id);
      setVariables(variables.filter(v => v.id !== variableToDelete.id));
      toast({
        title: "Success",
        description: "Variable deleted successfully"
      });
    } catch (error) {
      console.error("Failed to delete variable:", error);
      toast({
        title: "Error",
        description: "Failed to delete variable",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
      setVariableToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the variable "{variableToDelete?.key}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteVariable}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting === variableToDelete?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Only show the variable addition form if the user is a project member */}
      {isProjectMember && (
        <>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Variable name"
              value={newVariable.key}
              onChange={(e) => setNewVariable({ ...newVariable, key: e.target.value })}
            />
            <Input
              placeholder="Value"
              value={newVariable.value}
              onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
            />
            <Button 
              onClick={handleAddVariable} 
              disabled={!newVariable.key || !newVariable.value || adding}
            >
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
          
          <Input
            placeholder="Description (optional)"
            value={newVariable.description}
            onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
            className="mt-2"
          />
        </>
      )}

      {variables.length === 0 ? (
        <div className="text-center p-8 border rounded-md bg-gray-50">
          <p className="text-gray-500 mb-2">No variables defined for this project yet.</p>
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {variables.map((variable) => (
            <div key={variable.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
              <div className="flex-grow">
                <div className="flex items-baseline">
                  <span className="font-medium">{variable.key}</span>
                  <span className="mx-2 text-gray-400">=</span>
                  {editingVariable === variable.id ? (
                    <Input 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-7 py-0 px-2 text-sm max-w-[300px] ml-1"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm">{variable.value}</span>
                  )}
                </div>
                {variable.description && (
                  <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                )}
              </div>
              {/* Only show edit/delete buttons if the user is a project member */}
              {isProjectMember && (
                <div className="flex space-x-1">
                  {editingVariable === variable.id ? (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSaveEdit(variable)}
                        className="h-8 w-8 p-0"
                      >
                        <Save className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingVariable(null)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditVariable(variable.id, variable.value)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => confirmDelete(variable)}
                        disabled={deleting === variable.id}
                        className="h-8 w-8 p-0"
                      >
                        {deleting === variable.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}