import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectMilestone, MilestoneStatus } from '@/types/projects';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface CreateMilestoneDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (milestone: Partial<ProjectMilestone>) => Promise<void>;
  isCreating: boolean;
  statuses: MilestoneStatus[];
}

export function CreateMilestoneDialog({ open, onClose, onCreate, isCreating, statuses }: CreateMilestoneDialogProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [status, setStatus] = useState<string>('planned');
    const [statusId, setStatusId] = useState<string | undefined>();
  
    // Set default status when component mounts
    useEffect(() => {
      const defaultStatus = statuses.find(s => s.is_default);
      if (defaultStatus) {
        setStatusId(defaultStatus.id);
        setStatus(defaultStatus.name.toLowerCase().replace(/ /g, '_'));
      }
    }, [statuses]);
  
    const handleSubmit = async () => {
      if (!title.trim()) {
        alert('Title is required');
        return;
      }
  
      await onCreate({
        name: title,
        description: description.trim() || undefined,
        dueDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        status: status as any, // Using type assertion to bypass type checking
        statusId,
        priority: 0,
      });
      setTitle('');
      setDescription('');
      setSelectedDate(undefined);
      setStatus('planned');
      setStatusId(undefined);
    };
  
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter milestone name"
              disabled={isCreating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter milestone description (optional)"
              rows={3}
              disabled={isCreating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={isCreating}
                >
                  {selectedDate ? (
                    format(selectedDate, "MMM d, yyyy")
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={isCreating}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select 
              value={statusId || ""} 
              onValueChange={(value) => {
                setStatusId(value);
                const selectedStatus = statuses.find(s => s.id === value);
                if (selectedStatus) {
                  setStatus(selectedStatus.name.toLowerCase().replace(/ /g, '_'));
                }
              }} 
              disabled={isCreating}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isCreating || !title.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}