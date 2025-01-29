import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Role, Organization } from "@/services/auth"
import AuthService from '@/services/auth'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

interface RoleDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (role: Partial<Role>) => Promise<void>
  role?: Role
}

export function RoleDialog({ open, onClose, onSubmit, role }: RoleDialogProps) {
  const isEditing = React.useRef(!!role);
  const [formData, setFormData] = useState<Partial<Role>>({
    name: "",
    description: "",
    organizationId: null,
  });
  
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (role) {
      setFormData({
        ...role
      });
    }
  }, [role]);

  useEffect(() => {
    if (open) {
      isEditing.current = !!role;
      const fetchData = async () => {
        try {
          const orgs = await AuthService.getOrganizations();
          setOrganizations(orgs || []);
        } catch (error) {
          console.error('Failed to fetch data:', error);
        }
      };
      fetchData();
    }
  }, [open, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure organizationId is null or a valid string
      const processedOrganizationId = 
        formData.organizationId === "global" || formData.organizationId === ""
          ? null
          : formData.organizationId;

      const dataToSubmit: Partial<Role> = {
        ...formData,
        organizationId: processedOrganizationId
      };
      console.log('Submitting data:', dataToSubmit); // Debugging
      await onSubmit(dataToSubmit);
      onClose();
    } catch (error: any) {
      console.error('Failed to save role:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing.current ? 'Edit Role' : 'Add Role'}</DialogTitle>
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
            <Label htmlFor="organizationId">Organization</Label>
            <Select
                value={formData.organizationId || "global"}
                onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                organizationId: value === "global" ? undefined : value 
                }))}
            >
                <SelectTrigger>
                <SelectValue placeholder="Select Organization" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                    {org.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditing.current ? 'Save Changes' : 'Add Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}