import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Organization, Role } from "@/services/auth"
import { MultiSelect } from "@/components/ui/multi-select"
import AuthService from '@/services/auth'

interface UserDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (user: Partial<User>) => Promise<void>
  user?: User
}

export function UserDialog({ open, onClose, onSubmit, user }: UserDialogProps) {
    const isEditing = React.useRef(!!user);
    const [formData, setFormData] = useState<Partial<User>>({
      firstName: "",
      lastName: "",
      email: "",
      isActive: true,
      organizations: [],
      roles: []
    });
    
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
  
    // Update formData when user prop changes
    useEffect(() => {
      if (user) {
        console.log('Updating formData with user:', user);
        setFormData({
          ...user,
          organizations: user.organizations ? [...user.organizations] : [],
          roles: user.roles ? [...user.roles] : []
        });
      }
    }, [user]);

    useEffect(() => {
        if (open) {
          isEditing.current = !!user;
        }
      }, [open, user]);
  
    // Fetch organizations and roles when dialog opens
    useEffect(() => {
      if (open) {
        const fetchData = async () => {
          try {
            const [orgs, roles] = await Promise.all([
              AuthService.getOrganizations(),
              AuthService.getRoles()
            ]);
            console.log('Fetched Organizations:', orgs);
            console.log('Fetched Roles:', roles);
            setOrganizations(orgs || []);
            setRoles(roles || []);
          } catch (error) {
            console.error('Failed to fetch data:', error);
          }
        };
        fetchData();
      }
    }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save user:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
            <DialogTitle>{isEditing.current ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
          <Label>Organizations</Label>
          <MultiSelect
            options={organizations.map(org => ({
              label: org.name,
              value: org.id
            }))}
            onValueChange={(values) => {
              const selectedOrgs = organizations.filter(org => 
                values.includes(org.id)
              );
              setFormData(prev => ({
                ...prev,
                organizations: selectedOrgs
              }));
            }}
            defaultValue={formData.organizations?.map(org => org.id)}
            placeholder="Select organizations"
          />
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          <MultiSelect
            options={roles.map(role => ({
              label: `${role.name} (${organizations.find(o => o.id === role.organizationId)?.name})`,
              value: role.id
            }))}
            onValueChange={(values) => {
              const selectedRoles = roles.filter(role => 
                values.includes(role.id)
              );
              setFormData(prev => ({
                ...prev,
                roles: selectedRoles
              }));
            }}
            defaultValue={formData.roles?.map(role => role.id)}
            placeholder="Select roles"
          />
        </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
                Cancel
            </Button>
            <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditing.current ? 'Save Changes' : 'Add User'}
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}