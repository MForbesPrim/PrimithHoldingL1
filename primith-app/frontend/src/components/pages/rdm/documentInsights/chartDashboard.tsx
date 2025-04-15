import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronDown, Plus, FileText, Pencil, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Charting } from "./charting"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface ChartItem {
  id: string;
  name: string;
  isOpen: boolean;
  isEditing: boolean;
}

interface SavedChart {
  name: string;
  chartType: string;
  chartData: any[];
  chartStyles: any;
  columns: any[];
  groupByConfig: any;
  savedAt: string;
}

export function ChartDashboard() {
  const navigate = useNavigate()
  const [charts, setCharts] = useState<ChartItem[]>([
    { id: '1', name: 'New Chart', isOpen: true, isEditing: false }
  ])
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([])
  const { toast } = useToast()

  // Load saved charts initially and set up localStorage event listener
  useEffect(() => {
    const loadSavedCharts = () => {
      const storedCharts = localStorage.getItem('savedCharts')
      if (storedCharts) {
        try {
          setSavedCharts(JSON.parse(storedCharts))
        } catch (error) {
          console.error('Error loading saved charts:', error)
          toast({
            title: "Error",
            description: "Failed to load saved charts.",
            variant: "destructive",
          })
        }
      }
    }

    // Load initial data
    loadSavedCharts()

    // Set up storage event listener for cross-tab updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'savedCharts') {
        loadSavedCharts()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Custom event for same-tab updates
    const handleCustomEvent = () => loadSavedCharts()
    window.addEventListener('savedChartsUpdated', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('savedChartsUpdated', handleCustomEvent)
    }
  }, [])

  const handleBack = () => {
    navigate("/rdm/document-insights")
  }

  const handleAddChart = () => {
    const newChart = {
      id: `chart-${Date.now()}`,
      name: `New Chart`,
      isOpen: true,
      isEditing: false
    }
    // Close all existing charts and add the new one
    setCharts([...charts.map(chart => ({ ...chart, isOpen: false })), newChart])
  }

  const handleRemoveChart = (chartId: string) => {
    setCharts(charts.filter(chart => chart.id !== chartId))
    toast({
      title: "Chart Removed",
      description: "The chart has been removed from the dashboard.",
      duration: 2000,
    })
  }

  const toggleChart = (chartId: string) => {
    setCharts(charts.map(chart => 
      chart.id === chartId ? { ...chart, isOpen: !chart.isOpen } : chart
    ))
  }

  const handleEditName = (chartId: string) => {
    setCharts(charts.map(chart =>
      chart.id === chartId ? { ...chart, isEditing: true } : chart
    ))
  }

  const handleNameChange = (chartId: string, newName: string) => {
    setCharts(charts.map(chart =>
      chart.id === chartId ? { ...chart, name: newName, isEditing: false } : chart
    ))
  }

  const handleNameKeyDown = (e: React.KeyboardEvent, chartId: string, newName: string) => {
    if (e.key === 'Enter') {
      handleNameChange(chartId, newName)
    }
  }

  const handleCreateReport = () => {
    navigate("/rdm/document-insights/report")
  }

  const handleDeleteChart = (index: number) => {
    const updatedCharts = [...savedCharts]
    updatedCharts.splice(index, 1)
    localStorage.setItem('savedCharts', JSON.stringify(updatedCharts))
    setSavedCharts(updatedCharts)
    
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('savedChartsUpdated'))
    
    toast({
      title: "Chart Deleted",
      description: "The chart has been removed from saved charts.",
      duration: 2000,
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container mx-auto py-6 pr-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Data Visualization</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddChart} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Chart
            </Button>
            <Button onClick={handleCreateReport} variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Create Report
            </Button>
          </div>
        </div>

        <Tabs defaultValue="create-chart" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create-chart">Create Chart</TabsTrigger>
            <TabsTrigger value="saved-charts">Saved Charts</TabsTrigger>
            <TabsTrigger value="saved-reports">Saved Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="create-chart" className="space-y-4">
            {charts.map((chart) => (
              <Collapsible
                key={chart.id}
                open={chart.isOpen}
                onOpenChange={() => toggleChart(chart.id)}
              >
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    {chart.isEditing ? (
                      <Input
                        autoFocus
                        defaultValue={chart.name}
                        className="h-8 w-[200px]"
                        onBlur={(e) => handleNameChange(chart.id, e.target.value)}
                        onKeyDown={(e) => handleNameKeyDown(e, chart.id, (e.target as HTMLInputElement).value)}
                      />
                    ) : (
                      <>
                        <h2 className="text-xl font-semibold">{chart.name}</h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditName(chart.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chart</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this chart? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRemoveChart(chart.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-9 p-0">
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                          chart.isOpen ? "transform rotate-180" : ""
                        }`}/>
                        <span className="sr-only">Toggle chart</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                
                <CollapsibleContent className="mt-1">
                  <Charting chartName={chart.name} />
                </CollapsibleContent>
              </Collapsible>
            ))}
          </TabsContent>
          <TabsContent value="saved-charts">
            {savedCharts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No saved charts yet. Create and save a chart to see it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCharts.map((chart, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{chart.name}</h3>
                            <p className="text-sm text-muted-foreground">{chart.chartType} Chart</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteChart(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Saved on {formatDate(chart.savedAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="saved-reports">
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Saved reports feature coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 