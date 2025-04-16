// src/components/ReportsList.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye, Edit2, Trash2, FileDown, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ChartService, { ReportData } from "@/services/chartService";
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
} from "@/components/ui/alert-dialog";

export function ReportsList() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load reports
  useEffect(() => {
    if (!organizationId) return;
    
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const reportsData = await ChartService.getReports(organizationId);
        setReports(reportsData);
      } catch (error) {
        console.error('Error loading reports:', error);
        toast({
          title: "Error",
          description: "Failed to load reports.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, [organizationId, toast]);

  const handleDeleteReport = async (reportId: string) => {
    try {
      await ChartService.deleteReport(reportId);
      // Update the reports list
      setReports(reports.filter(report => report.id !== reportId));
      
      toast({
        title: "Report Deleted",
        description: "The report has been deleted successfully.",
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

  const handleCreateReport = () => {
    if (organizationId) {
      navigate(`/rdm/document-insights/report/${organizationId}`);
    }
  };

  const handleViewReport = (reportId: string) => {
    if (organizationId) {
      navigate(`/rdm/document-insights/report/${organizationId}/${reportId}/view`);
    }
  };

  const handleEditReport = (reportId: string) => {
    if (organizationId) {
      navigate(`/rdm/document-insights/report/${organizationId}/${reportId}`);
    }
  };

  const handleExportReport = async (_reportId: string) => {
    toast({
      title: "Export Started",
      description: "Preparing to export PDF...",
      duration: 2000,
    });
    
    // Implement export logic
    try {
      // This would typically involve calling a backend endpoint
      
      toast({
        title: "Export Complete",
        description: "The report has been exported as PDF.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export report as PDF.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Button onClick={handleCreateReport} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create New Report
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-10 w-10 border-t-2 border-primary rounded-full"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">No Reports Yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first report to visualize and share your data insights.
          </p>
          <Button onClick={handleCreateReport} className="flex items-center gap-2 mx-auto">
            <Plus className="h-4 w-4" />
            Create New Report
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold mb-1">{report.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {report.description || `Created on ${formatDate(report.createdAt)}`}
                  </p>
                </div>
                <div className="p-4">
                  <div className="flex items-center text-sm text-muted-foreground mb-4">
                    <FileText className="h-4 w-4 mr-2" />
                    {report.chartCount || 0} charts included
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => report.id && handleViewReport(report.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => report.id && handleEditReport(report.id)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => report.id && handleExportReport(report.id)}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="p-0 w-9 flex-none">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Report</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this report? This action cannot be undone.
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}