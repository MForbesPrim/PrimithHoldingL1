import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import AuthService, { User } from '@/services/auth'
import { UserDialog } from '@/components/pages/admin/userDialog'
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

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | undefined>()
  const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      const users = await AuthService.getUsers()
      setUsers(users)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAddUser = async (userData: Partial<User>) => {
    try {
      const newUser = await AuthService.createUser(userData)
      setUsers(prev => [...prev, newUser])
      toast({
        title: "Success",
        description: "User created successfully",
      })
    } catch (error) {
      console.error('Failed to add user:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create user",
      })
      throw error
    }
  }

  const handleEditUser = async (userData: Partial<User>) => {
    try {
      if (!editingUser?.id) return
      const updatedUser = await AuthService.updateUser(editingUser.id, userData)
      setUsers(prev => prev.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      ))
      toast({
        title: "Success",
        description: "User updated successfully",
      })
    } catch (error) {
      console.error('Failed to update user:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user",
      })
      throw error
    }
  }

  const handleDeleteUser = async () => {
    try {
      if (!userToDelete?.id) return
      await AuthService.deleteUser(userToDelete.id)
      setUsers(prev => prev.filter(user => user.id !== userToDelete.id))
      setDeleteDialogOpen(false)
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user",
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
        <h2 className="text-xl font-semibold">Users</h2>
        <Button onClick={() => {
          setEditingUser(undefined)
          setDialogOpen(true)
        }}>
          Add User
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Organizations</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.firstName} {user.lastName}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge 
                  variant={user.isActive ? "default" : "secondary"}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                {user.organizations?.map(org => (
                  <Badge key={org.id} variant="outline" className="mr-1">
                    {org.name}
                  </Badge>
                ))}
              </TableCell>
              <TableCell>
                {user.roles?.map(role => (
                  <Badge key={role.id} variant="outline" className="mr-1">
                    {role.name}
                  </Badge>
                ))}
              </TableCell>
              <TableCell className="text-right space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                    // Set the user first
                    setEditingUser(user);
                    // Then open the dialog in the next render cycle
                    setTimeout(() => setDialogOpen(true), 0);
                }}
                >
                Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive/90"
                  onClick={() => {
                    setUserToDelete(user)
                    setDeleteDialogOpen(true)
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <UserDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingUser(undefined)
        }}
        onSubmit={editingUser ? handleEditUser : handleAddUser}
        user={editingUser}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              and remove their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}