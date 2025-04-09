import { useNavigate } from "react-router-dom"
import {
  FileText,
  Folder,
  Users,
  Activity,
  Box,
  Layers2,
  AlertCircle,
  BarChart3,
  Upload,
  BarChart2
} from "lucide-react"
import { useOrganization } from "@/components/pages/rdm/context/organizationContext"
import { useState, useEffect, SetStateAction, useCallback } from "react"
import { ProjectService } from "@/services/projectService"
import { ProjectActivity } from "@/types/projects"
import { PagesService } from "@/services/pagesService"
import { DocumentService } from "@/services/documentService"
import AuthService from "@/services/auth"
import { ExternalRdmHomePage } from "./ExternalRdmHomePage"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function RdmHomePage() {
  const navigate = useNavigate()
  const { selectedOrgId } = useOrganization()
  const [showActivityChart, setShowActivityChart] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOrgWarning, setShowOrgWarning] = useState(false)
  const [recentActivity, setRecentActivity] = useState<ProjectActivity[]>([])
  const [activityData, setActivityData] = useState<{ name: string; activity: number }[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [dayActivities, setDayActivities] = useState<ProjectActivity[]>([])
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [activityPeriod, setActivityPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('week')
  const [allActivities, setAllActivities] = useState<ProjectActivity[]>([])
  
  // New state variables for Quick Stats
  const [documentStats, setDocumentStats] = useState<{ name: string; documents: number }[]>([])
  const [projectStats, setProjectStats] = useState<{ name: string; projects: number }[]>([])
  const [totalDocuments, setTotalDocuments] = useState(0)
  const [activeProjects, setActiveProjects] = useState(0)
  const [teamMembers, setTeamMembers] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [documentInterval, setDocumentInterval] = useState('month') // Options: month, quarter, year
  const [projectInterval, setProjectInterval] = useState('quarter') // Options: month, quarter, year
  const [isExternalUser, setIsExternalUser] = useState(false)

  const projectService = new ProjectService()
  const pagesService = new PagesService()
  const documentService = new DocumentService()

  useEffect(() => {
    const checkMembershipType = async () => {
      try {
        const membershipType = await AuthService.getMembershipType();
        setIsExternalUser(membershipType === true);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to check membership type:", error);
        setIsLoading(false);
      }
    };
    
    checkMembershipType();
  }, []);

  // Move processActivityData inside useCallback to memoize it
  const processActivityData = useCallback((activities: ProjectActivity[]) => {
    const currentDate = new Date()
    let filteredActivities: ProjectActivity[] = []
    let labels: string[] = []
    
    switch (activityPeriod) {
      case 'week':
        // Get start of current week (Sunday)
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        
        filteredActivities = activities.filter(activity => {
          const activityDate = new Date(activity.timestamp)
          return activityDate >= startOfWeek
        })
        
        // Create array of days from Sunday to Saturday
        labels = Array.from({ length: 7 }, (_, i) => {
          const day = new Date(startOfWeek)
          day.setDate(startOfWeek.getDate() + i)
          return day.toLocaleDateString('en-US', { weekday: 'short' })
        })
        break
        
      case 'month':
        // Get activities from current year
        filteredActivities = activities.filter(activity => {
          const activityDate = new Date(activity.timestamp)
          return activityDate.getFullYear() === currentDate.getFullYear()
        })
        
        // Create array of all months
        labels = Array.from({ length: 12 }, (_, i) => {
          const month = new Date(currentDate.getFullYear(), i)
          return month.toLocaleDateString('en-US', { month: 'short' })
        })
        break
        
      case 'quarter':
        // Get activities from current year
        filteredActivities = activities.filter(activity => {
          const activityDate = new Date(activity.timestamp)
          return activityDate.getFullYear() === currentDate.getFullYear()
        })
        
        // Create array of quarters for the year
        labels = ['Q1', 'Q2', 'Q3', 'Q4']
        break
        
      case 'year':
        // Get all activities from the past 5 years
        const startYear = currentDate.getFullYear() - 4 // Show last 5 years
        filteredActivities = activities.filter(activity => {
          const activityDate = new Date(activity.timestamp)
          return activityDate.getFullYear() >= startYear
        })
        
        // Create array of years
        labels = Array.from({ length: 5 }, (_, i) => (startYear + i).toString())
        break
    }

    // Group activities by period label
    const groupedData = labels.map(label => {
      let count = 0
      
      switch (activityPeriod) {
        case 'week':
          count = filteredActivities.filter(activity => {
            const date = new Date(activity.timestamp)
            return date.toLocaleDateString('en-US', { weekday: 'short' }) === label
          }).length
          break
          
        case 'month':
          count = filteredActivities.filter(activity => {
            const date = new Date(activity.timestamp)
            return date.toLocaleDateString('en-US', { month: 'short' }) === label
          }).length
          break
          
        case 'quarter':
          const quarterIndex = labels.indexOf(label)
          count = filteredActivities.filter(activity => {
            const date = new Date(activity.timestamp)
            const activityQuarter = Math.floor(date.getMonth() / 3)
            return activityQuarter === quarterIndex
          }).length
          break
          
        case 'year':
          count = filteredActivities.filter(activity => {
            const date = new Date(activity.timestamp)
            return date.getFullYear().toString() === label
          }).length
          break
      }
      
      return { name: label, activity: count }
    })

    setActivityData(groupedData)
    setRecentActivity(filteredActivities)
  }, [activityPeriod])

  useEffect(() => {
    async function fetchData() {
      if (!selectedOrgId) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch activity data
        const projects = await projectService.getProjects(selectedOrgId)
        
        // Fetch activities for all projects
        const activityPromises = projects.map(project => 
          projectService.getProjectActivity(project.id, 0, 10)
            .catch(error => {
              console.error(`Error fetching activity for project ${project.id}:`, error);
              return { activities: [] };
            })
        )
        const activityResults = await Promise.all(activityPromises)
        
        // Process activity data
        const allActivitiesData = activityResults
          .flatMap(result => result?.activities || [])
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        
        setAllActivities(allActivitiesData)
        processActivityData(allActivitiesData)

        // Process stats data
        const activeProjectsCount = projects.filter(p => p.status === 'active').length
        setActiveProjects(activeProjectsCount)

        // Get unique team members
        const memberPromises = projects.map(project => 
          projectService.getProjectMembers(project.id)
            .catch(error => {
              console.error(`Error fetching members for project ${project.id}:`, error);
              return [];
            })
        )
        const membersResults = await Promise.all(memberPromises)
        const uniqueMembers = new Set(membersResults.flat().map(member => member.userId))
        setTeamMembers(uniqueMembers.size)

        // Fetch all documents from rdm.documents table
        const documents = await documentService.getDocuments(null, selectedOrgId) || [];
        setTotalDocuments(documents.length || 0);
        
        // Get total pages from pages.pages_content table
        const pages = await pagesService.getPages(selectedOrgId) || [];
        setTotalPages(pages.length || 0);

        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load data')
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedOrgId])

  // Effect for documents chart based on selected interval
  useEffect(() => {
    if (!selectedOrgId || isLoading) return
    
    async function updateDocumentStats() {
      try {
        const documents = await documentService.getDocuments(null, selectedOrgId) || [];
        
        let stats: SetStateAction<{ name: string; documents: number }[]> = []
        if (documentInterval === 'month') {
          const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            return d.toLocaleString('default', { month: 'short' })
          }).reverse()
          
          stats = months.map(month => {
            const count = documents.filter(doc => {
              const dateField = doc.createdAt || doc.updatedAt
              const docDate = dateField instanceof Date ? dateField : new Date(dateField)
              return docDate.toLocaleString('default', { month: 'short' }) === month
            }).length
            return { name: month, documents: count }
          })
        } 
        else if (documentInterval === 'quarter') {
          const currentDate = new Date()
          const currentQuarter = Math.floor(currentDate.getMonth() / 3)
          
          stats = Array.from({ length: 4 }, (_, i) => {
            const quarterIndex = (currentQuarter - i + 4) % 4
            const quarterName = `Q${quarterIndex + 1}`
            
            const count = documents.filter(doc => {
              const dateField = doc.createdAt || doc.updatedAt
              const docDate = dateField instanceof Date ? dateField : new Date(dateField)
              const docQuarter = Math.floor(docDate.getMonth() / 3)
              return docQuarter === quarterIndex && docDate.getFullYear() === currentDate.getFullYear()
            }).length
            
            return { name: quarterName, documents: count }
          }).reverse()
        }
        else if (documentInterval === 'year') {
          const currentYear = new Date().getFullYear()
          
          stats = Array.from({ length: 3 }, (_, i) => {
            const year = currentYear - i
            
            const count = documents.filter(doc => {
              const dateField = doc.createdAt || doc.updatedAt
              const docDate = dateField instanceof Date ? dateField : new Date(dateField)
              return docDate.getFullYear() === year
            }).length
            
            return { name: year.toString(), documents: count }
          }).reverse()
        }
        
        setDocumentStats(stats)
      } catch (err) {
        console.error('Error updating document stats:', err)
      }
    }
    
    updateDocumentStats()
  }, [selectedOrgId, documentInterval, isLoading])

  // Effect for projects chart based on selected interval
  useEffect(() => {
    if (!selectedOrgId || isLoading) return
    
    async function updateProjectStats() {
      try {
        const projects = await projectService.getProjects(selectedOrgId)
        
        let stats: SetStateAction<{ name: string; projects: number }[]> = []
        const currentDate = new Date()
        
        if (projectInterval === 'month') {
          const months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            return {
              name: d.toLocaleString('default', { month: 'short' }),
              year: d.getFullYear(),
              month: d.getMonth()
            }
          }).reverse()
          
          stats = months.map(({name, year, month}) => {
            const count = projects.filter(project => {
              if (!project?.createdAt) return false
              const projectDate = new Date(project.createdAt)
              return projectDate.getMonth() === month && projectDate.getFullYear() === year
            }).length
            return { name, projects: count }
          })
        } 
        else if (projectInterval === 'quarter') {
          const currentQuarter = Math.floor(currentDate.getMonth() / 3)
          
          stats = Array.from({ length: 4 }, (_, i) => {
            const quarterIndex = (currentQuarter - i + 4) % 4
            const quarterName = `Q${quarterIndex + 1}`
            
            const count = projects.filter(project => {
              if (!project?.createdAt) return false
              const projectDate = new Date(project.createdAt)
              const projectQuarter = Math.floor(projectDate.getMonth() / 3)
              return projectQuarter === quarterIndex && projectDate.getFullYear() === currentDate.getFullYear()
            }).length
            
            return { name: quarterName, projects: count }
          }).reverse()
        }
        else if (projectInterval === 'year') {
          const currentYear = currentDate.getFullYear()
          
          stats = Array.from({ length: 3 }, (_, i) => {
            const year = currentYear - i
            
            const count = projects.filter(project => {
              if (!project?.createdAt) return false
              const projectDate = new Date(project.createdAt)
              return projectDate.getFullYear() === year
            }).length
            
            return { name: year.toString(), projects: count }
          }).reverse()
        }
        
        setProjectStats(stats)
      } catch (err) {
        console.error('Error updating project stats:', err)
      }
    }
    
    updateProjectStats()
  }, [selectedOrgId, projectInterval, isLoading])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedOrgId === null) {
        setShowOrgWarning(true)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [selectedOrgId])

  // Update the effect for activity period changes
  useEffect(() => {
    if (allActivities.length > 0) {
      processActivityData(allActivities)
    }
  }, [activityPeriod, processActivityData, allActivities])

  const toggleActivityChart = () => {
    setShowActivityChart(!showActivityChart)
  }

  // Helper function to format relative time
  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  // Get the most recent activities by type
  const getRecentActivityByType = (entityType: string, activityType: string, includeFolder = false) => {
    return recentActivity.find(a => {
      if (includeFolder) {
        return a.entityType === entityType && 
               a.activityType === activityType && 
               a.description.toLowerCase().includes('folder')
      }
      return a.entityType === entityType && a.activityType === activityType
    })
  }

  const documentActivity = getRecentActivityByType('artifact', 'create')
  const memberActivity = getRecentActivityByType('member', 'create')
  const folderActivity = getRecentActivityByType('page', 'create', true)

  const quickAccessCards = [
    {
      title: "Projects",
      description: "View and manage your active projects",
      icon: Box,
      route: "/rdm/projects",
    },
    {
      title: "Document Management",
      description: "Access and manage your documents and files",
      icon: Layers2,
      route: "/rdm/document-management",
    },
    {
      title: "Pages",
      description: "Create and edit documentation pages",
      icon: FileText,
      route: "/rdm/pages",
    },
  ]
  
  const handleBarClick = (data: any) => {
    const clickedDay = data.name;
    const activitiesForDay = recentActivity.filter(activity => {
      const date = new Date(activity.timestamp);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      return dayName === clickedDay;
    });
    setSelectedDay(clickedDay);
    setDayActivities(activitiesForDay);
  };

  const renderActivityList = () => {
    if (!showActivityChart && showAllActivities) {
      return (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">All Activity</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowAllActivities(false);
                  setShowActivityChart(true);
                }}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {recentActivity.length} {recentActivity.length === 1 ? 'activity' : 'activities'}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[300px] pr-2 -mr-2">
            {recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className={`rounded-full p-2 ${
                      activity.entityType === 'artifact' ? 'bg-indigo-50 text-indigo-500' :
                      activity.entityType === 'member' ? 'bg-purple-50 text-purple-500' :
                      'bg-blue-50 text-blue-500'
                    }`}>
                      {activity.entityType === 'artifact' ? <Upload className="h-4 w-4" /> :
                       activity.entityType === 'member' ? <Users className="h-4 w-4" /> :
                       <Folder className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{getRelativeTime(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity recorded
              </p>
            )}
          </div>
        </div>
      );
    }

    if (selectedDay) {
      return (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Activities for {selectedDay}</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDay(null)}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
            </span>
          </div>
          <div className="overflow-y-auto max-h-[240px] pr-2 -mr-2">
            {dayActivities.length > 0 ? (
              <div className="space-y-2">
                {dayActivities.map(activity => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className={`rounded-full p-2 ${
                      activity.entityType === 'artifact' ? 'bg-indigo-50 text-indigo-500' :
                      activity.entityType === 'member' ? 'bg-purple-50 text-purple-500' :
                      'bg-blue-50 text-blue-500'
                    }`}>
                      {activity.entityType === 'artifact' ? <Upload className="h-4 w-4" /> :
                       activity.entityType === 'member' ? <Users className="h-4 w-4" /> :
                       <Folder className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{getRelativeTime(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activities recorded for {selectedDay}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        {!showActivityChart && (
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllActivities(true)}
              className="text-sm"
            >
              Show All Activities
            </Button>
          </div>
        )}
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="rounded-full p-2 bg-indigo-50 text-indigo-500">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {documentActivity?.description || "Document uploaded"}
            </p>
            <p className="text-xs text-muted-foreground">
              {documentActivity ? getRelativeTime(documentActivity.timestamp) : "No recent uploads"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="rounded-full p-2 bg-purple-50 text-purple-500">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {memberActivity?.description || "New team member added"}
            </p>
            <p className="text-xs text-muted-foreground">
              {memberActivity ? getRelativeTime(memberActivity.timestamp) : "No recent member additions"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="rounded-full p-2 bg-blue-50 text-blue-500">
            <Folder className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {folderActivity?.description || "New folder created"}
            </p>
            <p className="text-xs text-muted-foreground">
              {folderActivity ? getRelativeTime(folderActivity.timestamp) : "No recent folder creations"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-8 pr-8 pl-6 pt-8 pb-8">
        <div>Loading...</div>
      </div>
    );
  }

  if (isExternalUser) {
    return <ExternalRdmHomePage />;
  }

  return (
    <div className="flex flex-1 flex-col gap-8 pr-8 pl-6 pt-8 pb-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome to Primith RDM</h1>
          {showOrgWarning && !selectedOrgId && (
            <div className="flex items-center gap-2 mt-2 text-yellow-600">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Please select an organization to view organization-specific data</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {quickAccessCards.map((card) => (
          <Card
            key={card.title}
            className={`cursor-pointer group overflow-hidden transition-all duration-300 
              bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-accent
              ${selectedOrgId ? 'hover:translate-y-[-2px] hover:shadow-lg' : 'opacity-50'}`}
            onClick={() => selectedOrgId && navigate(card.route)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg text-slate-800 dark:text-slate-100">{card.title}</CardTitle>
                <div className="rounded-full p-2 text-blue-500 dark:text-blue-400 transition-all group-hover:scale-110">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground dark:text-slate-300">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Overview with shadcn charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleActivityChart}
                  className="rounded-md p-2 text-blue-500 hover:bg-gray-50 hover:text-blue-600"
                  title={showActivityChart ? "Hide chart" : "Show chart"}
                  >
                  <BarChart2 className="h-5 w-5" />
                </Button>
                <div className="rounded-full p-2 text-blue-500">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedOrgId ? (
              <p className="text-sm text-muted-foreground">Select an organization to view recent activity</p>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">Loading activity data...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <div>
                {showActivityChart && (
                  <div className="h-[120px] mb-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-end mb-2">
                      <div className="flex items-center rounded-md border overflow-hidden text-xs">
                        <button 
                          className={`px-2 py-1 ${activityPeriod === 'week' ? 'bg-blue-100 text-blue-700' : 'bg-transparent'}`}
                          onClick={() => {
                            setActivityPeriod('week')
                            setSelectedDay(null)
                          }}
                        >
                          W
                        </button>
                        <button 
                          className={`px-2 py-1 ${activityPeriod === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-transparent'}`}
                          onClick={() => {
                            setActivityPeriod('month')
                            setSelectedDay(null)
                          }}
                        >
                          M
                        </button>
                        <button 
                          className={`px-2 py-1 ${activityPeriod === 'quarter' ? 'bg-blue-100 text-blue-700' : 'bg-transparent'}`}
                          onClick={() => {
                            setActivityPeriod('quarter')
                            setSelectedDay(null)
                          }}
                        >
                          Q
                        </button>
                        <button 
                          className={`px-2 py-1 ${activityPeriod === 'year' ? 'bg-blue-100 text-blue-700' : 'bg-transparent'}`}
                          onClick={() => {
                            setActivityPeriod('year')
                            setSelectedDay(null)
                          }}
                        >
                          Y
                        </button>
                      </div>
                    </div>
                    {activityData.some(data => data.activity > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ChartContainer 
                          config={{
                            activity: {
                              label: "Activities",
                              color: "#6366f1",
                            },
                          } satisfies ChartConfig}
                        >
                          <BarChart data={activityData}>
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 12 }} 
                              axisLine={false}
                              tickLine={false}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar 
                              dataKey="activity" 
                              fill="var(--color-activity)" 
                              radius={[4, 4, 0, 0]}
                              onClick={activityPeriod === 'week' ? handleBarClick : undefined}
                              cursor={activityPeriod === 'week' ? "pointer" : "default"}
                            />
                          </BarChart>
                        </ChartContainer>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">No Activity To Display</p>
                      </div>
                    )}
                  </div>
                )}
                {renderActivityList()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats with Charts */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Quick Stats</CardTitle>
              <div className="rounded-full p-2 text-blue-500">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedOrgId ? (
              <p className="text-sm text-muted-foreground">Select an organization to view statistics</p>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">Loading statistics...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Total Documents</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-md border overflow-hidden text-xs">
                        <button 
                          className={`px-2 py-1 ${documentInterval === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-transparent'}`}
                          onClick={() => setDocumentInterval('month')}
                        >
                          M
                        </button>
                        <button 
                          className={`px-2 py-1 ${documentInterval === 'quarter' ? 'bg-blue-100 text-blue-700' : 'bg-transparent'}`}
                          onClick={() => setDocumentInterval('quarter')}
                        >
                          Q
                        </button>
                        <button 
                          className={`px-2 py-1 ${documentInterval === 'year' ? 'bg-blue-100 text-blue-700' : 'bg-transparent'}`}
                          onClick={() => setDocumentInterval('year')}
                        >
                          Y
                        </button>
                      </div>
                      <span className="text-lg font-bold pl-2">{totalDocuments}</span>
                    </div>
                  </div>
                  <div className="h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={documentStats}>
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="documents" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium">Active Projects</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-md border overflow-hidden text-xs">
                        <button 
                          className={`px-2 py-1 ${projectInterval === 'month' ? 'bg-green-100 text-green-700' : 'bg-transparent'}`}
                          onClick={() => setProjectInterval('month')}
                        >
                          M
                        </button>
                        <button 
                          className={`px-2 py-1 ${projectInterval === 'quarter' ? 'bg-green-100 text-green-700' : 'bg-transparent'}`}
                          onClick={() => setProjectInterval('quarter')}
                        >
                          Q
                        </button>
                        <button 
                          className={`px-2 py-1 ${projectInterval === 'year' ? 'bg-green-100 text-green-700' : 'bg-transparent'}`}
                          onClick={() => setProjectInterval('year')}
                        >
                          Y
                        </button>
                      </div>
                      <span className="text-lg font-bold pl-2">{activeProjects}</span>
                    </div>
                  </div>
                  <div className="h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectStats}>
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 12 }} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="projects" 
                          stroke="#22c55e" 
                          strokeWidth={2}
                          dot={{ fill: "#22c55e", r: 4 }}
/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-4 p-3 rounded-lg bg-slate-50/50">
                    <div className="rounded-full p-2 bg-purple-50 text-purple-500">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Team Members</p>
                      <p className="text-lg font-bold">{teamMembers}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-3 rounded-lg bg-slate-50/50">
                    <div className="rounded-full p-2 bg-amber-50 text-amber-500">
                      <Layers2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Pages</p>
                      <p className="text-lg font-bold">{totalPages}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}