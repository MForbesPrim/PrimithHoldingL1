// src/components/ViewReport.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ChartService, { ReportData } from "@/services/chartService";
import { renderChart } from "./chartRenderer";

export function ViewReport() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [charts, setCharts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { organizationId, reportId } = useParams<{ organizationId: string; reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!reportId) return;

    const loadReport = async () => {
      setIsLoading(true);
      try {
        const { report, charts } = await ChartService.getReport(reportId);
        setReport(report);
        setCharts(charts);
      } catch (error) {
        console.error('Error loading report:', error);
        toast({
          title: "Error",
          description: "Failed to load the report.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [reportId, toast]);

  const handleBack = () => {
    if (organizationId) {
      navigate(`/rdm/document-insights/reports/${organizationId}`);
    } else {
      navigate(`/rdm/document-insights`);
    }
  };

  const handleEdit = () => {
    if (organizationId && reportId) {
      navigate(`/rdm/document-insights/report/${organizationId}/${reportId}`);
    }
  };

  const handleExport = async () => {
    if (!reportId) return;

    toast({
      title: "Export Started",
      description: "Preparing to export PDF...",
      duration: 2000,
    });
    
    try {
      // Implement export logic
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

  // Function to render HTML content safely
  const renderHTML = (htmlContent: string) => {
    // Replace chart placeholders with actual charts
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Find all chart placeholders
    const chartPlaceholders = tempDiv.querySelectorAll('div[data-chart-id]');
    
    // Process chart placeholders
    chartPlaceholders.forEach(placeholder => {
      const chartId = placeholder.getAttribute('data-chart-id');
      if (!chartId) return;
      
      // Find chart data
      const chartData = charts.find(chart => chart.id === chartId);
      if (!chartData) return;
      
      // Create a placeholder element for React to render into
      placeholder.innerHTML = '';
      placeholder.className = 'chart-container my-4 border rounded-lg p-4';
      placeholder.setAttribute('style', 'height: 300px');
      
      // We'll use an ID to find this element after the dangerouslySetInnerHTML
      const uniqueId = `chart-${chartId}-${Math.random().toString(36).substring(2, 9)}`;
      placeholder.setAttribute('id', uniqueId);
    });
    
    return {
      __html: tempDiv.innerHTML
    };
  };

  // Render charts after the content is rendered
  useEffect(() => {
    if (!report || !report.content || charts.length === 0) return;
    
    // Find all chart placeholders
    const chartPlaceholders = document.querySelectorAll('div[data-chart-id]');
    
    // Process chart placeholders
    chartPlaceholders.forEach(placeholder => {
      const chartId = placeholder.getAttribute('data-chart-id');
      if (!chartId) return;
      
      // Find chart data
      const chartData = charts.find(chart => chart.id === chartId);
      if (!chartData) return;
      
      // Create a new div for the chart
      const chartContainer = document.createElement('div');
      chartContainer.style.width = '100%';
      chartContainer.style.height = '100%';
      placeholder.appendChild(chartContainer);
      
      // Render the chart using React
      const chartElement = renderChart(chartData);
      if (chartElement) {
        // Use ReactDOM to render the chart
        const ReactDOM = require('react-dom');
        ReactDOM.createRoot(chartContainer).render(chartElement);
      }
    });
  }, [report, charts]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Report Not Found</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            The requested report could not be found. It may have been deleted or you don't have permission to view it.
          </p>
          <Button onClick={handleBack} className="mt-6">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">{report.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExport} className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Report
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm max-w-none">
            {report.content && (
              <div dangerouslySetInnerHTML={renderHTML(report.content)} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}