// MilestoneDialog.tsx
import React, { useEffect } from 'react';
import { format, parseISO, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { ProjectMilestone, MilestoneStatus } from '@/types/projects';

// Define form data type
interface MilestoneFormData {
  name: string;
  description?: string;
  status: string;
  dueDate?: string;
  statusId?: string;
}

interface MilestoneDialogProps {
    open: boolean;
    onClose: () => void;
    onCreate?: (milestone: Partial<ProjectMilestone>) => Promise<void>;
    onUpdate?: (id: string, milestone: Partial<ProjectMilestone>) => Promise<void>; // Updated to take id and data
    milestone?: ProjectMilestone;
    isCreating?: boolean;
    isUpdating?: boolean;
    statuses: MilestoneStatus[];
    formData: MilestoneFormData;
    setFormData: React.Dispatch<React.SetStateAction<MilestoneFormData>>;
}

export function MilestoneDialog({
  open,
  onClose,
  onCreate,
  onUpdate,
  milestone,
  isCreating = false,
  isUpdating = false,
  statuses,
  formData,
  setFormData
}: MilestoneDialogProps) {
  
  // Initialize form when dialog opens or milestone changes
useEffect(() => {
    if (milestone) {
      // Editing mode - populate with existing data
      setFormData({
        name: milestone.name || "",
        description: milestone.description || "",
        status: milestone.status || "planned",
        dueDate: milestone.dueDate,
        statusId: milestone.statusId
      });
      
      // If there's no statusId but there is a status, find the matching status
      if (!milestone.statusId && milestone.status) {
        const matchingStatus = statuses.find(s => 
          s.name.toLowerCase().replace(/ /g, '_') === milestone.status.toLowerCase()
        );
        if (matchingStatus) {
          setFormData(prevData => ({
            ...prevData,
            statusId: matchingStatus.id
          }));
        } else {
          // Add better handling when no matching status is found
          console.warn(`No matching status found for "${milestone.status}"`);
          // Use the first available status as fallback, if any exist
          if (statuses.length > 0) {
            setFormData(prevData => ({
              ...prevData,
              statusId: statuses[0].id,
              status: statuses[0].name.toLowerCase().replace(/ /g, '_') as any
            }));
          }
        }
      }
    }
  }, [milestone, statuses]);
  
  const handleSubmit = (): void => {
    if (!formData.name.trim()) return;
    
    const milestoneData: Partial<ProjectMilestone> = {
      name: formData.name,
      description: formData.description || undefined,
      status: formData.status as any,
      dueDate: formData.dueDate,
      statusId: formData.statusId
    };
    
    // Add validation or transformation for dates if needed
    // For example, ensure dueDate is in the format expected by backend
    
    if (milestone && onUpdate) {
      console.log("Updating milestone:", milestone.id, milestoneData); // Debugging
      onUpdate(milestone.id, milestoneData);
    } else if (onCreate) {
      console.log("Creating milestone:", milestoneData); // Debugging
      onCreate(milestoneData);
    }
  };

  // Helper to parse string date to Date object
  const parseDate = (dateString?: string): Date | undefined => {
    if (!dateString) return undefined;
    try {
      // Add time component to ensure consistent timezone handling
      const date = parseISO(`${dateString}T00:00:00`);
      return startOfDay(date);
    } catch (error) {
      console.error('Error parsing date:', error);
      return undefined;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit Milestone" : "Create New Milestone"}</DialogTitle>
          <DialogDescription>
            {milestone ? "Update the milestone details below." : "Add a new milestone to track progress."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Milestone name"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Milestone description"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select 
                value={formData.statusId || ""} 
                onValueChange={(value) => {
                    const selectedStatus = statuses.find(s => s.id === value);
                    setFormData({
                    ...formData,
                    statusId: value,
                    status: selectedStatus ? selectedStatus.name.toLowerCase().replace(/ /g, '_') as any : formData.status
                    });
                }} 
                disabled={isUpdating}
                >
                <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                    {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                        <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                        </div>
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!formData.dueDate && "text-muted-foreground"}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate ? format(parseDate(formData.dueDate) || new Date(), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={parseDate(formData.dueDate)}
                  onSelect={(date) => 
                    setFormData({
                      ...formData, 
                      dueDate: date ? format(startOfDay(date), "yyyy-MM-dd") : undefined
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.name.trim() || isCreating || isUpdating}
          >
            {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {milestone ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}