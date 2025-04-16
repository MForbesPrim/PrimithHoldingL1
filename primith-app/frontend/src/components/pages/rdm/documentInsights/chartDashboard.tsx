import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, Plus, FileText, Pencil, Trash2, Edit2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Charting } from "./charting";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChartService, { ChartData, ReportData } from "@/services/chartService";
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";

interface ChartItem {
  id: string;
  name: string;
  isOpen: boolean;
  isEditing: boolean;
  savedChartData?: ChartData & { savedAt: string };
  originalSavedAt?: string;
}

export function ChartDashboard() {
  const navigate = useNavigate();
  const { selectedOrgId } = useOrganization();
  const [charts, setCharts] = useState<ChartItem[]>([
    { id: '1', name: 'New Chart', isOpen: true, isEditing: false }
  ]);
  const [savedCharts, setSavedCharts] = useState<(ChartData & { savedAt: string })[]>([]);
  const [savedReports, setSavedReports] = useState<ReportData[]>([]);
  const [activeTab, setActiveTab] = useState("create-chart");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Load saved charts when organization changes
  useEffect(() => {
    if (selectedOrgId) {
      if (activeTab === "saved-charts") {
        loadSavedCharts();
      } else if (activeTab === "saved-reports") {
        loadSavedReports();
      }
    }
  }, [selectedOrgId, activeTab]);

  const loadSavedReports = async () => {
    if (!selectedOrgId) {
      console.log('Cannot load reports: No organization ID available');
      setSavedReports([]);
      return;
    }
  
    setIsLoading(true);
    try {
      const reports = await ChartService.getReports(selectedOrgId);
      // Ensure we handle null/undefined response
      setSavedReports(reports || []);
    } catch (error) {
      console.error('Error loading saved reports:', error);
      setSavedReports([]);
      toast({
        title: "Error",
        description: "Failed to load saved reports.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedCharts = async () => {
    if (!selectedOrgId) {
      console.log('Cannot load charts: No organization ID available');
      setSavedCharts([]);
      return;
    }
  
    console.log(`Loading saved charts for organization: ${selectedOrgId}`);
    setIsLoading(true);
    try {
      const charts = await ChartService.getCharts(selectedOrgId);
      console.log('Fetched charts:', charts);
  
      // Ensure we handle null/undefined response
      if (!charts) {
        console.log('No charts returned from API');
        setSavedCharts([]);
        return;
      }
  
      // Ensure all date fields are strings
      const chartsWithStringDates = charts.map(chart => ({
        ...chart,
        createdAt: chart.createdAt?.toString() || new Date().toISOString(),
        updatedAt: chart.updatedAt?.toString() || new Date().toISOString(),
        savedAt: chart.savedAt || new Date().toISOString()
      }));
  
      setSavedCharts(chartsWithStringDates);
    } catch (error) {
      console.error('Error loading saved charts:', error);
      setSavedCharts([]);
      toast({
        title: "Error",
        description: "Failed to load saved charts.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Event listener for chart updates
  useEffect(() => {
    const handleChartUpdate = (e: CustomEvent<{ savedAt: string; updatedChart: ChartData & { savedAt: string } }>) => {
      const { savedAt, updatedChart } = e.detail;

      // Update savedCharts state
      setSavedCharts(current =>
        current.map(chart => chart.savedAt === savedAt ? updatedChart : chart)
      );

      // Update charts state (for currently open charts)
      setCharts(current =>
        current.map(chart => {
          if (chart.originalSavedAt === savedAt) {
            return {
              ...chart,
              name: updatedChart.name,
              savedChartData: updatedChart
            };
          }
          return chart;
        })
      );
    };

    // Set up event listeners
    window.addEventListener('chartUpdated', handleChartUpdate as EventListener);

    return () => {
      window.removeEventListener('chartUpdated', handleChartUpdate as EventListener);
    };
  }, []);

  const handleBack = () => {
    navigate("/rdm/document-insights");
  };

  const handleAddChart = () => {
    const newChart = {
      id: `chart-${Date.now()}`,
      name: `New Chart`,
      isOpen: true,
      isEditing: false
    };
    // Close all existing charts and add the new one
    setCharts([...charts.map(chart => ({ ...chart, isOpen: false })), newChart]);
    // Switch to create-chart tab
    setActiveTab("create-chart");
  };

  const handleRemoveChart = (chartId: string) => {
    setCharts(charts.filter(chart => chart.id !== chartId));
    toast({
      title: "Chart Removed",
      description: "The chart has been removed from the dashboard.",
      duration: 2000,
    });
  };

  const toggleChart = (chartId: string) => {
    setCharts(charts.map(chart =>
      chart.id === chartId ? { ...chart, isOpen: !chart.isOpen } : chart
    ));
  };

  const handleEditName = (chartId: string) => {
    setCharts(charts.map(chart =>
      chart.id === chartId ? { ...chart, isEditing: true } : chart
    ));
  };

  const handleNameChange = (chartId: string, newName: string) => {
    setCharts(charts.map(chart =>
      chart.id === chartId ? { ...chart, name: newName, isEditing: false } : chart
    ));
  };

  const handleNameKeyDown = (e: React.KeyboardEvent, chartId: string, newName: string) => {
    if (e.key === 'Enter') {
      handleNameChange(chartId, newName);
    }
  };

  const handleCreateReport = () => {
    navigate("/rdm/document-insights/report");
  };

  const handleDeleteChart = async (chartId: string) => {
    if (!chartId) return;

    try {
      await ChartService.deleteChart(chartId);
      await loadSavedCharts(); // Reload charts after deletion

      toast({
        title: "Chart Deleted",
        description: "The chart has been removed from saved charts.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting chart:', error);
      toast({
        title: "Error",
        description: "Failed to delete chart.",
        variant: "destructive",
      });
    }
  };

  const handleEditSavedChart = (chart: ChartData & { savedAt: string }) => {
    if (!chart.savedAt) return;

    // Check if this chart is already open
    const existingChartIndex = charts.findIndex(c => c.originalSavedAt === chart.savedAt);

    if (existingChartIndex !== -1) {
      // Chart is already open, just focus it and close others
      setCharts(charts.map((c, index) => ({
        ...c,
        isOpen: index === existingChartIndex
      })));
    } else {
      // Create a new chart instance with the saved chart data
      const newChart = {
        id: `chart-${Date.now()}`,
        name: chart.name,
        isOpen: true,
        isEditing: false,
        savedChartData: chart,
        originalSavedAt: chart.savedAt
      };
      // Close all existing charts and add the new one
      setCharts([...charts.map(c => ({ ...c, isOpen: false })), newChart]);
    }

    // Switch to the create-chart tab
    setActiveTab("create-chart");
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!reportId) return;

    try {
      await ChartService.deleteReport(reportId);
      await loadSavedReports();

      toast({
        title: "Report Deleted",
        description: "The report has been removed from saved reports.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report.",
        variant: "destructive",
      });
    }
  };

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

        <Tabs
            value={activeTab}
            onValueChange={(value) => {
                setActiveTab(value);
            }}
            className="w-full"
            >
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
                            Are you sure you want to proceed? Any unsaved changes will be lost.
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
                  <Charting
                    chartName={chart.name}
                    savedChartData={chart.savedChartData}
                    originalSavedAt={chart.originalSavedAt}
                    organizationId={selectedOrgId}
                    onSave={loadSavedCharts}
                  />
                </CollapsibleContent>
              </Collapsible>
            ))}
          </TabsContent>
          <TabsContent value="saved-charts">
            {isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="animate-spin h-10 w-10 border-t-2 border-primary rounded-full"></div>
              </div>
            ) : savedCharts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No saved charts yet. Create and save a chart to see it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCharts.map((chart) => (
                  <Card key={chart.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{chart.name}</h3>
                            <p className="text-sm text-muted-foreground">{chart.chartType} Chart</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl h-[600px]">
                                <DialogHeader>
                                  <DialogTitle>{chart.name}</DialogTitle>
                                  <DialogDescription>
                                    {chart.chartType} Chart
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex-1 min-h-[450px]">
                                  <Charting
                                    chartName={chart.name}
                                    savedChartData={chart}
                                    viewOnly={true}
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSavedChart(chart)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
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
                                    Are you sure you want to permanently delete this chart?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => chart.id && handleDeleteChart(chart.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {chart.createdAt && `Saved on ${formatDate(chart.createdAt)}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="saved-reports">
            {isLoading ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="animate-spin h-10 w-10 border-t-2 border-primary rounded-full"></div>
              </div>
            ) : savedReports.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No saved reports yet. Click 'Create Report' to make a new report.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedReports.map((report) => (
                  <Card key={report.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{report.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {report.chartCount || 0} Charts
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/rdm/document-insights/report/${report.id}`)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/rdm/document-insights/report/${report.id}/edit`)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
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
                                  <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to permanently delete this report?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => report.id && handleDeleteReport(report.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {report.createdAt && `Created on ${formatDate(report.createdAt.toString())}`}
                        </p>
                        {report.description && (
                          <p className="text-sm mt-2">{report.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
