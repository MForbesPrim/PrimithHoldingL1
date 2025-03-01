import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Organization, Role } from "@/services/auth"
import { MultiSelect } from "@/components/ui/multi-select"
import AuthService from '@/services/auth'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff } from "lucide-react"

interface UserDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (user: Partial<User>) => Promise<void>
  user?: User
}

interface UserFormData extends Partial<User> {
  password?: string;
  passwordConfirmation?: string;
}

export function UserDialog({ open, onClose, onSubmit, user }: UserDialogProps) {
    const isEditing = React.useRef(!!user);
    const [formData, setFormData] = useState<UserFormData>({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      isActive: true,
      organizations: [],
      roles: []
    });
    
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [passwordError, setPasswordError] = useState<string>("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Track selected values for MultiSelect components
    const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  
    // Update formData when user prop changes
    useEffect(() => {
      if (user) {
        console.log('Updating formData with user:', user);
        setFormData({
          ...user,
          password: "",
          passwordConfirmation: "",
          organizations: user.organizations ? [...user.organizations] : [],
          roles: user.roles ? [...user.roles] : []
        });
        
        // Set initial selected values for multiselect
        if (user.organizations) {
          setSelectedOrgIds(user.organizations.map(org => org.id));
        }
        if (user.roles) {
          setSelectedRoleIds(user.roles.map(role => role.id));
        }
      } else {
        // Reset form when adding a new user
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          passwordConfirmation: "",
          isActive: true,
          organizations: [],
          roles: []
        });
        setSelectedOrgIds([]);
        setSelectedRoleIds([]);
      }
      // Reset password error and visibility when dialog opens/closes
      setPasswordError("");
      setShowPassword(false);
      setShowConfirmPassword(false);
    }, [user, open]);

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
    e.preventDefault();
    
    // Check if passwords match when creating a new user
    if (!isEditing.current) {
      if (!formData.password) {
        setPasswordError("Password is required");
        return;
      }
      
      if (formData.password !== formData.passwordConfirmation) {
        setPasswordError("Passwords do not match");
        return;
      }
    }
    
    setLoading(true);
    try {
      // If empty password and editing, don't send it to the server
      const dataToSubmit = {...formData};
      
      // Remove passwordConfirmation as it's not needed in API call
      delete dataToSubmit.passwordConfirmation;
      
      if (isEditing.current && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }
      
      await onSubmit(dataToSubmit);
      onClose();
    } catch (error) {
      console.error('Failed to save user:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog modal={true} open={open} onOpenChange={onClose}>
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
                  value={formData.firstName || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ""}
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
                value={formData.email || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            
            {/* Password fields - only show when adding a new user */}
            {!isEditing.current && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password || ""}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, password: e.target.value }));
                        setPasswordError("");
                      }}
                      required={!isEditing.current}
                      placeholder="Enter user password"
                      className="pr-10" // Add padding for the icon
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1} // Prevent focus on tab navigation
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirmation">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="passwordConfirmation"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.passwordConfirmation || ""}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, passwordConfirmation: e.target.value }));
                        setPasswordError("");
                      }}
                      required={!isEditing.current}
                      placeholder="Confirm password"
                      className="pr-10" // Add padding for the icon
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1} // Prevent focus on tab navigation
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showConfirmPassword ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                </div>
                
                {/* Password error message */}
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
              </>
            )}
            
            <div className="space-y-2">
              <Label>Organizations</Label>
              <MultiSelect
                className="z-1000"
                options={organizations.map(org => ({
                  label: org.name,
                  value: org.id
                }))}
                value={selectedOrgIds}
                onValueChange={(values) => {
                  setSelectedOrgIds(values);
                  const selectedOrgs = organizations.filter(org => values.includes(org.id));
                  setFormData(prev => ({
                    ...prev,
                    organizations: selectedOrgs
                  }));
                }}
                placeholder="Select organizations"
              />
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <MultiSelect
                options={roles.map(role => ({
                  label: `${role.name} (${organizations.find(o => o.id === role.organizationId)?.name || 'Global'})`,
                  value: role.id
                }))}
                value={selectedRoleIds}
                onValueChange={(values) => {
                  setSelectedRoleIds(values);
                  const selectedRoles = roles.filter(role => values.includes(role.id));
                  setFormData(prev => ({
                    ...prev,
                    roles: selectedRoles
                  }));
                }}
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