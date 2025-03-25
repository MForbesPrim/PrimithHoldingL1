  import { useState, useEffect } from "react";
  import { useOrganization } from "@/components/pages/rdm/context/organizationContext";
  import { ProjectService } from "@/services/projectService";
  import { Project, ProjectTask, ProjectMilestone, ProjectActivity, ProjectMember } from "@/types/projects";
  import { Button } from "@/components/ui/button";
  import AuthService from '@/services/auth';
  import { 
    Plus, 
    FileText, 
    Users, 
    Calendar, 
    CheckCircle2,
    Activity
  } from "lucide-react";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
  } from "@/components/ui/dialog";
  import { Input } from "@/components/ui/input";
  import { Textarea } from "@/components/ui/textarea";
  import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
  import { useNavigate, useLocation } from "react-router-dom";
  import { Skeleton } from "@/components/ui/skeleton";
  import { formatDistanceToNow, format } from "date-fns";
  import { useProject } from '@/components/pages/rdm/context/projectContext';
  import { Progress } from "@/components/ui/progress";
  import { Avatar, AvatarFallback } from "@/components/ui/avatar";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";

  const PROJECT_UPDATED_EVENT = 'project-list-updated';

  interface DashboardMetrics {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    archivedProjects: number;
    totalTasks: number;
    completedTasks: number;
    upcomingMilestones: number;
    teamMembers: number;
  }

  export function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
    const [newProject, setNewProject] = useState<Partial<Project>>({
      name: "",
      description: "",
      status: "active"
    });
    const [currentView, setCurrentView] = useState<"dashboard" | "card" | "list">("card");
    const [metrics, setMetrics] = useState<DashboardMetrics>({
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      archivedProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      upcomingMilestones: 0,
      teamMembers: 0
    });
    const [canCreateProjects, setCanCreateProjects] = useState(false); 
    const [recentActivities, setRecentActivities] = useState<ProjectActivity[]>([]);
    const [upcomingMilestones, setUpcomingMilestones] = useState<ProjectMilestone[]>([]);
    const [tasks, setTasks] = useState<ProjectTask[]>([]);
    const [_teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
    
    const { selectedOrgId } = useOrganization();
    const { selectedProjectId } = useProject();
    const projectService = new ProjectService();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
      if (selectedOrgId) {
        loadDashboardData();
        checkPermissions();
      }
    }, [selectedOrgId]);

    const checkPermissions = async () => {
      try {
        // Get current user and membership type from AuthService
        const rdmAuth = await AuthService.getRdmTokens();
        const membershipType = await AuthService.getMembershipType();
        
        if (!rdmAuth?.user?.id) {
          setCanCreateProjects(false);
          return;
        }

        let hasPermission = false;
        if (!membershipType) {
          // Fallback if membership type isn't set - allow only super_admin
          hasPermission = true;
        } else if (membershipType === true) { // External user
          // External users can only create projects if they have specific permissions
          hasPermission = false;
        } else { // Internal user
          // Internal users have broader permissions
          hasPermission = true;
        }

        setCanCreateProjects(hasPermission);
        
      } catch (error) {
        console.error("Failed to check project creation permissions:", error);
        setCanCreateProjects(false);
      }
    };

    // Check for updated project from navigation state
    useEffect(() => {
      const updatedProject = location.state?.updatedProject;
      if (updatedProject) {
        setProjects((prev) =>
          prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
        );
        // Clear the navigation state to prevent re-processing
        navigate(location.pathname, { replace: true, state: {} });
      }
    }, [location.state, navigate]);

    async function loadDashboardData() {
      try {
        setLoading(true);
        // First fetch projects
        const fetchedProjects = await projectService.getProjects(selectedOrgId);
        setProjects(fetchedProjects);

        // Then fetch data for each project
        const activitiesPromises = [];
        const milestonesPromises = [];
        const tasksPromises = [];
        const membersPromises = [];

        for (const project of fetchedProjects) {
          activitiesPromises.push(projectService.getProjectActivity(project.id));
          milestonesPromises.push(projectService.getProjectMilestones(project.id));
          tasksPromises.push(projectService.getProjectTasks(project.id));
          membersPromises.push(projectService.getProjectMembers(project.id));
        }

        const [
          activitiesResults,
          milestonesResults,
          tasksResults,
          membersResults
        ] = await Promise.all([
          Promise.all(activitiesPromises),
          Promise.all(milestonesPromises),
          Promise.all(tasksPromises),
          Promise.all(membersPromises)
        ]);

        // Combine all activities from different projects
        const allActivities = activitiesResults.flatMap(result => result.activities || []);
        setRecentActivities(allActivities
          .map(activity => ({
            ...activity,
            formattedTime: new Date(activity.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }),
            formattedDate: new Date(activity.createdAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );

        // Combine all milestones from different projects
        const allMilestones = milestonesResults.flat().filter(m => m !== null && m !== undefined);
        setUpcomingMilestones(allMilestones
          .filter(m => m.dueDate && new Date(m.dueDate) > new Date())
          .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return dateA - dateB;
          }));

        // Combine all tasks from different projects
        const allTasks = tasksResults.flat().filter(t => t !== null && t !== undefined);
        setTasks(allTasks);

        // Combine all members from different projects (removing duplicates)
        const uniqueMembers = new Map();
        membersResults.flat().forEach(member => {
          uniqueMembers.set(member.userId, member);
        });
        setTeamMembers(Array.from(uniqueMembers.values()));

        // Calculate metrics
        const metrics: DashboardMetrics = {
          totalProjects: fetchedProjects.length,
          activeProjects: fetchedProjects.filter((p: Project) => p.status === 'active').length,
          completedProjects: fetchedProjects.filter((p: Project) => p.status === 'completed').length,
          archivedProjects: fetchedProjects.filter((p: Project) => p.status === 'archived').length,
          totalTasks: allTasks.length,
          completedTasks: allTasks.filter((t: ProjectTask) => t.status === 'done').length,
          upcomingMilestones: allMilestones.filter((m: ProjectMilestone) => m.dueDate && new Date(m.dueDate) > new Date()).length,
          teamMembers: uniqueMembers.size
        };
        setMetrics(metrics);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    const renderMetricsCards = () => {
      const cards = [
        {
          title: "Total Projects",
          value: metrics.totalProjects,
          icon: <FileText className="h-4 w-4 text-blue-500" />,
          description: `${metrics.activeProjects} active`
        },
        {
          title: "Tasks",
          value: metrics.totalTasks,
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          description: `${metrics.completedTasks} completed`
        },
        {
          title: "Upcoming Milestones",
          value: metrics.upcomingMilestones,
          icon: <Calendar className="h-4 w-4 text-purple-500" />,
          description: "Next 30 days"
        },
        {
          title: "Team Members",
          value: metrics.teamMembers,
          icon: <Users className="h-4 w-4 text-orange-500" />,
          description: "Active members"
        }
      ];

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    };

    const renderProjectProgress = () => {
      const statusData = [
        { name: 'Active', value: metrics.activeProjects, colorClass: 'bg-emerald-500' },
        { name: 'Completed', value: metrics.completedProjects, colorClass: 'bg-blue-500' },
        { name: 'Archived', value: metrics.archivedProjects, colorClass: 'bg-gray-500' }
      ];

      const total = statusData.reduce((sum, item) => sum + item.value, 0);

      return (
        <Card className="col-span-1 row-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusData.map((status, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{status.name}</span>
                    <span className="text-muted-foreground">{status.value} ({total > 0 ? Math.round((status.value / total) * 100) : 0}%)</span>
                  </div>
                  <Progress 
                    value={(status.value / total) * 100} 
                    className={`h-2 [&>[role=progressbar]]:${status.colorClass}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    };

    const renderRecentActivity = () => (
      <Card className="col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <Avatar className="h-8 w-8 bg-primary/10">
                    <AvatarFallback className="bg-primary/10">{activity.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{activity.userName}</p>
                      <span className="text-xs text-muted-foreground">{activity.formattedTime}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.formattedDate}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Activity className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );

    const renderUpcomingMilestones = () => (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMilestones.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingMilestones.slice(0, 5).map((milestone) => (
                  <TableRow key={milestone.id}>
                    <TableCell className="font-medium">{milestone.name}</TableCell>
                    <TableCell>{milestone.dueDate ? format(new Date(milestone.dueDate), 'MMM dd, yyyy') : 'No date'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {formatStatus(milestone.status)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No upcoming milestones</p>
            </div>
          )}
        </CardContent>
      </Card>
    );

    const formatStatus = (status: string) => {
      return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const renderTaskProgress = () => {
      const taskStatusData = [
        { name: 'To Do', value: tasks.filter(t => t?.status === 'todo').length, color: '#FDA4AF', status: 'todo' },
        { name: 'In Progress', value: tasks.filter(t => t?.status === 'in_progress').length, color: '#60A5FA', status: 'in_progress' },
        { name: 'In Review', value: tasks.filter(t => t?.status === 'in_review').length, color: '#C084FC', status: 'in_review' },
        { name: 'Done', value: tasks.filter(t => t?.status === 'done').length, color: '#10B981', status: 'done' }
      ].map(item => ({
        ...item,
        name: formatStatus(item.status)
      }));

      const total = taskStatusData.reduce((sum, item) => sum + item.value, 0);

      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Task Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-4">
                {taskStatusData.map((status, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{status.name}</span>
                      <span className="text-gray-500">{status.value} ({total > 0 ? Math.round((status.value / total) * 100) : 0}%)</span>
                    </div>
                    <Progress 
                      value={(status.value / total) * 100} 
                      className={`h-2 [&>[role=progressbar]]:bg-[${status.color}]`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No tasks created yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    };

    const renderDashboard = () => (
      <div className="space-y-6">
        {renderMetricsCards()}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderProjectProgress()}
          {renderRecentActivity()}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderTaskProgress()}
          {renderUpcomingMilestones()}
        </div>
      </div>
    );

    function getStatusBadgeStyles(status: string) {
      switch (status.toLowerCase()) {
        case 'active':
          return 'bg-green-100 text-green-800'
        case 'completed':
          return 'bg-blue-100 text-blue-800'
        case 'archived':
          return 'bg-gray-100 text-gray-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    async function handleCreateProject() {
      if (!selectedOrgId || !newProject.name) return;
      
      try {
        const createdProject = await projectService.createProject({
          ...newProject,
          organizationId: selectedOrgId
        });
        setProjects((prev) => Array.isArray(prev) ? [...prev, createdProject] : [createdProject]);
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent(PROJECT_UPDATED_EVENT));
        
        setShowNewProjectDialog(false);
        setNewProject({
          name: "",
          description: "",
          status: "active"
        });
      } catch (error) {
        console.error("Failed to create project:", error);
      }
    }

    function handleProjectClick(projectId: string) {
      navigate(`/rdm/projects/${projectId}`);
    }

    const filteredProjects = selectedProjectId 
      ? projects.filter(project => project.id === selectedProjectId)
      : projects;

    return (
      <div className="h-full overflow-y-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          {canCreateProjects && (
          <Button onClick={() => setShowNewProjectDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        )}
        </div>
        
        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "card" | "dashboard" | "list")} className="mb-6">
          <TabsList>
            <TabsTrigger value="card">Card View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[250px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[200px]" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : currentView === "dashboard" ? (
          renderDashboard()
        ) : currentView === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects?.map((project) => (
              <Card 
                key={project.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyles(project.status)}`}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {project.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter className="text-xs text-gray-500">
                  Created {formatDistanceToNow(new Date(project.createdAt))} ago
                </CardFooter>
              </Card>
            ))}
            {(filteredProjects ?? []).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
                <FileText className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects yet</h3>
                <p className="text-gray-500 mb-4">
                  Create your first project to start organizing your work
                </p>
                <Button onClick={() => setShowNewProjectDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects?.map((project) => (
                  <tr 
                    key={project.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <td className="px-4 py-3 text-sm">{project.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(filteredProjects ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <p className="text-gray-500">No projects found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Enter the details for your new project.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium mb-1 block">
                  Project Name
                </label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label htmlFor="description" className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={newProject.description || ""}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProject.name}>
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }