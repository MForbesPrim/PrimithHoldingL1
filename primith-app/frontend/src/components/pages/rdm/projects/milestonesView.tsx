import { useState, useEffect } from 'react';
import { ProjectService } from '@/services/projectService';
import { RoadmapItem } from '@/types/projects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Flag, ChevronRight, CheckCircle2, Clock, AlertCircle, Loader2, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateMilestoneDialog } from '@/components/pages/rdm/projects/createMilestoneDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface MilestonesViewProps {
  projectId: string;
  projectService: ProjectService;
}

export function MilestonesView({ projectId, projectService }: MilestonesViewProps) {
  const [milestones, setMilestones] = useState<RoadmapItem[]>([]);
  const [filteredMilestones, setFilteredMilestones] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  
  // Add new filter state variables
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("none");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dueDateFilter, setDueDateFilter] = useState<string>("none");

  useEffect(() => {
    loadMilestones();
  }, [projectId]);

  useEffect(() => {
    filterMilestones();
  }, [milestones, searchQuery, statusFilter, dueDateFilter, selectedDate]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      const items = await projectService.getRoadmapItems(projectId);
      setMilestones(items);
      setError(null);
    } catch (err) {
      setError('Failed to load milestones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (newMilestone: Partial<RoadmapItem>) => {
    try {
      const created = await projectService.createRoadmapItem({ ...newMilestone, projectId });
      setMilestones([...milestones, created]);
      setShowCreateDialog(false);
    } catch (err) {
      console.error('Failed to create milestone', err);
    }
  };

  const filterMilestones = () => {
    let filtered = [...milestones];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(milestone => 
        milestone.title.toLowerCase().includes(query) || 
        milestone.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter && statusFilter !== "none") {
      filtered = filtered.filter(milestone => milestone.status === statusFilter);
    }

    // Due date range filter
    if (dueDateFilter && dueDateFilter !== "none") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(milestone => {
        if (!milestone.endDate) return dueDateFilter === "no_date";
        
        const dueDate = new Date(milestone.endDate);
        dueDate.setHours(0, 0, 0, 0);

        switch (dueDateFilter) {
          case "overdue":
            return dueDate < today;
          case "today":
            return dueDate.getTime() === today.getTime();
          case "this_week": {
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
            return dueDate <= endOfWeek && dueDate >= today;
          }
          case "next_week": {
            const startOfNextWeek = new Date(today);
            startOfNextWeek.setDate(today.getDate() + (7 - today.getDay()));
            const endOfNextWeek = new Date(startOfNextWeek);
            endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
            return dueDate >= startOfNextWeek && dueDate <= endOfNextWeek;
          }
          case "this_month": {
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return dueDate <= endOfMonth && dueDate >= today;
          }
          case "no_date":
            return !milestone.endDate;
          default:
            return true;
        }
      });
    }

    // Specific date filter
    if (selectedDate) {
      filtered = filtered.filter(milestone => {
        if (!milestone.endDate) return false;
        
        const dueDate = new Date(milestone.endDate);
        return (
          dueDate.getFullYear() === selectedDate.getFullYear() &&
          dueDate.getMonth() === selectedDate.getMonth() &&
          dueDate.getDate() === selectedDate.getDate()
        );
      });
    }

    // Sort by due date (earliest to latest)
    filtered.sort((a, b) => {
      // Handle cases where one or both milestones don't have due dates
      if (!a.endDate && !b.endDate) return 0;
      if (!a.endDate) return 1; // Move items without due dates to the end
      if (!b.endDate) return -1;

      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    });

    setFilteredMilestones(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("none");
    setDueDateFilter("none");
    setSelectedDate(undefined);
  };

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'delayed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <ChevronRight className="h-5 w-5 text-gray-500" />;
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const total = milestones.length;
    if (total === 0) return 0;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return (completed / total) * 100;
  };

  if (loading) return <div className="p-4"><Loader2 className="mr-2 h-4 w-4 animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div className="space-y-6 p-4">
      {/* Header with Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center p-4 border rounded-lg">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-gray-800">Project Milestones</h2>
          <div className="flex items-center gap-2">
            <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{Math.round(calculateProgress())}% Complete</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[300px]">
              <Input
                placeholder="Search milestones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Statuses</SelectItem>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date Range</Label>
                    <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                      <SelectTrigger id="dueDate">
                        <SelectValue placeholder="Filter by due date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Dates</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="today">Due Today</SelectItem>
                        <SelectItem value="this_week">Due This Week</SelectItem>
                        <SelectItem value="next_week">Due Next Week</SelectItem>
                        <SelectItem value="this_month">Due This Month</SelectItem>
                        <SelectItem value="no_date">No Due Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Specific Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {selectedDate ? (
                            format(selectedDate, "PPP")
                          ) : (
                            <span className="text-muted-foreground">Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)} 
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'outline'}
          onClick={() => setViewMode('grid')}
          className="w-32 transition-all duration-300"
        >
          Grid View
        </Button>
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'outline'}
          onClick={() => setViewMode('timeline')}
          className="w-32 transition-all duration-300"
        >
          Timeline
        </Button>
      </div>

      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="opacity-0 translate-y-4 animate-fade-in-up"
            >
              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 hover:-translate-y-1"
                style={{ borderLeftColor: getStatusColor(milestone.status) }}
              >
                <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4">
                  <CardTitle className="text-lg font-medium flex items-center gap-2 flex-1">
                    {getStatusIcon(milestone.status)}
                    <span className="break-words">{milestone.title}</span>
                  </CardTitle>
                  <Badge
                    variant={getStatusVariant(milestone.status)}
                    className="text-xs capitalize shrink-0"
                  >
                    {milestone.status
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Due: {milestone.endDate
                        ? new Date(milestone.endDate).toLocaleDateString()
                        : 'Not set'}
                    </span>
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{milestone.description}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <div className="relative mt-8 space-y-8 before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-gray-200">
          {filteredMilestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="relative pl-12 opacity-0 -translate-x-4 animate-fade-in-left"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div 
                className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border-2 transition-colors duration-300"
                style={{ borderColor: getStatusColor(milestone.status) }}
              >
                {getStatusIcon(milestone.status)}
              </div>
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-x-1">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">{milestone.title}</CardTitle>
                    <Badge variant={getStatusVariant(milestone.status)}>
                      {milestone.status
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {milestone.endDate ? new Date(milestone.endDate).toLocaleDateString() : 'Not set'}</span>
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-gray-600">{milestone.description}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredMilestones.length === 0 && (
        <div className="text-center p-8 bg-white rounded-lg border border-dashed transition-all duration-300">
          <Flag className="h-6 w-6 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No milestones found</p>
          <p className="text-gray-500 mt-1">Create your first milestone to start tracking progress!</p>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="mt-4 bg-white hover:bg-gray-50 text-gray-700 transition-colors duration-300 border border-gray-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Milestone
          </Button>
        </div>
      )}

      {/* Create Milestone Dialog */}
      <CreateMilestoneDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateMilestone}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-left {
          from {
            opacity: 0;
            transform: translateX(-1rem);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }

        .animate-fade-in-left {
          animation: fade-in-left 0.5s ease-out forwards;
        }
      `}} />
    </div>
  );
}

// Helper function to determine badge variant based on status
function getStatusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'secondary';
    case 'in_progress':
      return 'outline';
    case 'delayed':
      return 'destructive';
    default:
      return 'default';
  }
}

// Helper function to get status color
function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return '#16a34a'; // green-600
    case 'in_progress':
      return '#2563eb'; // blue-600
    case 'delayed':
      return '#dc2626'; // red-600
    default:
      return '#6b7280'; // gray-500
  }
}