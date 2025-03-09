import { useState, useEffect } from 'react';
import { ProjectService } from '@/services/projectService';
import { ProjectMilestone, MilestoneStatus } from '@/types/projects';
import { MilestoneDialog } from '@/components/pages/rdm/projects/milestoneDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Flag, CheckCircle2, Clock, AlertCircle, Loader2, Filter, Edit, Trash2, Settings2, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateMilestoneDialog } from '@/components/pages/rdm/projects/createMilestoneDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTablePagination } from '@/components/pages/rdm/documentManagement/dataTablePagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MilestonesViewProps {
    projectId: string;
    projectService: ProjectService;
  }
  
  // Define a type for the form data
  interface MilestoneFormData {
    name: string;
    description?: string;
    status: string;
    dueDate?: string;
    statusId?: string;
  }

const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Not set';
    try {
      // Parse the date string which is in 'yyyy-MM-dd' format
      const date = parse(dateString, 'yyyy-MM-dd', new Date());
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      // Try an alternative approach using direct Date constructor
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        return format(date, 'MMM d, yyyy');
      } catch (innerError) {
        console.error('Error formatting date:', error, innerError);
        return 'Invalid date';
      }
    }
  };

export function MilestonesView({ projectId, projectService }: MilestonesViewProps) {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [filteredMilestones, setFilteredMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<ProjectMilestone | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [milestoneStatuses, setMilestoneStatuses] = useState<MilestoneStatus[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'list'>('list');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Add table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  // Add new filter state variables
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("none");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dueDateFilter, setDueDateFilter] = useState<string>("none");
  const [formData, setFormData] = useState<MilestoneFormData>({
    name: "",
    description: "",
    status: "planned",
    dueDate: undefined,
    statusId: undefined
  });

  const fetchMilestoneStatuses = async () => {
    try {
      const statuses = await projectService.getMilestoneStatuses(projectId);
      setMilestoneStatuses(statuses);
    } catch (error) {
      console.error("Failed to fetch milestone statuses:", error);
    }
  };

  useEffect(() => {
    loadMilestones();
    fetchMilestoneStatuses();
  }, [projectId]);

  useEffect(() => {
    filterMilestones();
  }, [milestones, searchQuery, statusFilter, dueDateFilter, selectedDate]);

  useEffect(() => {
    if (showCreateDialog || showEditDialog) {
      fetchMilestoneStatuses();
    }
  }, [showCreateDialog, showEditDialog, projectId]);

  const loadMilestones = async () => {
    try {
      setLoading(true);
      const items = await projectService.getProjectMilestones(projectId);
      console.log('Milestone statuses:', items);
      setMilestones(items);
      setError(null);
    } catch (err) {
      setError('Failed to load milestones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMilestone = async (milestone: ProjectMilestone): Promise<void> => {
    try {
      // Set the milestone for editing
      setSelectedMilestone(milestone);
      
      // Find the statusId that corresponds to the milestone's status
      const statusObj = milestoneStatuses.find(s => 
        s.name.toLowerCase().replace(/ /g, '_') === milestone.status.toLowerCase()
      );
      
      console.log("Editing milestone:", milestone);
      console.log("Found status:", statusObj);
      
      // Set up the form data with the current milestone values
      setFormData({
        name: milestone.name,
        description: milestone.description || "",
        status: milestone.status,
        dueDate: milestone.dueDate,
        // Use the found statusId, or the existing one, or undefined
        statusId: statusObj?.id || milestone.statusId
      });
      
      // Open the edit dialog
      setShowEditDialog(true);
    } catch (error) {
      console.error('Error preparing to edit milestone:', error);
      toast({
        title: "Error",
        description: "Failed to prepare milestone for editing",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, milestoneData: Partial<ProjectMilestone>): Promise<void> => {
    setIsUpdating(true);
    try {
      console.log("Updating milestone, ID:", milestoneId, "Data:", milestoneData);
      await projectService.updateMilestone(milestoneId, milestoneData);
      toast({
        title: "Success",
        description: "Milestone updated successfully",
      });
      await loadMilestones();
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast({
        title: "Error",
        description: "Failed to update milestone: " + ((error as Error).message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateMilestone = async (milestone: Partial<ProjectMilestone>) => {
    setIsCreating(true);
    try {
      await projectService.createMilestone({
        ...milestone,
        projectId
      });
      toast({
        title: "Success",
        description: "Milestone created successfully",
      });
      await loadMilestones(); // Refresh the list
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Error creating milestone:', error);
      toast({
        title: "Error",
        description: "Failed to create milestone",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleDeleteMilestone = async (milestoneId: string) => {
    setIsDeleting(true);
    try {
      await projectService.deleteMilestone(milestoneId);
      const updatedMilestones = milestones.filter(m => m.id !== milestoneId);
      setMilestones(updatedMilestones);
      toast({
        title: "Success",
        description: "Milestone deleted successfully",
      });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast({
        title: "Error",
        description: "Failed to delete milestone",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filterMilestones = () => {
    let filtered = [...milestones];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(milestone => 
        milestone.name?.toLowerCase().includes(query) || 
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
        if (!milestone.dueDate) return dueDateFilter === "no_date";
        
        const dueDate = new Date(milestone.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        switch (dueDateFilter) {
          case "overdue":
            return dueDate < today;
          case "today":
            return dueDate.getTime() === today.getTime();
          case "this_week": {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // End of current week (Saturday)
            return dueDate <= endOfWeek; // Include overdue items
          }
          case "next_week": {
            const startOfNextWeek = new Date(today);
            startOfNextWeek.setDate(today.getDate() + (7 - today.getDay())); // Next Sunday
            const endOfNextWeek = new Date(startOfNextWeek);
            endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // Next Saturday
            return dueDate >= startOfNextWeek && dueDate <= endOfNextWeek;
          }
          case "this_month": {
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return dueDate <= endOfMonth; // Include overdue items
          }
          case "no_date":
            return !milestone.dueDate;
          default:
            return true;
        }
      });
    }

    // Specific date filter from calendar
    if (selectedDate) {
      filtered = filtered.filter(milestone => {
        if (!milestone.dueDate) return false;
        
        // Convert both dates to YYYY-MM-DD format for comparison
        const milestoneDate = milestone.dueDate; // Already in YYYY-MM-DD format
        const filterDate = selectedDate.toISOString().split('T')[0];
        
        return milestoneDate === filterDate;
      });
    }

    // Sort by date (earliest first)
    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    setFilteredMilestones(filtered);

    // Update table filters if in list view
    if (viewMode === 'list') {
      if (searchQuery.trim()) {
        table.getColumn('name')?.setFilterValue(searchQuery);
      }
    }
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
        return <Flag className="h-5 w-5 text-gray-500" />;
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    const total = milestones.length;
    if (total === 0) return 0;
    const completed = milestones.filter(m => m.status === 'completed').length;
    return (completed / total) * 100;
  };

  // Add table columns definition and configuration
  const columns: ColumnDef<ProjectMilestone>[] = [
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <div className="flex items-center">
          Status
          <Button
            variant="ghost"
            onClick={() => {
              if (column.getIsSorted() === "asc") {
                column.toggleSorting(true); // Set to desc
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting(); // Clear sorting
              } else {
                column.toggleSorting(false); // Set to asc
              }
            }}
            className="ml-2 h-8 w-8 p-0"
          >
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => {
        const status = row.original.status || "unknown"; // Add default value
        
        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <Badge
              variant={getStatusVariant(status)}
              className="text-xs capitalize"
            >
              {status
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <div className="flex items-center">
          Name
          <Button
            variant="ghost"
            onClick={() => {
              if (column.getIsSorted() === "asc") {
                column.toggleSorting(true); // Set to desc
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting(); // Clear sorting
              } else {
                column.toggleSorting(false); // Set to asc
              }
            }}
            className="ml-2 h-8 w-8 p-0"
          >
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <div className="flex items-center">
          Due Date
          <Button
            variant="ghost"
            onClick={() => {
              if (column.getIsSorted() === "asc") {
                column.toggleSorting(true);
              } else if (column.getIsSorted() === "desc") {
                column.clearSorting();
              } else {
                column.toggleSorting(false);
              }
            }}
            className="ml-2 h-8 w-8 p-0"
          >
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formatDate(row.original.dueDate)}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-[500px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm text-gray-600 truncate cursor-default">
                {row.original.description || ""}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{row.original.description || ""}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEditMilestone(row.original)}
            className="hover:bg-gray-100"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedMilestone(row.original);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Add table configuration
  const table = useReactTable({
    data: filteredMilestones,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
      sorting: [
        {
          id: "dueDate",
          desc: false
        }
      ]
    },
  });

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  const hasNoMilestones = milestones.length === 0;

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
          <div className="flex items-center gap-2">
            {viewMode === 'list' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State - Only show when there are no milestones at all */}
      {hasNoMilestones && (
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

      {!hasNoMilestones && (
        <>
          {/* View Mode Toggle */}
          <div className="flex justify-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="w-32 transition-all duration-300"
            >
              List View
            </Button>
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
                    <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4 px-4 py-3">
                      <CardTitle className="text-lg font-medium flex items-center gap-2 flex-1">
                        {getStatusIcon(milestone.status)}
                        <span className="break-words">{milestone.name}</span>
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
                    <CardContent className="px-4 py-3 pt-0">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Due: {formatDate(milestone.dueDate)}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{milestone.description}</p>
                      )}
                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditMilestone(milestone)}
                            className="hover:bg-gray-100"
                            >
                            <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSelectedMilestone(milestone);
                                setShowDeleteConfirm(true);
                            }}
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : viewMode === 'timeline' ? (
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
                    <CardHeader className="flex flex-row items-start justify-between pb-2 gap-4 px-6 pt-6">
                      <CardTitle className="text-lg font-medium flex items-center gap-2 flex-1">
                        {getStatusIcon(milestone.status)}
                        <span className="break-words">{milestone.name}</span>
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
                    <CardContent className="px-6 py-3 pt-0">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Due: {formatDate(milestone.dueDate)}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mt-2">{milestone.description}</p>
                      )}
                      <div className="flex justify-end gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditMilestone(milestone)}
                          className="hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMilestone(milestone);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="mt-6">
              <TooltipProvider>
                <div className="rounded-md border mb-4">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => {
                            return (
                              <TableHead key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                              </TableHead>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            No milestones found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <DataTablePagination table={table} />
              </TooltipProvider>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
                Are you sure you want to delete the milestone "{selectedMilestone?.name}"? 
                This action cannot be undone.
            </DialogDescription>
            </DialogHeader>
            <DialogFooter>
            <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
            >
                Cancel
            </Button>
            <Button 
                variant="destructive" 
                onClick={() => {
                if (selectedMilestone) {
                    handleDeleteMilestone(selectedMilestone.id);
                }
                }}
                disabled={isDeleting}
            >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
            </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>

      {/* Create Milestone Dialog */}
        <CreateMilestoneDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateMilestone}
        isCreating={isCreating}
        statuses={milestoneStatuses}
        />

        {selectedMilestone && (
        <MilestoneDialog
            open={showEditDialog}
            onClose={() => setShowEditDialog(false)}
            onUpdate={handleUpdateMilestone}
            milestone={selectedMilestone}
            isUpdating={isUpdating}
            statuses={milestoneStatuses}
            formData={formData}
            setFormData={setFormData}
        />
        )}

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