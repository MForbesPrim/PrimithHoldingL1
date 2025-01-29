import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Organization, Service } from "@/services/auth"
import { MultiSelect } from "@/components/ui/multi-select"
import AuthService from '@/services/auth'

interface OrganizationDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (organization: Partial<Organization>) => Promise<void>
  organization?: Organization
}

const defaultFormData = {
  name: "",
  description: "",
  services: []
};

export function OrganizationDialog({ open, onClose, onSubmit, organization }: OrganizationDialogProps) {
  const isEditing = React.useRef(!!organization);
  const [formData, setFormData] = useState<Partial<Organization>>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData(defaultFormData);
    }
  }, [open]);

  // Load organization data when editing
  useEffect(() => {
    if (organization) {
      setFormData({
        ...organization,
        services: organization.services || []
      });
    }
  }, [organization]);

  // Fetch services when dialog opens
  useEffect(() => {
    if (open) {
      isEditing.current = !!organization;
      const fetchServices = async () => {
        try {
          const fetchedServices = await AuthService.getServices();
          setServices(fetchedServices);
        } catch (error) {
          console.error('Failed to fetch services:', error);
        }
      };
      fetchServices();
    }
  }, [open, organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save organization:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing.current ? 'Edit Organization' : 'Add Organization'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Services</Label>
              <MultiSelect
                options={services.map(service => ({
                  label: service.name,
                  value: service.id
                }))}
                onValueChange={(values) => {
                  const selectedServices = services.filter(service => 
                    values.includes(service.id)
                  );
                  setFormData(prev => ({
                    ...prev,
                    services: selectedServices
                  }));
                }}
                defaultValue={formData.services?.map(service => service.id)}
                placeholder="Select services"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing.current ? 'Save Changes' : 'Add Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}