import React, { useState, useEffect } from "react";
import { ProjectService } from "@/services/projectService";
import type { ProjectTask } from "@/types/projects";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  AlertTriangle,
  CheckSquare,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Calendar as LucideCalendar,
  Filter,
  ChevronsUpDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TasksViewProps {
  projectId: string;
  projectService: ProjectService;
}

export function TasksView({ projectId, projectService }: TasksViewProps) {
  const { toast } = useToast();
  const [allTasks, setAllTasks] = useState<ProjectTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentTask, setCurrentTask] = useState<ProjectTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [projectMembers, setProjectMembers] = useState<{ id: string; userName: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [newTask, setNewTask] = useState<Partial<ProjectTask>>({
    name: "",
    description: "",
    status: "todo",
    priority: "medium",
    dueDate: undefined,
    assignedTo: undefined,
    tags: [],
    parentId: undefined,
  });
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  useEffect(() => {
    loadTasks();
    loadProjectMembers();
  }, [projectId]);

  useEffect(() => {
    filterTasks();
  }, [allTasks, statusFilter, assigneeFilter, priorityFilter, dueDateFilter, selectedDate, searchQuery, sortColumn, sortDirection]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasksData = await projectService.getProjectTasks(projectId);
      setAllTasks(tasksData || []);
      setFilteredTasks(tasksData || []);
    } catch (err) {
      setError("Failed to load tasks");
      console.error("Error loading tasks:", err);
      setAllTasks([]);
      setFilteredTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectMembers = async () => {
    try {
      const members = await projectService.getProjectMembers(projectId);
      setProjectMembers(members.map((m) => ({ id: m.userId, userName: m.userName })));
    } catch (err) {
      console.error("Error loading project members:", err);
    }
  };

  const formatDueDate = (dateString: string): string => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day); // Month is 0-based
    return date.toLocaleDateString();
  };

  const formatDateForServer = (date: string | undefined): string | undefined => {
    if (!date) return undefined;
    const [year, month, day] = date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
  };

  const handleAddTask = async () => {
    setIsSaving(true);
    try {
      const taskToCreate = {
        ...newTask,
        status: newTask.status || "todo",
        priority: newTask.priority || "medium",
        dueDate: formatDateForServer(newTask.dueDate),
      };

      await projectService.createTask(projectId, taskToCreate);
      await loadTasks();
      setShowAddDialog(false);
      setNewTask({
        name: "",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: undefined,
        assignedTo: undefined,
        tags: [],
        parentId: undefined,
      });
      toast({ title: "Success", description: "Task created successfully" });
    } catch (err) {
      console.error("Error creating task:", err);
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTask = async () => {
    if (!currentTask) return;

    setIsEditSaving(true);
    try {
      const taskToUpdate = {
        ...currentTask,
        dueDate: formatDateForServer(currentTask.dueDate),
      };
      console.log("Sending task to server:", taskToUpdate); // Debug log before API call
      const response = await projectService.updateTask(currentTask.id, taskToUpdate);
      console.log("Server response after update:", response); // Debug log after API call
      setFilteredTasks((prev) =>
        prev.map((task) =>
          task.id === currentTask.id ? { ...task, ...taskToUpdate } : task
        )
      );
      setShowEditDialog(false);
      toast({ title: "Success", description: "Task updated successfully" });
    } catch (err) {
      console.error("Error updating task:", err);
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    } finally {
      setIsEditSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await projectService.deleteTask(taskId);
      setFilteredTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast({ title: "Success", description: "Task deleted successfully" });
    } catch (err) {
      console.error("Error deleting task:", err);
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } finally {
      setDeleteTaskId(null);
    }
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("none");
    setAssigneeFilter("none");
    setPriorityFilter("none");
    setDueDateFilter("none");
    setSelectedDate(undefined);
  };

  const statusColors: Record<string, string> = {
    todo: "bg-gray-100 text-gray-800 hover:bg-gray-600 hover:text-white transition-colors",
    in_progress: "bg-blue-100 text-blue-800 hover:bg-blue-600 hover:text-white transition-colors",
    in_review: "bg-yellow-100 text-yellow-800 hover:bg-yellow-600 hover:text-white transition-colors",
    done: "bg-green-100 text-green-800 hover:bg-green-600 hover:text-white transition-colors",
    blocked: "bg-red-100 text-red-800 hover:bg-red-600 hover:text-white transition-colors",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-800 hover:bg-gray-600 hover:text-white transition-colors",
    medium: "bg-blue-100 text-blue-800 hover:bg-blue-600 hover:text-white transition-colors",
    high: "bg-orange-100 text-orange-800 hover:bg-orange-600 hover:text-white transition-colors",
    urgent: "bg-red-100 text-red-800 hover:bg-red-600 hover:text-white transition-colors",
  };

  const filterTasks = () => {
    let filtered = [...allTasks];
    console.log("Starting filtering with", filtered.length, "tasks");

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered.sort((a, b) => {
        let aValue = a[sortColumn as keyof ProjectTask];
        let bValue = b[sortColumn as keyof ProjectTask];
        
        // Handle special cases for sorting
        if (sortColumn === 'dueDate') {
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        }
        
        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        const result = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? result : -result;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.name.toLowerCase().includes(query) || 
        task.description?.toLowerCase().includes(query)
      );
      console.log("After search filter:", filtered.length, "tasks remain");
    }

    // Status filter
    if (statusFilter && statusFilter !== "none") {
      filtered = filtered.filter(task => task.status === statusFilter);
      console.log("After status filter:", filtered.length, "tasks remain");
    }

    // Priority filter
    if (priorityFilter && priorityFilter !== "none") {
      filtered = filtered.filter(task => task.priority === priorityFilter);
      console.log("After priority filter:", filtered.length, "tasks remain");
    }

    // Assignee filter
    if (assigneeFilter && assigneeFilter !== "none") {
      filtered = filtered.filter(task => task.assignedTo === assigneeFilter);
      console.log("After assignee filter:", filtered.length, "tasks remain");
    }

    // Due date range filter
    if (dueDateFilter && dueDateFilter !== "none") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(task => {
        if (!task.dueDate) return dueDateFilter === "no_date";
        
        // Parse the YYYY-MM-DD format directly
        const [year, month, day] = task.dueDate.split('-').map(Number);
        const dueDate = new Date(year, month - 1, day);
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
            return !task.dueDate;
          default:
            return true;
        }
      });
      console.log("After due date range filter:", filtered.length, "tasks remain");
    }

    // Specific date filter
    if (selectedDate) {
      console.log("Filtering for specific date:", selectedDate);
      filtered = filtered.filter(task => {
        if (!task.dueDate) {
          console.log("Task has no due date:", task.name);
          return false;
        }
        
        // Parse the YYYY-MM-DD format directly
        const [year, month, day] = task.dueDate.split('-').map(Number);
        const taskDate = new Date(year, month - 1, day);
        
        // Get the selected date components
        const selectedYear = selectedDate.getFullYear();
        const selectedMonth = selectedDate.getMonth();
        const selectedDay = selectedDate.getDate();
        
        // Compare date components directly
        const isMatch = 
          taskDate.getFullYear() === selectedYear &&
          taskDate.getMonth() === selectedMonth &&
          taskDate.getDate() === selectedDay;
        
        console.log(
          "Task:", task.name,
          "Due date:", task.dueDate,
          "Task date components:", year, month, day,
          "Selected date components:", selectedYear, selectedMonth + 1, selectedDay,
          "Match?:", isMatch
        );
        
        return isMatch;
      });
      console.log("After specific date filter:", filtered.length, "tasks remain");
    }

    setFilteredTasks(filtered);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      console.log("Selected date from calendar:", date);
      // Store the date components directly
      const selectedYear = date.getFullYear();
      const selectedMonth = date.getMonth();
      const selectedDay = date.getDate();
      const normalizedDate = new Date(selectedYear, selectedMonth, selectedDay);
      console.log("Setting selected date components:", selectedYear, selectedMonth + 1, selectedDay);
      setSelectedDate(normalizedDate);
      setDueDateFilter("none"); // Clear the due date range when specific date is selected
    } else {
      setSelectedDate(undefined);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null (unsorted)
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-[300px]">
            <Input
              placeholder="Search tasks..."
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
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Filter by priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assignee">Assignee</Label>
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger id="assignee">
                      <SelectValue placeholder="Filter by assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Assignees</SelectItem>
                      {projectMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.userName}
                        </SelectItem>
                      ))}
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
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    clearFilters();
                    setSelectedDate(undefined);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center p-4 text-red-500">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <p>{error}</p>
        </div>
      ) : !filteredTasks || filteredTasks.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-md">
          <CheckSquare className="h-6 w-6 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2 text-sm">
            {allTasks.length === 0 ? "No tasks found for this project." : "No tasks match the current filters."}
          </p>
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {allTasks.length === 0 ? "Create Your First Task" : "Add New Task"}
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center">
                      Task
                      {sortColumn === 'name' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        ) : null
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      {sortColumn === 'status' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        ) : null
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('priority')}>
                    <div className="flex items-center">
                      Priority
                      {sortColumn === 'priority' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        ) : null
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('assigneeName')}>
                    <div className="flex items-center">
                      Assignee
                      {sortColumn === 'assigneeName' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        ) : null
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center">
                      Due Date
                      {sortColumn === 'dueDate' ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        ) : null
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <TableRow>
                      <TableCell>
                        {task.children && task.children.length > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskExpand(task.id)}
                          >
                            {expandedTasks[task.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <span className="w-4 inline-block"></span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.name}</p>
                          {task.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-normal ${
                            statusColors[task.status || "todo"] || "bg-gray-100 text-sm"
                          }`}
                        >
                          {(task.status || "todo")
                            .replace("_", " ")
                            .replace(/^\w/, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`font-normal ${
                            priorityColors[task.priority] || "bg-gray-100 text-sm"
                          }`}
                        >
                          {task.priority.charAt(0).toUpperCase() +
                            task.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.assigneeName || (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <div className="flex items-center">
                            <LucideCalendar className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{formatDueDate(task.dueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No due date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentTask(task);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTaskId(task.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedTasks[task.id] && task.children && (
                      <>
                        {task.children.map((childTask) => (
                          <TableRow key={childTask.id} className="bg-gray-50">
                            <TableCell></TableCell>
                            <TableCell>
                              <div className="ml-4 border-l-2 pl-2">
                                <p className="font-medium">{childTask.name}</p>
                                {childTask.description && (
                                  <p className="text-sm text-gray-500 line-clamp-1">
                                    {childTask.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`font-normal ${
                                  statusColors[childTask.status || "todo"] ||
                                  "bg-gray-100 text-sm"
                                }`}
                              >
                                {(childTask.status || "todo")
                                  .replace("_", " ")
                                  .replace(/^\w/, (c) => c.toUpperCase())}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`font-normal ${
                                  priorityColors[childTask.priority] ||
                                  "bg-gray-100"
                                }`}
                              >
                                {childTask.priority.charAt(0).toUpperCase() +
                                  childTask.priority.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {childTask.assigneeName || (
                                <span className="text-gray-400">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {childTask.dueDate ? (
                                <div className="flex items-center">
                                  <LucideCalendar className="h-4 w-4 mr-1 text-gray-500" />
                                  <span>{formatDueDate(childTask.dueDate)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400">No due date</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentTask(childTask);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTaskId(childTask.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task for this project
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="task-name">Task Name</Label>
              <Input
                id="task-name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                placeholder="Enter task name"
              />
            </div>
            <div>
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Describe the task"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-status">Status</Label>
                <Select
                  value={newTask.status || "todo"}
                  onValueChange={(value: "todo" | "in_progress" | "in_review" | "done" | "blocked") =>
                    setNewTask({ ...newTask, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo" className="hover:bg-gray-100">
                      To Do
                    </SelectItem>
                    <SelectItem value="in_progress" className="hover:bg-gray-100">
                      In Progress
                    </SelectItem>
                    <SelectItem value="in_review" className="hover:bg-gray-100">
                      In Review
                    </SelectItem>
                    <SelectItem value="approved" className="hover:bg-gray-100">
                      Approved
                    </SelectItem>
                    <SelectItem value="done" className="hover:bg-gray-100">
                      Done
                    </SelectItem>
                    <SelectItem value="blocked" className="hover:bg-gray-100">
                      Blocked
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-priority">Priority</Label>
                <Select
                  value={newTask.priority || "medium"}
                  onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                    setNewTask({ ...newTask, priority: value })
                  }
                >
                  <SelectTrigger id="task-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="hover:bg-gray-100">
                      Low
                    </SelectItem>
                    <SelectItem value="medium" className="hover:bg-gray-100">
                      Medium
                    </SelectItem>
                    <SelectItem value="high" className="hover:bg-gray-100">
                      High
                    </SelectItem>
                    <SelectItem value="urgent" className="hover:bg-gray-100">
                      Urgent
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="task-assignee">Assignee</Label>
                <Select
                  value={newTask.assignedTo || ""}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, assignedTo: value || undefined })
                  }
                >
                  <SelectTrigger id="task-assignee">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.userName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="task-duedate">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {newTask.dueDate ? (
                        format(parse(newTask.dueDate, "yyyy-MM-dd", new Date()), "PPP")
                      ) : (
                        <span className="text-muted-foreground">Select a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="top" align="center">
                    <Calendar
                      mode="single"
                      selected={
                        newTask.dueDate
                          ? parse(newTask.dueDate, "yyyy-MM-dd", new Date())
                          : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, "0");
                          const day = String(date.getDate()).padStart(2, "0");
                          const dateString = `${year}-${month}-${day}`;
                          setNewTask({ ...newTask, dueDate: dateString });
                        } else {
                          setNewTask({ ...newTask, dueDate: undefined });
                        }
                      }}
                      initialFocus
                      defaultMonth={
                        newTask.dueDate
                          ? parse(newTask.dueDate, "yyyy-MM-dd", new Date())
                          : new Date()
                      }
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewTask({ ...newTask, dueDate: undefined })}
                        className="text-red-500 hover:text-red-700"
                      >
                        Clear
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="task-parent">Parent Task (Optional)</Label>
              <Select
                value={newTask.parentId || ""}
                onValueChange={(value) =>
                  setNewTask({ ...newTask, parentId: value || undefined })
                }
              >
                <SelectTrigger id="task-parent">
                  <SelectValue placeholder="Select parent task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent (Top Level)</SelectItem>
                  {allTasks
                    .filter((t) => !t.parentId)
                    .map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!newTask.name || newTask.name.trim() === "" || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {currentTask && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-task-name">Task Name</Label>
                <Input
                  id="edit-task-name"
                  value={currentTask.name}
                  onChange={(e) =>
                    setCurrentTask({ ...currentTask, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-task-description">Description</Label>
                <Textarea
                  id="edit-task-description"
                  value={currentTask.description || ""}
                  onChange={(e) =>
                    setCurrentTask({ ...currentTask, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-task-status">Status</Label>
                  <Select
                    value={currentTask.status || "todo"}
                    onValueChange={(
                      value: "todo" | "in_progress" | "in_review" | "approved" | "done" | "blocked"
                    ) => setCurrentTask({ ...currentTask, status: value })}
                  >
                    <SelectTrigger id="task-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo" className="hover:bg-gray-100">
                        To Do
                      </SelectItem>
                      <SelectItem value="in_progress" className="hover:bg-gray-100">
                        In Progress
                      </SelectItem>
                      <SelectItem value="in_review" className="hover:bg-gray-100">
                        In Review
                      </SelectItem>
                      <SelectItem value="approved" className="hover:bg-gray-100">
                        Approved
                      </SelectItem>
                      <SelectItem value="done" className="hover:bg-gray-100">
                        Done
                      </SelectItem>
                      <SelectItem value="blocked" className="hover:bg-gray-100">
                        Blocked
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-task-priority">Priority</Label>
                  <Select
                    value={currentTask.priority || "medium"}
                    onValueChange={(
                      value: "low" | "medium" | "high" | "urgent"
                    ) => setCurrentTask({ ...currentTask, priority: value })}
                  >
                    <SelectTrigger id="task-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="hover:bg-gray-100">
                        Low
                      </SelectItem>
                      <SelectItem value="medium" className="hover:bg-gray-100">
                        Medium
                      </SelectItem>
                      <SelectItem value="high" className="hover:bg-gray-100">
                        High
                      </SelectItem>
                      <SelectItem value="urgent" className="hover:bg-gray-100">
                        Urgent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-assignee">Assignee</Label>
                  <Select
                    value={currentTask.assignedTo || "unassigned"}
                    onValueChange={(value) =>
                      setCurrentTask({
                        ...currentTask,
                        assignedTo: value === "unassigned" ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger id="task-assignee">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.userName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="task-duedate">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        {currentTask.dueDate ? (
                          format(
                            parse(currentTask.dueDate, "yyyy-MM-dd", new Date()),
                            "PPP"
                          )
                        ) : (
                          <span className="text-muted-foreground">
                            Select a date
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" side="top" align="center">
                      <Calendar
                        mode="single"
                        selected={
                          currentTask.dueDate
                            ? parse(currentTask.dueDate, "yyyy-MM-dd", new Date())
                            : undefined
                        }
                        onSelect={(date) => {
                          console.log("Selected date:", date); // Debug log
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(
                              2,
                              "0"
                            );
                            const day = String(date.getDate()).padStart(2, "0");
                            const dateString = `${year}-${month}-${day}`;
                            console.log("Formatted dateString:", dateString); // Debug log
                            setCurrentTask({ ...currentTask, dueDate: dateString });
                          } else {
                            setCurrentTask({ ...currentTask, dueDate: undefined });
                          }
                        }}
                        initialFocus
                        defaultMonth={
                          currentTask.dueDate
                            ? parse(currentTask.dueDate, "yyyy-MM-dd", new Date())
                            : new Date()
                        }
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setCurrentTask({ ...currentTask, dueDate: undefined })
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          Clear
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isEditSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTask}
              disabled={!currentTask?.name || currentTask.name.trim() === "" || isEditSaving}
            >
              {isEditSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Alert Dialog */}
      <AlertDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              and remove it from the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && handleDeleteTask(deleteTaskId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}