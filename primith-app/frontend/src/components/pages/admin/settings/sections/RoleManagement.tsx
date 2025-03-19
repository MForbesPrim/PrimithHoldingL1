// RoleManagement.tsx
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import AuthService, { Role } from "@/services/auth"
import { Plus, Loader2, Edit, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentRole, setCurrentRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    isGlobal?: boolean;
  }>({
    name: "",
    description: "",
    isGlobal: false,
  })
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Check if current user is an admin and super admin
        const adminStatus = await AuthService.isOrganizationAdmin()
        const superAdminStatus = await AuthService.isSuperAdmin()
        setIsAdmin(adminStatus)
        setIsSuperAdmin(superAdminStatus)
        
        // Fetch roles
        const rolesData = await AuthService.getOrganizationRoles()
        setRoles(rolesData)
      } catch (error) {
        console.error("Failed to fetch role data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load roles",
          duration: 5000,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isGlobal: false,
    })
    setCurrentRole(null)
  }

  const openEditDialog = (role: Role) => {
    setCurrentRole(role)
    setFormData({
      name: role.name,
      description: role.description || "",
      isGlobal: role.isGlobal,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (role: Role) => {
    setCurrentRole(role)
    setIsDeleteDialogOpen(true)
  }

  const handleAddRole = async () => {
    try {
      setIsSaving(true)
      
      // If not a super admin, ensure the role is organization-specific
      const roleData = {
        name: formData.name,
        description: formData.description,
        isGlobal: isSuperAdmin ? formData.isGlobal : false
      }
      
      const newRole = await AuthService.createOrganizationRole(roleData)
      setRoles(prev => [...prev, newRole])
      setIsAddDialogOpen(false)
      resetForm()
      
      toast({
        title: "Success",
        description: "Role has been added successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error("Failed to add role:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add role",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!currentRole) return
    
    try {
      setIsSaving(true)
      const updatedRole = await AuthService.updateOrganizationRole(currentRole.id, {
        name: formData.name,
        description: formData.description,
        isGlobal: formData.isGlobal,
      })
      
      setRoles(prev => prev.map(role => 
        role.id === updatedRole.id ? updatedRole : role
      ))
      setIsEditDialogOpen(false)
      resetForm()
      
      toast({
        title: "Success",
        description: "Role has been updated successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error("Failed to update role:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update role",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!currentRole) return
    
    try {
      setIsSaving(true)
      
      // Check if we're trying to delete an admin role
      if (currentRole.name === "admin" || currentRole.name === "super_admin") {
        // Count how many admin/super_admin roles we have
        const adminRoles = roles.filter(role => 
          role.name === "admin" || role.name === "super_admin"
        )
        
        if (adminRoles.length <= 1) {
          throw new Error("Cannot delete the last admin role. At least one admin role must exist.")
        }
      }
      
      await AuthService.deleteOrganizationRole(currentRole.id)
      
      setRoles(prev => prev.filter(role => role.id !== currentRole.id))
      setIsDeleteDialogOpen(false)
      resetForm()
      
      toast({
        title: "Success",
        description: "Role deleted successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error("Failed to delete role:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete role",
        duration: 5000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mt-4">
        <div>
          <h3 className="text-lg font-medium">Roles</h3>
          <p className="text-sm text-muted-foreground">
            Manage roles for your organization
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Role
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scope</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-4 text-muted-foreground">
                    No roles found
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description || "No description"}</TableCell>
                    <TableCell>
                      <Badge variant={(role as any).isGlobal ? "secondary" : "default"}>
                        {(role as any).isGlobal ? "Global" : "Organization"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex space-x-2">
                          {!(role as any).isGlobal && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openEditDialog(role)}
                              >
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openDeleteDialog(role)}
                                disabled={
                                  role.name === "owner" || 
                                  role.name === "super_admin" ||
                                  ((role.name === "admin" || role.name === "super_admin") && 
                                    roles.filter(r => r.name === "admin" || r.name === "super_admin").length <= 1) ||
                                  (role.isGlobal && !isSuperAdmin)
                                }
                              >
                                <Trash className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Role Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Enter the details of the new role below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Editor, Viewer, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the role's purpose and permissions"
                rows={3}
              />
            </div>

            {isSuperAdmin && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isGlobal"
                  name="isGlobal"
                  checked={formData.isGlobal}
                  onChange={(e) => setFormData(prev => ({ ...prev, isGlobal: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isGlobal">Make this a global role</Label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddRole}
              disabled={isSaving || !formData.name.trim()}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role details below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>

            {isSuperAdmin && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isGlobal"
                  name="isGlobal"
                  checked={formData.isGlobal}
                  onChange={(e) => setFormData(prev => ({ ...prev, isGlobal: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isGlobal">Make this a global role</Label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={isSaving || !formData.name.trim()}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {currentRole && (
            <div className="py-4">
              <p><strong>Name:</strong> {currentRole.name}</p>
              <p><strong>Description:</strong> {currentRole.description || "No description"}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}