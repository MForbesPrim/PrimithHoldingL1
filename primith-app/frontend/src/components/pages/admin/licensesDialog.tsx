// components/pages/admin/licensesDialog.tsx
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Loader2, PlusCircle, CalendarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import AuthService, { License } from "@/services/auth"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface LicensesDialogProps {
  open: boolean
  onClose: () => void
  organizationId: string
  isAdmin: boolean
}

interface LicenseFormData {
  licenseType: string
  seatsAllowed: string
  startsAt: string
  expiresAt: string
  isActive: boolean
  autoRenew: boolean
}

const defaultFormData: LicenseFormData = {
  licenseType: "Basic",
  seatsAllowed: "",
  startsAt: new Date().toLocaleDateString('en-CA'),
  expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-CA'),
  isActive: true,
  autoRenew: false
}

export function LicensesDialog({ open, onClose, organizationId, isAdmin }: LicensesDialogProps) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<LicenseFormData>(defaultFormData)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLicense, setEditingLicense] = useState<License | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchLicenses = async () => {
    try {
      setLoading(true)
      const data = await AuthService.getOrganizationLicenses()
      setLicenses(data)
    } catch (error) {
      console.error('Failed to fetch licenses:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch licenses",
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && organizationId) {
      fetchLicenses()
    }
  }, [open, organizationId])

  const handleAddLicense = async () => {
    try {
      const licenseData: Partial<License> = {
        licenseType: formData.licenseType,
        seatsAllowed: formData.seatsAllowed === '' ? null : parseInt(formData.seatsAllowed),
        startsAt: new Date(formData.startsAt),
        expiresAt: new Date(formData.expiresAt),
        isActive: formData.isActive,
        autoRenew: formData.autoRenew
      };
      
      await AuthService.addOrganizationLicense(organizationId, licenseData);
      toast({
        title: "Success",
        description: "License added successfully",
        duration: 5000,
      })
      setShowAddForm(false)
      setFormData(defaultFormData)
      fetchLicenses()
    } catch (error) {
      console.error('Failed to add license:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add license",
        duration: 5000,
      })
    }
  }

  const handleEditLicense = async () => {
    if (!editingLicense) return

    try {
      // Only pass fields that can be updated
      await AuthService.updateOrganizationLicense(organizationId, editingLicense.id, {
        seatsAllowed: editingLicense.seatsAllowed,
        expiresAt: new Date(editingLicense.expiresAt),
        isActive: editingLicense.isActive,
        autoRenew: editingLicense.autoRenew
      })
      toast({
        title: "Success",
        description: "License updated successfully",
        duration: 5000,
      })
      setEditingLicense(null)
      fetchLicenses()
    } catch (error) {
      console.error('Failed to update license:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update license",
        duration: 5000,
      })
    }
  }

  const startEditingLicense = (license: License) => {
    setEditingLicense(license)
    setConfirmDialogOpen(true)
  }

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    const startDate = date.toLocaleDateString('en-CA');
    // Set expiry date to one year from the selected start date
    const expiryDate = new Date(date);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    setFormData(prev => ({ 
      ...prev, 
      startsAt: startDate,
      expiresAt: expiryDate.toLocaleDateString('en-CA')
    }));
  };

  const renderAddForm = () => (
    <div className="border rounded-md p-4 my-4">
      <h3 className="text-lg font-medium mb-4">Add New License</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="licenseType">License Type</Label>
          <Select
            value={formData.licenseType}
            onValueChange={(value) => setFormData(prev => ({ ...prev, licenseType: value }))}
          >
            <SelectTrigger id="licenseType">
              <SelectValue placeholder="Select license type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Basic">Basic</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="seatsAllowed">Seats Allowed</Label>
          <Input
            id="seatsAllowed"
            type="number"
            min="1"
            value={formData.seatsAllowed}
            onChange={(e) => setFormData(prev => ({ ...prev, seatsAllowed: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startsAt ? format(new Date(formData.startsAt + 'T00:00:00'), 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(formData.startsAt + 'T00:00:00')}
                onSelect={handleStartDateChange}
                defaultMonth={new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Expiry Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.expiresAt ? format(new Date(formData.expiresAt + 'T00:00:00'), 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(formData.expiresAt + 'T00:00:00')}
                onSelect={(date) => date && setFormData(prev => ({ 
                  ...prev, 
                  expiresAt: date.toLocaleDateString('en-CA')
                }))}
                defaultMonth={new Date(formData.expiresAt + 'T00:00:00')}
                fromDate={new Date(formData.startsAt + 'T00:00:00')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2 col-span-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="isActive" className="w-24">Active</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>
        <div className="space-y-2 col-span-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="autoRenew" className="w-24">Auto Renew</Label>
            <Switch
              id="autoRenew"
              checked={formData.autoRenew}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoRenew: checked }))}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
        <Button onClick={handleAddLicense}>Add License</Button>
      </div>
    </div>
  )

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return format(dateObj, 'MMM dd, yyyy')
  }

  const isExpired = (date: string | Date) => {
    return new Date(date) < new Date()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setShowAddForm(false);
      }
      onClose();
    }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Organization Licenses</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {isAdmin && !showAddForm && (
              <Button onClick={() => setShowAddForm(true)} className="mb-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Add License
              </Button>
            )}
            
            {isAdmin && showAddForm && renderAddForm()}
            
            {!licenses || licenses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No licenses found for this organization.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Type</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((license) => (
                    <TableRow key={license.id}>
                      <TableCell>
                        <div className="font-medium">{license.licenseType}</div>
                        <div className="text-xs text-muted-foreground">Key: {license.licenseKey.substring(0, 8)}...{license.licenseKey.substring(license.licenseKey.length - 4)}</div>
                      </TableCell>
                      <TableCell>
                        <div>{license.seatsUsed} / {license.seatsAllowed === null || license.seatsAllowed === 0 ? '∞' : license.seatsAllowed}</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatDate(license.startsAt)} to</div>
                        <div>{formatDate(license.expiresAt)}</div>
                      </TableCell>
                      <TableCell>
                        {license.isActive ? (
                          isExpired(license.expiresAt) ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="success">Active</Badge>
                          )
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                        {license.autoRenew && (
                          <Badge variant="outline" className="ml-2">Auto-Renew</Badge>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => startEditingLicense(license)}>
                            Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </DialogContent>

      {editingLicense && (
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit License</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="editSeats">Seats Allowed</Label>
                    <Input
                      id="editSeats"
                      type="number"
                      min="1"
                      value={editingLicense.seatsAllowed === null ? '' : editingLicense.seatsAllowed}
                      onChange={(e) => setEditingLicense({
                        ...editingLicense,
                        seatsAllowed: e.target.value === '' ? null : parseInt(e.target.value)
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editExpiry">Expiry Date</Label>
                    <Input
                      id="editExpiry"
                      type="date"
                      value={typeof editingLicense.expiresAt === 'string' 
                        ? editingLicense.expiresAt.split('T')[0]
                        : new Date(editingLicense.expiresAt).toISOString().split('T')[0]}
                      onChange={(e) => setEditingLicense({
                        ...editingLicense,
                        expiresAt: e.target.value
                      })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="editActive" className="w-24">Active</Label>
                    <Switch
                      id="editActive"
                      checked={editingLicense.isActive}
                      onCheckedChange={(checked) => setEditingLicense({
                        ...editingLicense,
                        isActive: checked
                      })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="editAutoRenew" className="w-24">Auto Renew</Label>
                    <Switch
                      id="editAutoRenew"
                      checked={editingLicense.autoRenew}
                      onCheckedChange={(checked) => setEditingLicense({
                        ...editingLicense,
                        autoRenew: checked
                      })}
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditingLicense(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleEditLicense}>Save Changes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  )
}