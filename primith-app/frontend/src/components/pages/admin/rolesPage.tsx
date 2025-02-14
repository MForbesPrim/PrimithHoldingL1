import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import AuthService, { Role, Organization } from '@/services/auth'
import { RoleDialog } from '@/components/pages/admin/roleDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | undefined>()
  const { toast } = useToast()

  const canDeleteRole = (role: Role) => {
    return role.name !== 'super_admin';
  };
  const canEditRole = (role: Role) => {
    return role.name !== 'super_admin';
  };


  const fetchData = async () => {
    try {
      const [roles, orgs] = await Promise.all([
        AuthService.getRoles(),
        AuthService.getOrganizations()
      ])
      setRoles(roles)
      setOrganizations(orgs)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch data",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddRole = async (roleData: Partial<Role>) => {
    try {
      const newRole = await AuthService.createRole(roleData)
      setRoles(prev => [...prev, newRole])
      toast({
        title: "Success",
        description: "Role created successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error('Failed to add role:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create role",
        duration: 5000,
      })
      throw error
    }
  }

  const handleEditRole = async (roleData: Partial<Role>) => {
    try {
      console.log('Editing role:', editingRole)
      if (!editingRole?.id) {
        console.warn('No editing role found.')
        return
      }
      const updatedRole = await AuthService.updateRole(editingRole.id, roleData)
      if (!updatedRole) {
        throw new Error('Updated role is undefined.')
      }
      setRoles(prev => prev.map(role => 
        role.id === updatedRole.id ? updatedRole : role
      ))
      toast({
        title: "Success",
        description: "Role updated successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error('Failed to update role:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update role",
        duration: 5000,
      })
      throw error
    }
  }

  const handleDeleteRole = async () => {
    try {
      if (!roleToDelete?.id) return
      await AuthService.deleteRole(roleToDelete.id)
      setRoles(prev => prev.filter(role => role.id !== roleToDelete.id))
      setDeleteDialogOpen(false)
      toast({
        title: "Success",
        description: "Role deleted successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error('Failed to delete role:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete role",
        duration: 5000,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Roles</h2>
        <Button onClick={() => {
          setEditingRole(undefined)
          setDialogOpen(true)
        }}>
          Add Role
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">{role.name}</TableCell>
              <TableCell>{role.description}</TableCell>
              <TableCell>
                {role.organizationId 
                    ? organizations.find(org => org.id === role.organizationId)?.name 
                    : "Global"}
                </TableCell>
              <TableCell className="text-right space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                    setEditingRole(role)
                    setDialogOpen(true)
                }}
                disabled={!canEditRole(role)}
                >
                Edit
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => {
                        if (canDeleteRole(role)) {
                        setRoleToDelete(role)
                        setDeleteDialogOpen(true)
                        } else {
                        toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Super Admin role cannot be deleted",
                            duration: 5000,
                        })
                        }
                    }}
                    disabled={!canDeleteRole(role)}
                    >
                    Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RoleDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingRole(undefined)
        }}
        onSubmit={editingRole ? handleEditRole : handleAddRole}
        role={editingRole}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              and remove all associated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}