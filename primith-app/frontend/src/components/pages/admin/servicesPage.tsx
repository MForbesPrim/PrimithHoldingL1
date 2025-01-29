import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package } from "lucide-react"
import AuthService, { Service, Organization } from '@/services/auth'
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | undefined>()
  const [selectedOrgId, setSelectedOrgId] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [services, organizations] = await Promise.all([
          AuthService.getServices(),
          AuthService.getOrganizations()
        ])
        setServices(services)
        setOrganizations(organizations)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch data",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAddOrganization = async () => {
    if (!selectedService?.id || !selectedOrgId) return

    try {
      await AuthService.assignOrganizationService(selectedOrgId, selectedService.id, 'active')
      // Refresh services to get updated organization assignments
      const updatedServices = await AuthService.getServices()
      setServices(updatedServices)
      setDialogOpen(false)
      toast({
        title: "Success",
        description: "Organization added to service successfully",
      })
    } catch (error) {
      console.error('Failed to add organization to service:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add organization to service",
      })
    }
  }

  const handleRemoveOrganization = async (serviceId: string, orgId: string) => {
    try {
      await AuthService.removeOrganizationService(orgId, serviceId)
      // Refresh services to get updated organization assignments
      const updatedServices = await AuthService.getServices()
      setServices(updatedServices)
      toast({
        title: "Success",
        description: "Organization removed from service successfully",
      })
    } catch (error) {
      console.error('Failed to remove organization from service:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove organization from service",
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

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package className="h-12 w-12 mb-4" />
        <p className="text-lg">No services available</p>
        <p className="text-sm">Contact your administrator to add services</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Services</h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Organizations</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="font-medium">{service.name}</TableCell>
              <TableCell>{service.description}</TableCell>
              <TableCell>
                {service.organizations?.map(org => (
                  <Badge key={org.id} variant="outline" className="mr-1">
                    {org.name}
                    <button
                      onClick={() => handleRemoveOrganization(service.id, org.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedService(service)
                    setDialogOpen(true)
                  }}
                >
                  Add Organization
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization to Service</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOrganization} disabled={!selectedOrgId}>
              Add Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}