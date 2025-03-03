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
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentTask, setCurrentTask] = useState<ProjectTask | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
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

  useEffect(() => {
    loadTasks();
    loadProjectMembers();
  }, [projectId, statusFilter, assigneeFilter]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: { status?: string; assignedTo?: string } = {};
      if (statusFilter) filters.status = statusFilter;
      if (assigneeFilter) filters.assignedTo = assigneeFilter;

      const tasksData = await projectService.getProjectTasks(projectId, filters);
      console.log("Tasks data received from server:", tasksData); // Log server response
      setTasks(tasksData || []);
    } catch (err) {
      setError("Failed to load tasks");
      console.error("Error loading tasks:", err);
      setTasks([]);
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
      setTasks((prev) =>
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
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
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

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
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

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {projectMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.userName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      ) : !tasks || tasks.length === 0 ? (
        <div className="text-center p-8 border border-dashed rounded-md">
          <CheckSquare className="h-6 w-6 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2 text-sm">No tasks found for this project.</p>
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Task
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
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
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
                          className={
                            statusColors[task.status || "todo"] || "bg-gray-100"
                          }
                        >
                          {(task.status || "todo")
                            .replace("_", " ")
                            .replace(/^\w/, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            priorityColors[task.priority] || "bg-gray-100"
                          }
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
                                className={
                                  statusColors[childTask.status || "todo"] ||
                                  "bg-gray-100"
                                }
                              >
                                {(childTask.status || "todo")
                                  .replace("_", " ")
                                  .replace(/^\w/, (c) => c.toUpperCase())}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  priorityColors[childTask.priority] ||
                                  "bg-gray-100"
                                }
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
                    <SelectItem value="">Unassigned</SelectItem>
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
                  {tasks
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
                      <SelectItem value="unassigned">Unassigned</SelectItem>
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