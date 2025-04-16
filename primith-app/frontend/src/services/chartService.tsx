// src/services/chartService.ts
import AuthService from './auth';

export interface ChartData {
    id?: string;
    name: string;
    description?: string;
    chartType: string;
    chartData: any[];
    chartStyles: any;
    columns: any[];
    groupByConfig?: any;
    documentId?: string;
    folderId?: string;
    projectId?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    savedAt?: string;
  }
  
  export interface ReportData {
    id?: string;
    name: string;
    description?: string;
    content: string;
    reportData?: any;
    documentId?: string;
    folderId?: string;
    projectId?: string;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
    chartCount?: number;
  }
  
  export interface ReportChartData {
    chartId: string;
    position: number;
  }
  
  class ChartService {
    private baseUrl = import.meta.env.VITE_API_URL;
    
    private async getAuthHeader() {
      let rdmAuth = AuthService.getRdmTokens();
      
      if (!rdmAuth?.tokens) {
        const refreshed = await AuthService.refreshRdmAccessToken();
        if (!refreshed) {
          throw new Error('No RDM authentication tokens available');
        }
        rdmAuth = AuthService.getRdmTokens();
        if (!rdmAuth) {
          throw new Error('Failed to get RDM tokens after refresh');
        }
      }
    
      return {
        'Authorization': `Bearer ${rdmAuth.tokens.token}`,
        'Content-Type': 'application/json'
      };
    }
  
    async getCharts(organizationId: string): Promise<(ChartData & { savedAt: string })[]> {
        try {
          if (!organizationId) {
            console.error('No organization ID provided');
            throw new Error('Organization ID is required');
          }
      
          const headers = await this.getAuthHeader();
          const url = new URL(`${this.baseUrl}/api/charts`);
          url.searchParams.append('organizationId', organizationId);
      
          console.log(`ChartService: Fetching charts from ${url.toString()}`);
      
          const response = await fetch(url.toString(), {
            credentials: 'include',
            headers
          });
      
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch charts: ${response.status} - ${errorText}`);
          }
      
          const data = await response.json();
      
          // Ensure savedAt is included
          const chartsWithSavedAt = data.map((chart: ChartData) => ({
            ...chart,
            savedAt: chart.createdAt ? new Date(chart.createdAt).toISOString() : new Date().toISOString()
          }));
      
          console.log(`ChartService: Received ${chartsWithSavedAt.length} charts`);
          return chartsWithSavedAt;
        } catch (error) {
          console.error('Error in getCharts:', error);
          throw error;
        }
      }
      

  async getChart(chartId: string): Promise<ChartData> {
    try {
      if (!chartId) {
        throw new Error('Chart ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/charts/${chartId}`, {
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chart: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in getChart:', error);
      throw error;
    }
  }

  async createChart(chart: ChartData, organizationId: string): Promise<string> {
    try {
      if (!organizationId) {
        console.error('No organization ID provided to createChart');
        throw new Error('Organization ID is required');
      }
      
      console.log(`ChartService: Creating chart for org: ${organizationId}`);
      const headers = await this.getAuthHeader();
      const url = new URL(`${this.baseUrl}/api/charts`);
      url.searchParams.append('organizationId', organizationId);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(chart)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        throw new Error(`Failed to create chart: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`ChartService: Chart created with ID: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('Error in createChart:', error);
      throw error;
    }
  }

  async updateChart(chartId: string, chart: ChartData): Promise<boolean> {
    try {
      if (!chartId) {
        throw new Error('Chart ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/charts/${chartId}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(chart)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update chart: ${response.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateChart:', error);
      throw error;
    }
  }

  async deleteChart(chartId: string): Promise<boolean> {
    try {
      if (!chartId) {
        throw new Error('Chart ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/charts/${chartId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete chart: ${response.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteChart:', error);
      throw error;
    }
  }

  // Report methods
  async getReports(organizationId: string): Promise<ReportData[]> {
    try {
      if (!organizationId) {
        console.error('No organization ID provided to getReports');
        throw new Error('Organization ID is required');
      }
      
      console.log(`ChartService: Fetching reports for org: ${organizationId}`);
      const headers = await this.getAuthHeader();
      const url = new URL(`${this.baseUrl}/api/reports`);
      url.searchParams.append('organizationId', organizationId);
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch reports: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      // Check if data is an array, if not return empty array
      if (!Array.isArray(data)) {
        console.log('ChartService: Received non-array response, returning empty array');
        return [];
      }
      
      console.log(`ChartService: Received ${data.length} reports`);
      return data;
    } catch (error) {
      console.error('Error in getReports:', error);
      throw error;
    }
  }

  async getReport(reportId: string): Promise<{report: ReportData, charts: any[]}> {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/reports/${reportId}`, {
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch report: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in getReport:', error);
      throw error;
    }
  }

  async createReport(report: {
    name: string;
    description?: string;
    content: string;
    reportData?: any;
    documentId?: string;
    folderId?: string;
    projectId?: string;
    organizationId: string;
    charts?: { id: string; position: number }[];
  }): Promise<string> {
    try {
      if (!report.organizationId) {
        throw new Error('Organization ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const url = new URL(`${this.baseUrl}/api/reports`);
      url.searchParams.append('organizationId', report.organizationId);

      const { organizationId, charts, ...reportData } = report;
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          ...reportData,
          document_id: reportData.documentId,
          folder_id: reportData.folderId,
          project_id: reportData.projectId,
          report_data: reportData.reportData
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create report: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const reportId = data.id;

      // If there are charts, add them to the report
      if (charts && charts.length > 0) {
        await Promise.all(
          charts.map(chart => this.addChartToReport(reportId, chart.id, chart.position))
        );
      }
      
      return reportId;
    } catch (error) {
      console.error('Error in createReport:', error);
      throw error;
    }
  }

  async updateReport(reportId: string, report: {
    name: string;
    description?: string;
    content: string;
    reportData?: any;
    documentId?: string;
    folderId?: string;
    projectId?: string;
  }): Promise<boolean> {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }
      
      const headers = await this.getAuthHeader();
      
      // Map the field names to match the database schema
      const reportData = {
        name: report.name,
        description: report.description,
        content: report.content,
        report_data: report.reportData,
        document_id: report.documentId,
        folder_id: report.folderId,
        project_id: report.projectId
      };

      const response = await fetch(`${this.baseUrl}/api/reports/${reportId}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update report: ${response.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in updateReport:', error);
      throw error;
    }
  }

  async deleteReport(reportId: string): Promise<boolean> {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete report: ${response.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteReport:', error);
      throw error;
    }
  }

  async addChartToReport(reportId: string, chartId: string, position: number): Promise<boolean> {
    try {
      if (!reportId || !chartId) {
        throw new Error('Report ID and Chart ID are required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/reports/${reportId}/charts`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ chartId, position })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add chart to report: ${response.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in addChartToReport:', error);
      throw error;
    }
  }

  async removeChartFromReport(reportId: string, chartId: string): Promise<boolean> {
    try {
      if (!reportId || !chartId) {
        throw new Error('Report ID and Chart ID are required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/reports/${reportId}/charts/${chartId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to remove chart from report: ${response.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in removeChartFromReport:', error);
      throw error;
    }
  }

  async reorderReportCharts(reportId: string, chartPositions: ReportChartData[]): Promise<boolean> {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/reports/${reportId}/charts/reorder`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify(chartPositions)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to reorder charts: ${response.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in reorderReportCharts:', error);
      throw error;
    }
  }
  
  // PDF export
  async exportReportToPDF(reportId: string): Promise<Blob> {
    try {
      if (!reportId) {
        throw new Error('Report ID is required');
      }
      
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/api/reports/${reportId}/export-pdf`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...headers,
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to export report to PDF: ${response.status} - ${errorText}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error in exportReportToPDF:', error);
      throw error;
    }
  }
}

export default new ChartService();