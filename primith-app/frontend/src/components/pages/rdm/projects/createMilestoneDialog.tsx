import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectMilestone } from '@/types/projects';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

type MilestoneStatus = 'planned' | 'in_progress' | 'completed' | 'delayed';

interface CreateMilestoneDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (milestone: Partial<ProjectMilestone>) => Promise<void>;
  isCreating: boolean;
}

export function CreateMilestoneDialog({ open, onClose, onCreate, isCreating }: CreateMilestoneDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<MilestoneStatus>('planned');

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    await onCreate({
      name: title,
      description: description.trim() || undefined,
      dueDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      status,
      priority: 0,
    });
    setTitle('');
    setDescription('');
    setSelectedDate(undefined);
    setStatus('planned');
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
            <Select value={status} onValueChange={(value: MilestoneStatus) => setStatus(value)} disabled={isCreating}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
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