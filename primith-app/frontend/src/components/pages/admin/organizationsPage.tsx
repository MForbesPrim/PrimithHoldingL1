import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import AuthService, { Organization } from '@/services/auth'
import { OrganizationDialog } from '@/components/pages/admin/organizationDialog'
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

export function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrganization, setEditingOrganization] = useState<Organization | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | undefined>()
  const { toast } = useToast()

  const fetchOrganizations = async () => {
    try {
      const orgs = await AuthService.getOrganizations()
      setOrganizations(orgs)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch organizations",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleAddOrganization = async (orgData: Partial<Organization>) => {
    try {
      const newOrg = await AuthService.createOrganization(orgData)
      setOrganizations(prev => [...prev, newOrg])
      toast({
        title: "Success",
        description: "Organization created successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error('Failed to add organization:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create organization",
        duration: 5000,
      })
      throw error
    }
  }

  const handleEditOrganization = async (orgData: Partial<Organization>) => {
    try {
      if (!editingOrganization?.id) return
      const updatedOrg = await AuthService.updateOrganization(editingOrganization.id, orgData)
      
      // Check if we received valid data
      if (updatedOrg && updatedOrg.id) {
        setOrganizations(prev => prev.map(org => 
          org.id === updatedOrg.id ? updatedOrg : org
        ))
        toast({
          title: "Success",
          description: "Organization updated successfully",
          duration: 5000,
        })
      } else {
        // If no valid data returned, refresh the whole list
        await fetchOrganizations()
        toast({
          title: "Success",
          description: "Organization updated successfully",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error('Failed to update organization:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update organization",
        duration: 5000,
      })
      throw error
    }
  }

  const handleDeleteOrganization = async () => {
    try {
      if (!organizationToDelete?.id) return
      await AuthService.deleteOrganization(organizationToDelete.id)
      setOrganizations(prev => prev.filter(org => org.id !== organizationToDelete.id))
      setDeleteDialogOpen(false)
      toast({
        title: "Success",
        description: "Organization deleted successfully",
        duration: 5000,
      })
    } catch (error) {
      console.error('Failed to delete organization:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete organization",
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
        <h2 className="text-xl font-semibold">Organizations</h2>
        <Button onClick={() => {
          setEditingOrganization(undefined)
          setDialogOpen(true)
        }}>
          Add Organization
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Services</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow key={org.id}>
              <TableCell className="font-medium">{org.name}</TableCell>
              <TableCell>{org.description}</TableCell>
              <TableCell>
                {org.services?.map(service => (
                  <Badge key={service.id} variant="outline" className="mr-1">
                    {service.name}
                  </Badge>
                ))}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingOrganization(org)
                    setDialogOpen(true)
                  }}
                >
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive/90"
                  onClick={() => {
                    setOrganizationToDelete(org)
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

      <OrganizationDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingOrganization(undefined)
        }}
        onSubmit={editingOrganization ? handleEditOrganization : handleAddOrganization}
        organization={editingOrganization}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrganization}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}