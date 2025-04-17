import { useEffect, useState, ReactElement } from "react"
import { ArrowLeft, Bold, Italic, List, ListOrdered, Heading2, ChevronDown, Save, BarChart, FileDown, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useNavigate, useParams } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Cell,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  Area,
  AreaChart
} from "recharts"
import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import ReactDOM from "react-dom/client"
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ChartService, { ChartData } from '@/services/chartService';
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";

interface ChartReport {
  name: string;
  chartType: string;
  chartData: any[];
  chartStyles: {
    colors: string[];
    strokeWidth: number;
    barRadius: number;
    showGrid: boolean;
    opacity: number;
    fontSize: number;
    gridStyle: 'solid' | 'dashed';
    gridDirection: 'both' | 'horizontal' | 'vertical';
    showLegend: boolean;
    showSingleSeriesLegend: boolean;
    colorTheme: string;
    useMultiColor: boolean;
    legendPosition: {
      vertical: 'top' | 'middle' | 'bottom';
      horizontal: 'left' | 'center' | 'right';
      layout: 'horizontal' | 'vertical';
    };
  };
  columns: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'formula' | 'date';
    formula?: string;
    isAxisColumn?: boolean;
  }>;
  groupByConfig?: any;
  savedAt?: string;
  id?: string;
  description?: string;
  documentId?: string;
  folderId?: string;
  projectId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Add PDF Settings interface after ChartReport interface
interface PdfSettings {
  includeTitlePage: boolean;
  includePageNumbers: boolean;
  pageNumberFormat: {
    format: 'Page X of Y' | 'X/Y' | 'X';
    position: 'bottom-center' | 'bottom-right' | 'bottom-left';
  };
  fontSizes: {
    default: number;
    heading1: number;
    heading2: number;
    heading3: number;
    paragraph: number;
    footer: number;
  };
  customFooter: {
    enabled: boolean;
    text: string;
    alignment: 'left' | 'center' | 'right';
  };
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    unit: 'in' | 'cm' | 'mm';
  };
}

function renderChartContent(reportData: ChartReport): ReactElement {
  console.log('renderChartContent received data:', reportData);
  
  if (!reportData || !reportData.columns || !reportData.chartData || reportData.chartData.length === 0) {
    console.log('Chart data validation failed:', {
      hasReportData: !!reportData,
      hasColumns: !!(reportData?.columns),
      hasChartData: !!(reportData?.chartData),
      chartDataLength: reportData?.chartData?.length
    });
    return (
      <ResponsiveContainer width="100%" height="100%">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No chart data available
        </div>
      </ResponsiveContainer>
    );
  }

  const { chartType, chartData, chartStyles, columns } = reportData;

  // Find the axis column and get its key
  const axisColumn = columns?.find(col => col.isAxisColumn);
  const axisKey = axisColumn?.key || (chartData[0] ? Object.keys(chartData[0])[0] : '');

  // Determine the data keys for the chart
  const dataKeys = columns
    .filter(col => col.type === 'number' && !col.isAxisColumn)
    .map(col => col.key);

  // Create a mapping of data keys to their labels
  const keyToLabel = columns.reduce((acc, col) => ({
    ...acc,
    [col.key]: col.label
  }), {} as Record<string, string>);

  // For pie/donut charts, transform the data if needed
  const pieChartData = (chartType === "pie" || chartType === "donut") 
    ? chartData.map(item => ({
        name: item[axisKey],
        value: typeof item.value === 'number' ? item.value : Number(item[dataKeys[0]])
      }))
    : chartData;

  const gridComponent = chartStyles.showGrid && (
    <CartesianGrid 
      strokeDasharray={chartStyles.gridStyle === 'dashed' ? "3 3" : "0"} 
      stroke="#e0e0e0" 
      strokeWidth={1}
      horizontal={chartStyles.gridDirection === 'both' || chartStyles.gridDirection === 'horizontal'}
      vertical={chartStyles.gridDirection === 'both' || chartStyles.gridDirection === 'vertical'}
    />
  );

  const legendTextShift = (label: string | number) => (
    <span
      style={{
        display: 'inline-block',
        position: 'relative',
        top: '-5px', // <‑‑ push text 5 px higher
      }}
    >
      {label}
    </span>
  );

  console.log('Rendering chart with type:', chartType); // Debug log

  const renderInnerContent = () => {
    switch (chartType) {
      case "horizontal-bar":
        return (
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <RechartsBarChart layout="vertical" data={chartData} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
              {gridComponent}
              <XAxis type="number" axisLine={false} tickLine={false} />
              <YAxis
                dataKey={axisKey}
                type="category"
                tick={{ fontSize: chartStyles.fontSize }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && (
                <Legend
                  verticalAlign={chartStyles.legendPosition?.vertical || 'bottom'}
                  align={chartStyles.legendPosition?.horizontal || 'center'}
                  layout={chartStyles.legendPosition?.layout || 'horizontal'}
                  wrapperStyle={{
                    fontSize: `${chartStyles.fontSize}px`,
                    padding: '10px'
                  }}
                />
              )}
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  name={keyToLabel[key] || key}
                  dataKey={key}
                  fill={chartStyles.colors[index % chartStyles.colors.length]}
                  radius={[0, chartStyles.barRadius, chartStyles.barRadius, 0]}
                  fillOpacity={chartStyles.opacity}
                >
                  {chartStyles.useMultiColor && dataKeys.length === 1 && chartData.map((_, entryIndex) => (
                    <Cell
                      key={`cell-${entryIndex}`}
                      fill={chartStyles.colors[entryIndex % chartStyles.colors.length]}
                    />
                  ))}
                </Bar>
              ))}
            </RechartsBarChart>
          </ChartContainer>
        );

      case "line":
        return (
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <RechartsLineChart data={chartData} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
              {gridComponent}
              <XAxis
                dataKey={axisKey}
                tick={{ fontSize: chartStyles.fontSize }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: chartStyles.fontSize }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && (
                <Legend
                  verticalAlign={chartStyles.legendPosition?.vertical || 'bottom'}
                  align={chartStyles.legendPosition?.horizontal || 'center'}
                  layout={chartStyles.legendPosition?.layout || 'horizontal'}
                  wrapperStyle={{
                    fontSize: `${chartStyles.fontSize}px`,
                    padding: '10px'
                  }}
                />
              )}
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  name={keyToLabel[key] || key}
                  type="monotone"
                  dataKey={key}
                  stroke={chartStyles.colors[index % chartStyles.colors.length]}
                  strokeWidth={chartStyles.strokeWidth}
                  dot={{ fill: chartStyles.colors[index % chartStyles.colors.length], r: 4 }}
                  strokeOpacity={chartStyles.opacity}
                />
              ))}
            </RechartsLineChart>
          </ChartContainer>
        );

      case "pie":
      case "donut":
        return (
          <ChartContainer config={{ value: { label: "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <RechartsPieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={{ 
                  stroke: '#666666', 
                  strokeWidth: 1,
                  strokeDasharray: "2 2"
                }}
                label={({ name, value, percent }) => (
                  `${name}: ${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`
                )}
                innerRadius={chartType === "donut" ? "50%" : 0}
                outerRadius="80%"
                dataKey="value"
                nameKey="name"
                isAnimationActive={true}
              >
                {pieChartData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartStyles.colors[index % chartStyles.colors.length]}
                    opacity={chartStyles.opacity}
                    stroke="white"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: any) => value.toLocaleString()}
              />
              {chartStyles.showLegend && (
                <Legend
                  verticalAlign={chartStyles.legendPosition?.vertical || 'bottom'}
                  align={chartStyles.legendPosition?.horizontal || 'center'}
                  layout={chartStyles.legendPosition?.layout || 'horizontal'}
                  wrapperStyle={{
                    fontSize: `${chartStyles.fontSize}px`,
                    padding: '10px'
                  }}
                />
              )}
            </RechartsPieChart>
          </ChartContainer>
        );

      case "area":
      case "stacked-area":
        return (
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                {dataKeys.map((key, index) => (
                  <linearGradient key={`gradient-${key}`} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartStyles.colors[index % chartStyles.colors.length]} stopOpacity={chartStyles.opacity * 0.8}/>
                    <stop offset="95%" stopColor={chartStyles.colors[index % chartStyles.colors.length]} stopOpacity={chartStyles.opacity * 0.1}/>
                  </linearGradient>
                ))}
              </defs>
              {gridComponent}
              <XAxis
                dataKey={axisKey}
                tick={{ fontSize: chartStyles.fontSize }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: chartStyles.fontSize }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && (
                <Legend
                  verticalAlign={chartStyles.legendPosition?.vertical || 'bottom'}
                  align={chartStyles.legendPosition?.horizontal || 'center'}
                  layout={chartStyles.legendPosition?.layout || 'horizontal'}
                  wrapperStyle={{
                    fontSize: `${chartStyles.fontSize}px`,
                    padding: '10px'
                  }}
                />
              )}
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  name={keyToLabel[key] || key}
                  type="monotone"
                  dataKey={key}
                  stroke={chartStyles.colors[index % chartStyles.colors.length]}
                  strokeWidth={chartStyles.strokeWidth}
                  fill={`url(#gradient-${key})`}
                  fillOpacity={1}
                  strokeOpacity={chartStyles.opacity}
                  stackId={chartType === "stacked-area" ? "stack" : undefined}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        );

      case "bar":
      default:
        return (
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <RechartsBarChart data={chartData} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
              {gridComponent}
              <XAxis
                dataKey={axisKey}
                tick={{ fontSize: chartStyles.fontSize }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: chartStyles.fontSize }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && (
                <Legend
                  verticalAlign={chartStyles.legendPosition?.vertical || 'bottom'}
                  align={chartStyles.legendPosition?.horizontal || 'center'}
                  layout={chartStyles.legendPosition?.layout || 'horizontal'}
                  wrapperStyle={{
                    fontSize: `${chartStyles.fontSize}px`,
                    padding: '10px'
                  }}
                  formatter={legendTextShift} 
                />
              )}
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  name={keyToLabel[key] || key}
                  dataKey={key}
                  fill={chartStyles.colors[index % chartStyles.colors.length]}
                  radius={[chartStyles.barRadius, chartStyles.barRadius, 0, 0]}
                  fillOpacity={chartStyles.opacity}
                >
                  {chartStyles.useMultiColor && dataKeys.length === 1 && chartData.map((_, entryIndex) => (
                    <Cell
                      key={`cell-${entryIndex}`}
                      fill={chartStyles.colors[entryIndex % chartStyles.colors.length]}
                    />
                  ))}
                </Bar>
              ))}
            </RechartsBarChart>
          </ChartContainer>
        );
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderInnerContent()}
    </ResponsiveContainer>
  );
}

const ChartNode = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      chartData: {
        default: null,
        parseHTML: (element) => {
          try {
            // Try both data-chart and chartdata attributes for backward compatibility
            const data = element.getAttribute('data-chart') || element.getAttribute('chartdata');
            if (!data) return null;
            return typeof data === 'string' ? JSON.parse(decodeURIComponent(data)) : data;
          } catch (e) {
            console.error('Error parsing chart data:', e);
            return null;
          }
        },
        renderHTML: (attributes) => {
          if (!attributes.chartData) return {};
          try {
            const chartDataStr = encodeURIComponent(JSON.stringify(attributes.chartData));
            return {
              'data-chart': chartDataStr
            };
          } catch (e) {
            console.error('Error stringifying chart data:', e);
            return {};
          }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="chart"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart', class: 'chart-container my-4 border rounded-lg p-4' })]
  },

  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('div')
      container.classList.add('chart-container', 'my-4', 'border', 'rounded-lg', 'p-4')
      container.style.height = '300px'

      // Get the chart data from the node's attributes
      const chartData = node.attrs.chartData;
      console.log('Node view chart data:', chartData);

      if (chartData) {
        // Create a new container for Recharts
        const chartContainer = document.createElement('div')
        chartContainer.style.width = '100%'
        chartContainer.style.height = '100%'
        container.appendChild(chartContainer)

        // Create a deep clone of the chart data to avoid any reference issues
        const clonedChartData = JSON.parse(JSON.stringify(chartData));

        // Render the chart using React
        const root = ReactDOM.createRoot(chartContainer)
        root.render(renderChartContent(clonedChartData))

        // Clean up on destroy
        return {
          dom: container,
          destroy: () => {
            root.unmount();
          }
        }
      } else {
        container.textContent = 'No chart data available'
        return {
          dom: container
        }
      }
    }
  },
});

const MenuBar = ({ editor, charts }: { editor: any, charts: ChartData[] }) => {
    const [_savedCharts, setSavedCharts] = useState<ChartReport[]>([]);
    const { toast } = useToast();
  
    useEffect(() => {
      // Load saved charts from localStorage
      const loadSavedCharts = () => {
        const storedCharts = localStorage.getItem('savedCharts');
        if (storedCharts) {
          try {
            setSavedCharts(JSON.parse(storedCharts));
          } catch (error) {
            console.error('Error loading saved charts:', error);
          }
        }
      };
  
      loadSavedCharts();
  
      // Set up storage event listener for cross-tab updates
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'savedCharts') {
          loadSavedCharts();
        }
      };
  
      // Custom event for same-tab updates
      const handleCustomEvent = () => loadSavedCharts();
      window.addEventListener('savedChartsUpdated', handleCustomEvent);
  
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('savedChartsUpdated', handleCustomEvent);
      };
    }, []);
  
    const handleInsertChart = (chart: ChartReport) => {
      if (editor) {
        // Create a deep clone of the chart data to avoid any reference issues
        const clonedChart = JSON.parse(JSON.stringify(chart));
  
        editor.chain().focus().insertContent({
          type: 'chart',
          attrs: {
            chartData: clonedChart
          }
        }).run();

        // Dispatch a custom event to notify that a chart was inserted
        const event = new CustomEvent('chartInserted', { 
          detail: { chartId: chart.id, position: editor.state.doc.content.size }
        });
        window.dispatchEvent(event);
  
        toast({
          title: "Chart Inserted",
          description: `Chart "${chart.name}" has been inserted into your report.`,
          duration: 2000,
        });
      }
    };
  
    if (!editor) {
      return null;
    }
  
    return (
      <div className="flex items-center gap-1 mb-4">
        <Button
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <Heading2 className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <BarChart className="h-4 w-4" />
              Insert Chart
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert Chart</DialogTitle>
              <DialogDescription>
                Select a saved chart to insert into your report.
              </DialogDescription>
            </DialogHeader>
            {charts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground mb-2">No saved charts found</p>
                <p className="text-sm text-muted-foreground">
                  Create and save a chart first to insert it into your report.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 py-4">
                {charts.map((chart, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleInsertChart(chart)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-2">
                        <h3 className="font-medium">{chart.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {chart.chartType} Chart • {new Date(chart.savedAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };  

export function ChartReport() {
    const [charts, setCharts] = useState<ChartData[]>([]);
    const [reportData, setReportData] = useState<ChartReport | null>(null);
    const [reportName, setReportName] = useState<string>("Untitled Report");
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [insertedCharts, setInsertedCharts] = useState<{ id: string; position: number }[]>([]);
    const [pdfSettingsOpen, setPdfSettingsOpen] = useState(false);
    const [pdfSettings, setPdfSettings] = useState<PdfSettings>({
      includeTitlePage: false,
      includePageNumbers: true,
      pageNumberFormat: {
        format: 'Page X of Y',
        position: 'bottom-center'
      },
      fontSizes: {
        default: 12,
        heading1: 18,
        heading2: 16,
        heading3: 14,
        paragraph: 10,
        footer: 10
      },
      customFooter: {
        enabled: false,
        text: '',
        alignment: 'center'
      },
      margins: {
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        unit: 'in'
      }
    });
    const navigate = useNavigate();
    const { toast } = useToast();
    const { selectedOrgId } = useOrganization();
    const { reportId } = useParams();
  
    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: 'Start typing...',
        }),
        ChartNode.configure({
          // Add any configuration options here
        })
      ],
      content: '',
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]'
        }
      }
    });
  
    // Load all saved charts when component mounts
    useEffect(() => {
      const loadAllCharts = async () => {
        if (!selectedOrgId) return;

        try {
          const allCharts = await ChartService.getCharts(selectedOrgId);
          if (allCharts) {
            const processedCharts = allCharts.map(chart => ({
              ...chart,
              chartType: chart.chartType || '',
              chartData: chart.chartData || [],
              columns: chart.columns || [],
              chartStyles: {
                colors: chart.chartStyles?.colors || [],
                strokeWidth: chart.chartStyles?.strokeWidth || 2,
                barRadius: chart.chartStyles?.barRadius || 4,
                showGrid: chart.chartStyles?.showGrid ?? true,
                opacity: chart.chartStyles?.opacity || 1,
                fontSize: chart.chartStyles?.fontSize || 12,
                gridStyle: chart.chartStyles?.gridStyle || 'solid',
                gridDirection: chart.chartStyles?.gridDirection || 'both',
                showLegend: chart.chartStyles?.showLegend ?? true,
                showSingleSeriesLegend: chart.chartStyles?.showSingleSeriesLegend ?? false,
                colorTheme: chart.chartStyles?.colorTheme || 'default',
                useMultiColor: chart.chartStyles?.useMultiColor ?? false,
                legendPosition: {
                  vertical: chart.chartStyles?.legendPosition?.vertical || 'bottom',
                  horizontal: chart.chartStyles?.legendPosition?.horizontal || 'center',
                  layout: chart.chartStyles?.legendPosition?.layout || 'horizontal'
                }
              },
              savedAt: chart.createdAt || new Date().toISOString()
            }));
            setCharts(processedCharts);
          }
        } catch (error) {
          console.error('Error loading all charts:', error);
          toast({
            title: "Error",
            description: "Failed to load available charts.",
            variant: "destructive",
            duration: 3000,
          });
        }
      };

      loadAllCharts();
    }, [selectedOrgId, toast]);
  
    // Load report data if editing an existing report
    useEffect(() => {
      const loadReport = async () => {
        if (!reportId || !selectedOrgId) return;

        try {
          console.log('Loading report with ID:', reportId);
          const { report, charts: reportCharts } = await ChartService.getReport(reportId);
          console.log('Received report data:', report);
          console.log('Received charts:', reportCharts);

          if (!report) {
            console.error('No report data received');
            return;
          }

          // Set report name and data
          setReportName(report.name || 'Untitled Report');
          setReportData({
            id: report.id,
            name: report.name || 'Untitled Report',
            chartType: '',
            chartData: [],
            chartStyles: {
              colors: [],
              strokeWidth: 2,
              barRadius: 4,
              showGrid: true,
              opacity: 1,
              fontSize: 12,
              gridStyle: 'solid' as const,
              gridDirection: 'both' as const,
              showLegend: true,
              showSingleSeriesLegend: false,
              colorTheme: 'default',
              useMultiColor: false,
              legendPosition: {
                vertical: 'bottom' as const,
                horizontal: 'center' as const,
                layout: 'horizontal' as const
              }
            },
            columns: [],
            description: report.description,
            createdAt: report.createdAt?.toString(),
            updatedAt: report.updatedAt?.toString()
          });

          // Set inserted charts
          if (reportCharts && reportCharts.length > 0) {
            const insertedChartsData = reportCharts.map((chart) => ({
              id: chart.id || '',
              position: chart.position || 0
            }));
            setInsertedCharts(insertedChartsData);
          }

          // Set editor content and update chart nodes
          if (editor && report.content) {
            // First set the content
            editor.commands.setContent(report.content);

            // Then update each chart node with its data
            if (reportCharts && reportCharts.length > 0) {
              const matchingChart = reportCharts[0]; // Since we know we have the chart data
              if (matchingChart) {
                // Replace the content with updated chart data
                const updatedContent = report.content.replace(
                  /<div[^>]*data-type="chart"[^>]*>/g,
                  `<div data-type="chart" data-chart="${encodeURIComponent(JSON.stringify(matchingChart))}">`
                );
                editor.commands.setContent(updatedContent);
              }
            }
          }

        } catch (error) {
          console.error('Error loading report:', error);
          toast({
            title: "Error",
            description: "Failed to load the report. Please try again.",
            variant: "destructive",
            duration: 3000,
          });
        }
      };

      loadReport();
    }, [reportId, selectedOrgId, editor, toast]);
  
    useEffect(() => {
      // Listen for chart insertion events
      const handleChartInserted = (event: CustomEvent<{ chartId: string; position: number }>) => {
        setInsertedCharts(prev => [...prev, { 
          id: event.detail.chartId, 
          position: event.detail.position 
        }]);
      };

      window.addEventListener('chartInserted', handleChartInserted as EventListener);

      return () => {
        window.removeEventListener('chartInserted', handleChartInserted as EventListener);
      };
    }, []);
  
    const handleBack = () => {
      // If we're editing a report, go back to the chart dashboard
      if (reportId) {
        navigate("/rdm/document-insights/chart-dashboard");
      } else {
        // For new reports, go back to the chart dashboard
        navigate("/rdm/document-insights/chart-dashboard");
      }
    };
  
    const handleSaveReport = async () => {
      if (!editor || !selectedOrgId) {
        toast({
          title: "Error",
          description: "Cannot save report: Editor or organization ID not available.",
          variant: "destructive",
        });
        return;
      }

      try {
        const content = editor.getHTML();
        const reportToSave = {
          name: reportName,
          content,
          reportData: reportData,
          organizationId: selectedOrgId,
          charts: insertedCharts
        };

        // Save to localStorage for backup
        localStorage.setItem('savedReport', JSON.stringify(reportToSave));

        // Save to database
        if (reportData?.id) {
          // Update existing report
          await ChartService.updateReport(reportData.id, reportToSave);
          
          // Update chart associations
          for (const chart of insertedCharts) {
            await ChartService.addChartToReport(reportData.id, chart.id, chart.position);
          }
        } else {
          // Create new report
          const reportId = await ChartService.createReport(reportToSave);
          // Update the report data with the new ID while preserving all other properties
          setReportData(prev => prev ? { ...prev, id: reportId } : {
            id: reportId,
            name: reportName,
            chartType: '',
            chartData: [],
            chartStyles: {
              colors: [],
              strokeWidth: 2,
              barRadius: 4,
              showGrid: true,
              opacity: 1,
              fontSize: 12,
              gridStyle: 'solid' as const,
              gridDirection: 'both' as const,
              showLegend: true,
              showSingleSeriesLegend: false,
              colorTheme: 'default',
              useMultiColor: false,
              legendPosition: {
                vertical: 'bottom' as const,
                horizontal: 'center' as const,
                layout: 'horizontal' as const
              }
            },
            columns: []
          });
        }

        toast({
          title: "Report Saved",
          description: "Your report has been saved successfully.",
          duration: 2000,
        });
      } catch (error) {
        console.error('Error saving report:', error);
        toast({
          title: "Error",
          description: "Failed to save report. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
      }
    };
  
    const handleExportPDF = async () => {
      setIsGeneratingPDF(true);
      toast({ title: "Generating PDF...", description: "Preparing report...", duration: 5000 });
  
      let tempRenderContainer: HTMLDivElement | null = null;
  
      try {
        if (!editor) {
          throw new Error("Editor is not initialized.");
        }
  
        // Create off-screen container
        tempRenderContainer = document.createElement('div');
        tempRenderContainer.style.position = 'absolute';
        tempRenderContainer.style.left = '-9999px';
        tempRenderContainer.style.width = '800px';
        tempRenderContainer.style.padding = '40px';
        tempRenderContainer.style.backgroundColor = 'white';
  
        // Get editor content as JSON
        const editorContent = editor.getJSON();
  
        // Create a clean version of the editor content
        const cleanContentHTML = document.createElement('div');
        cleanContentHTML.className = 'report-content';
  
        // Process each node in the editor content
        const processNode = (node: any) => {
          if (node.type === 'chart') {
            // For chart nodes, create a placeholder with chart data
            const chartPlaceholder = document.createElement('div');
            chartPlaceholder.setAttribute('data-type', 'chart');
            chartPlaceholder.setAttribute('data-chart-id', `chart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
            chartPlaceholder.className = 'chart-container my-4 border rounded-lg p-4';
            chartPlaceholder.style.height = '300px';
            
            // Store the chart data in the placeholder's dataset
            if (node.attrs?.chartData) {
              chartPlaceholder.setAttribute('data-chart-data', JSON.stringify(node.attrs.chartData));
            }

            return chartPlaceholder;
          } else if (node.type === 'paragraph') {
            const p = document.createElement('p');
            if (node.content && node.content.length > 0) {
              node.content.forEach((child: any) => {
                if (child.type === 'text') {
                  const textNode = document.createTextNode(child.text);
                  if (child.marks) {
                    let currentNode: globalThis.Node = textNode;
                    child.marks.forEach((mark: any) => {
                      const wrapper = document.createElement(mark.type === 'bold' ? 'strong' : mark.type === 'italic' ? 'em' : 'span');
                      wrapper.appendChild(currentNode);
                      currentNode = wrapper;
                    });
                    p.appendChild(currentNode);
                  } else {
                    p.appendChild(textNode);
                  }
                }
              });
            } else {
              // For empty paragraphs, add a non-breaking space and set min-height
              const nbsp = document.createTextNode('\u00A0');
              p.appendChild(nbsp);
              p.style.minHeight = '1em';
              p.style.marginBottom = '1em';
            }
            return p;
          } else if (node.type === 'heading') {
            const heading = document.createElement(`h${node.attrs.level}`);
            if (node.content) {
              node.content.forEach((child: any) => {
                if (child.type === 'text') {
                  heading.textContent = child.text;
                }
              });
            }
            return heading;
          } else if (node.type === 'bulletList') {
            const ul = document.createElement('ul');
            if (node.content) {
              node.content.forEach((listItem: any) => {
                if (listItem.type === 'listItem' && listItem.content) {
                  const li = document.createElement('li');
                  listItem.content.forEach((itemContent: any) => {
                    const processedNode = processNode(itemContent);
                    if (processedNode) li.appendChild(processedNode);
                  });
                  ul.appendChild(li);
                }
              });
            }
            return ul;
          } else if (node.type === 'orderedList') {
            const ol = document.createElement('ol');
            if (node.content) {
              node.content.forEach((listItem: any) => {
                if (listItem.type === 'listItem' && listItem.content) {
                  const li = document.createElement('li');
                  listItem.content.forEach((itemContent: any) => {
                    const processedNode = processNode(itemContent);
                    if (processedNode) li.appendChild(processedNode);
                  });
                  ol.appendChild(li);
                }
              });
            }
            return ol;
          }
          return null;
        };
  
        // Process all nodes
        editorContent.content?.forEach(node => {
          const processedNode = processNode(node);
          if (processedNode) {
            cleanContentHTML.appendChild(processedNode);
          }
        });
  
        tempRenderContainer.appendChild(cleanContentHTML);
        document.body.appendChild(tempRenderContainer);
  
        // Process chart placeholders
        const chartPlaceholders = Array.from(
          cleanContentHTML.querySelectorAll('div[data-type="chart"]')
        );
  
        console.log(`Found ${chartPlaceholders.length} chart placeholders to process.`);
  
        for (const placeholder of chartPlaceholders) {
          // Get chart data from the placeholder's dataset
          const chartDataStr = placeholder.getAttribute('data-chart-data');
          let chartData;
          
          try {
            chartData = chartDataStr ? JSON.parse(chartDataStr) : null;
            console.log('Processing chart with data:', chartData);
          } catch (error) {
            console.error('Error parsing chart data:', error);
            chartData = null;
          }

          if (!chartData) {
            placeholder.innerHTML = '[Chart data not available]';
            continue;
          }

          const chartRenderDiv = document.createElement('div');
          chartRenderDiv.style.width = '100%';
          chartRenderDiv.style.height = '300px';
          chartRenderDiv.style.overflow = 'visible';
          placeholder.innerHTML = '';
          placeholder.appendChild(chartRenderDiv);

          // Render chart with the actual chart data
          const root = ReactDOM.createRoot(chartRenderDiv);
          root.render(renderChartContent(chartData));

          // Wait for chart rendering
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            // Capture chart
            const canvas = await html2canvas(placeholder as HTMLElement, {
              scale: 2,
              useCORS: true,
              logging: true,
              background: '#ffffff',
              onclone: (clonedDoc: Document) => {
                // Ensure the cloned element has proper dimensions
                const clonedPlaceholder = clonedDoc.querySelector(`[data-chart-id="${placeholder.getAttribute('data-chart-id')}"]`) as HTMLDivElement;
                if (clonedPlaceholder) {
                  clonedPlaceholder.style.width = '100%';
                  clonedPlaceholder.style.height = '300px';
                }
              }
            } as any);

            const imgDataUrl = canvas.toDataURL('image/png');

            // Create image
            const img = document.createElement('img');
            img.src = imgDataUrl;
            img.alt = `Chart (${chartData.chartType})`;
            img.style.width = '100%';
            img.style.maxWidth = '650px';
            img.style.display = 'block';
            img.style.margin = '0.5rem auto';

            // Replace placeholder with image
            placeholder.replaceWith(img);

            // Unmount React component
            root.unmount();
          } catch (chartError) {
            console.error('Error capturing chart:', chartError);
            placeholder.innerHTML = '[Error rendering chart]';
          }
        }
  
        // Wait for all rendering to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
  
        // Generate PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Convert margins to mm if they're in inches
        const marginConversion = (() => {
          switch (pdfSettings.margins.unit) {
            case 'in': return 25.4;  // inches to mm
            case 'cm': return 10;    // cm to mm
            default: return 1;       // mm to mm
          }
        })();
        const margins = {
          top: pdfSettings.margins.top * marginConversion,
          right: pdfSettings.margins.right * marginConversion,
          bottom: pdfSettings.margins.bottom * marginConversion,
          left: pdfSettings.margins.left * marginConversion
        };
        
        // Define content width based on custom margins
        const contentWidth = pdfWidth - (margins.left + margins.right);
        
        // Add title page if enabled
        if (pdfSettings.includeTitlePage) {
          // Title page
          pdf.setFontSize(24);
          pdf.text(reportName, pdfWidth / 2, margins.top + 25, { align: 'center' });
          pdf.setFontSize(12);
          pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pdfWidth / 2, margins.top + 35, { align: 'center' });
          pdf.addPage(); // Add a new page after title page
        }
        
        // Split content into chunks for pagination
        const contentElements = Array.from(tempRenderContainer.children[0].children);
        let currentPage = pdfSettings.includeTitlePage ? 2 : 1;
        
        let yPosition = margins.top;
        
        // Process each top-level element
        for (let i = 0; i < contentElements.length; i++) {
          const element = contentElements[i];
          
          // For headings, paragraphs, and lists - add as text
          if (element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'H3') {
            // Add headings
            const fontSize = element.tagName === 'H1' 
              ? pdfSettings.fontSizes.heading1 
              : element.tagName === 'H2' 
                ? pdfSettings.fontSizes.heading2 
                : pdfSettings.fontSizes.heading3;
            
            // Calculate base line height for this heading
            const headingBaseHeight = fontSize * 0.352778; // Convert pt to mm
            
            console.log('Processing heading:', {
              content: element.textContent,
              type: element.tagName,
              fontSize,
              baseHeight: headingBaseHeight,
              currentY: yPosition
            });
            
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', 'bold');
            
            // Check if we need a new page
            if (yPosition + headingBaseHeight > pdfHeight - margins.bottom) {
              pdf.addPage();
              currentPage++;
              yPosition = margins.top;
            }
            
            const oldY = yPosition;
            
            // Add same spacing as paragraphs
            const paragraphBaseHeight = pdfSettings.fontSizes.paragraph * 0.352778;
            yPosition += paragraphBaseHeight * 0.6;
            
            pdf.text(element.textContent || '', margins.left, yPosition);
            
            // Add proportional space after heading
            yPosition += headingBaseHeight * 1.0;
            
            console.log('Heading spacing calculation:', {
              oldY,
              newY: yPosition,
              spaceBefore: paragraphBaseHeight * 0.6,
              spaceAfter: headingBaseHeight * 1.0,
              fontSize,
              headingBaseHeight
            });
            
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(pdfSettings.fontSizes.paragraph);
          } 
          else if (element.tagName === 'P') {
            // Add paragraphs
            pdf.setFontSize(pdfSettings.fontSizes.paragraph);
            pdf.setFont('helvetica', 'normal');
            
            // Calculate base line height based on font size
            const baseLineHeight = pdfSettings.fontSizes.paragraph * 0.352778; // Convert pt to mm
            
            console.log('Processing paragraph:', {
              content: element.textContent,
              currentYPosition: yPosition,
              baseLineHeight,
              fontSize: pdfSettings.fontSizes.paragraph,
              isEmpty: element.textContent === '\u00A0' || !element.textContent?.trim()
            });
            
            // Check if paragraph is empty (just contains a non-breaking space)
            if (element.textContent === '\u00A0' || !element.textContent?.trim()) {
              const oldY = yPosition;
              // For empty paragraphs, add space
              yPosition += baseLineHeight * 1.2;
              
              console.log('Empty paragraph spacing:', {
                oldY,
                newY: yPosition,
                addedSpace: baseLineHeight * 1.2,
                baseLineHeight
              });
              
              // Check if we need a new page
              if (yPosition > pdfHeight - margins.bottom) {
                console.log('New page needed for empty paragraph at y:', yPosition);
                pdf.addPage();
                currentPage++;
                yPosition = margins.top;
              }
              continue;
            }
            
            // Split paragraph text to fit width
            const textLines = pdf.splitTextToSize(element.textContent || '', contentWidth);
            
            console.log('Paragraph text split:', {
              numberOfLines: textLines.length,
              lines: textLines,
              contentWidth
            });
            
            // Calculate space needed for each line including line spacing
            const lineSpacing = baseLineHeight * 1.2;
            let remainingLines = [...textLines];
            
            while (remainingLines.length > 0) {
              // Calculate remaining space on current page
              const remainingSpace = pdfHeight - margins.bottom - yPosition;
              const linesOnThisPage = Math.floor(remainingSpace / lineSpacing);
              
              console.log('Page space calculation:', {
                remainingSpace,
                lineSpacing,
                linesOnThisPage,
                totalRemainingLines: remainingLines.length,
                currentY: yPosition
              });
              
              if (linesOnThisPage <= 0) {
                // No space for even one line, move to next page
                pdf.addPage();
                currentPage++;
                yPosition = margins.top;
                continue;
              }
              
              // Get lines that fit on this page
              const linesToRender = remainingLines.slice(0, linesOnThisPage);
              remainingLines = remainingLines.slice(linesOnThisPage);
              
              // Render lines for this page
              pdf.text(linesToRender, margins.left, yPosition);
              
              // Update position
              yPosition += linesToRender.length * lineSpacing;
              
              // If there are more lines, add a new page
              if (remainingLines.length > 0) {
                pdf.addPage();
                currentPage++;
                yPosition = margins.top;
              } else {
                // Add paragraph margin after the last line
                const paragraphMargin = baseLineHeight * 0.6;
                yPosition += paragraphMargin;
              }
              
              console.log('Lines rendered:', {
                pageNumber: currentPage,
                linesOnThisPage: linesToRender.length,
                remainingLines: remainingLines.length,
                newY: yPosition
              });
            }
          }
          else if (element.tagName === 'UL' || element.tagName === 'OL') {
            // Add lists
            pdf.setFontSize(pdfSettings.fontSizes.paragraph);
            const listItems = Array.from(element.children);
            
            // Calculate base line height for consistent spacing
            const baseLineHeight = pdfSettings.fontSizes.paragraph * 0.352778;
            
            // Don't add extra spacing before list since paragraphs and other elements already add spacing after themselves
            const listStartY = yPosition;
            
            for (let j = 0; j < listItems.length; j++) {
              const item = listItems[j];
              const prefix = element.tagName === 'OL' ? `${j + 1}. ` : '• ';
              const listItemText = prefix + (item.textContent || '');
              
              // Split list item text to fit width (accounting for indentation)
              const textLines = pdf.splitTextToSize(listItemText, contentWidth - 5);
              
              // Check if we need a new page
              if (yPosition + (textLines.length * baseLineHeight) > pdfHeight - margins.bottom) {
                pdf.addPage();
                currentPage++;
                yPosition = margins.top;
              }
              
              // Render lines for this list item
              pdf.text(textLines, margins.left + 5, yPosition);
              
              // Add space between list items (normal line spacing plus small gap)
              yPosition += textLines.length * baseLineHeight;
              
              // Add small gap between list items (except after the last item)
              if (j < listItems.length - 1) {
                yPosition += baseLineHeight * 0.3;
              }
            }
            
            // Add spacing after list (same as paragraph spacing)
            const paragraphSpacing = baseLineHeight * 0.6;
            yPosition += paragraphSpacing;
            
            console.log('List spacing:', {
              listStartY,
              listEndY: yPosition,
              spacingUsed: paragraphSpacing,
              baseLineHeight
            });
          }
          else if (element.tagName === 'IMG') {
            // For images (charts)
            const img = element as HTMLImageElement;
            
            // Ensure image is loaded
            if (!img.complete) {
              await new Promise(resolve => {
                img.onload = resolve;
              });
            }
            
            // Calculate image dimensions to fit page width
            const imgRatio = img.naturalHeight / img.naturalWidth;
            const imgWidthMM = contentWidth;
            const imgHeightMM = imgWidthMM * imgRatio;
            
            // Check if we need a new page
            if (yPosition + imgHeightMM > pdfHeight - margins.bottom) {
              pdf.addPage();
              currentPage++;
              yPosition = margins.top;
            }
            
            // Add the image
            pdf.addImage(
              img.src,
              'PNG',
              margins.left,
              yPosition,
              imgWidthMM,
              imgHeightMM,
              '',
              'FAST'
            );
            
            // Calculate base line height from paragraph font size and add more generous spacing
            const chartSpacing = pdfSettings.fontSizes.paragraph * 0.352778 * 2.5;
            yPosition += imgHeightMM + chartSpacing;
          }
          
          // Add page numbers and custom footer
          if (pdfSettings.includePageNumbers || pdfSettings.customFooter.enabled) {
            for (let pageNum = 1; pageNum <= currentPage; pageNum++) {
              pdf.setPage(pageNum);
              pdf.setFontSize(pdfSettings.fontSizes.footer);
              pdf.setTextColor(100, 100, 100);

              // Calculate footer position - respect bottom margin
              const footerY = pdfHeight - (margins.bottom / 2); // Position footer halfway in bottom margin
              
              // Clear footer area
              const footerHeight = 10; // height of footer area in mm
              pdf.setFillColor(255, 255, 255); // white
              pdf.rect(0, footerY - footerHeight, pdfWidth, footerHeight, 'F');

              // Handle both page numbers and custom footer if both are enabled
              if (pdfSettings.includePageNumbers && pdfSettings.customFooter.enabled) {
                let pageNumberText = '';
                switch (pdfSettings.pageNumberFormat.format) {
                  case 'X/Y':
                    pageNumberText = `${pageNum}/${currentPage}`;
                    break;
                  case 'X':
                    pageNumberText = `${pageNum}`;
                    break;
                  default:
                    pageNumberText = `Page ${pageNum.toString()} of ${currentPage.toString()}`;
                }

                // Calculate available width for footer and page number
                const availableWidth = pdfWidth - (margins.left + margins.right);
                const halfWidth = availableWidth / 2;

                // Position page numbers
                const pageNumberX = pdfSettings.pageNumberFormat.position === 'bottom-left' ? margins.left :
                                  pdfSettings.pageNumberFormat.position === 'bottom-right' ? pdfWidth - margins.right :
                                  pdfWidth / 2;

                // Position footer based on its alignment
                const footerX = pdfSettings.customFooter.alignment === 'left' ? margins.left + halfWidth :
                               pdfSettings.customFooter.alignment === 'right' ? pdfWidth - margins.right :
                               pdfWidth / 2; // center alignment

                // Render page numbers
                pdf.text(pageNumberText, pageNumberX, footerY, {
                  align: pdfSettings.pageNumberFormat.position === 'bottom-left' ? 'left' :
                         pdfSettings.pageNumberFormat.position === 'bottom-right' ? 'right' : 'center',
                  maxWidth: halfWidth
                });

                // Render footer with proper alignment
                pdf.text(pdfSettings.customFooter.text, footerX, footerY, {
                  align: pdfSettings.customFooter.alignment,
                  maxWidth: halfWidth
                });

              } else if (pdfSettings.includePageNumbers) {
                // Only page numbers
                let pageNumberText = '';
                switch (pdfSettings.pageNumberFormat.format) {
                  case 'X/Y':
                    pageNumberText = `${pageNum}/${currentPage}`;
                    break;
                  case 'X':
                    pageNumberText = `${pageNum}`;
                    break;
                  default:
                    pageNumberText = `Page ${pageNum.toString()} of ${currentPage.toString()}`;
                }

                const pageNumberX = pdfSettings.pageNumberFormat.position === 'bottom-left' ? margins.left :
                                  pdfSettings.pageNumberFormat.position === 'bottom-right' ? pdfWidth - margins.right :
                                  pdfWidth / 2;

                pdf.text(pageNumberText, pageNumberX, footerY, {
                  align: pdfSettings.pageNumberFormat.position === 'bottom-left' ? 'left' :
                         pdfSettings.pageNumberFormat.position === 'bottom-right' ? 'right' :
                         'center'
                });

              } else if (pdfSettings.customFooter.enabled) {
                // Only custom footer
                const footerX = pdfSettings.customFooter.alignment === 'left' ? margins.left :
                               pdfSettings.customFooter.alignment === 'right' ? pdfWidth - margins.right :
                               pdfWidth / 2;

                pdf.text(pdfSettings.customFooter.text, footerX, footerY, {
                  align: pdfSettings.customFooter.alignment,
                  maxWidth: pdfWidth - (margins.left + margins.right)
                });
              }
            }
            pdf.setTextColor(0, 0, 0);
          }
        }
  
        // Set PDF compression
        const compressedPDF = pdf.output('arraybuffer');
        const blob = new Blob([compressedPDF], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
  
        toast({ title: "Success", description: "PDF downloaded.", duration: 3000 });
  
      } catch (error) {
        console.error('Error during PDF generation:', error);
        toast({
          title: "Error Generating PDF",
          description: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        // Cleanup
        if (tempRenderContainer && document.body.contains(tempRenderContainer)) {
          document.body.removeChild(tempRenderContainer);
        }
        setIsGeneratingPDF(false);
      }
    };
  
    const handleReportNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setReportName(e.target.value);
    };

    // Handle PDF settings change
    const handlePdfSettingsChange = (newSettings: Partial<PdfSettings>) => {
      setPdfSettings(prev => ({
        ...prev,
        ...newSettings,
      }));
    };
  
    return (
      <div className="container mx-auto py-6 pr-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <input
                type="text"
                value={reportName}
                onChange={handleReportNameChange}
                className="text-3xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                placeholder="Enter report name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={pdfSettingsOpen} onOpenChange={setPdfSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-md" title="PDF Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader className="px-2">
                    <DialogTitle>PDF Export Settings</DialogTitle>
                    <DialogDescription>
                      Configure how your PDF report will be exported
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto px-2">
                    <div className="grid gap-4 py-4">
                      <div className="space-y-4">
                        {/* Title Page and Page Numbers Section */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="includeTitlePage"
                              checked={pdfSettings.includeTitlePage}
                              onChange={(e) => handlePdfSettingsChange({ includeTitlePage: e.target.checked })}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="includeTitlePage" className="text-sm font-medium">
                              Include Title Page
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="includePageNumbers"
                              checked={pdfSettings.includePageNumbers}
                              onChange={(e) => handlePdfSettingsChange({ includePageNumbers: e.target.checked })}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="includePageNumbers" className="text-sm font-medium">
                              Include Page Numbers
                            </label>
                          </div>
                        </div>

                        {/* Page Number Settings */}
                        {pdfSettings.includePageNumbers && (
                          <div className="grid grid-cols-2 gap-4 pl-0">
                            <div>
                              <label className="text-xs text-muted-foreground">Format</label>
                              <Select
                                value={pdfSettings.pageNumberFormat.format}
                                onValueChange={(value) => handlePdfSettingsChange({
                                  pageNumberFormat: {
                                    ...pdfSettings.pageNumberFormat,
                                    format: value as 'Page X of Y' | 'X/Y' | 'X'
                                  }
                                })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Page X of Y">Page X of Y</SelectItem>
                                  <SelectItem value="X/Y">X/Y</SelectItem>
                                  <SelectItem value="X">X</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Position</label>
                              <Select
                                value={pdfSettings.pageNumberFormat.position}
                                onValueChange={(value) => handlePdfSettingsChange({
                                  pageNumberFormat: {
                                    ...pdfSettings.pageNumberFormat,
                                    position: value as 'bottom-center' | 'bottom-right' | 'bottom-left'
                                  }
                                })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select position" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bottom-center">Bottom Center</SelectItem>
                                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Margins Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Page Margins</label>
                            <div className="flex items-center gap-2">
                              <label className="text-sm">Unit:</label>
                              <Select
                                value={pdfSettings.margins.unit}
                                onValueChange={(value: 'in' | 'cm' | 'mm') => {
                                  const currentMargins = { ...pdfSettings.margins };
                                  let newMargins;
                                  
                                  // Convert current values to millimeters first
                                  const toMM = (val: number, fromUnit: 'in' | 'cm' | 'mm') => {
                                    switch (fromUnit) {
                                      case 'in': return val * 25.4;
                                      case 'cm': return val * 10;
                                      default: return val;
                                    }
                                  };

                                  // Convert from millimeters to target unit
                                  const fromMM = (val: number, toUnit: 'in' | 'cm' | 'mm') => {
                                    switch (toUnit) {
                                      case 'in': return Number((val / 25.4).toFixed(2));
                                      case 'cm': return Number((val / 10).toFixed(1));
                                      default: return Math.round(val);
                                    }
                                  };

                                  // Convert all values to the new unit
                                  const mmValues = {
                                    top: toMM(currentMargins.top, currentMargins.unit),
                                    right: toMM(currentMargins.right, currentMargins.unit),
                                    bottom: toMM(currentMargins.bottom, currentMargins.unit),
                                    left: toMM(currentMargins.left, currentMargins.unit)
                                  };

                                  newMargins = {
                                    ...currentMargins,
                                    top: fromMM(mmValues.top, value),
                                    right: fromMM(mmValues.right, value),
                                    bottom: fromMM(mmValues.bottom, value),
                                    left: fromMM(mmValues.left, value),
                                    unit: value
                                  };

                                  handlePdfSettingsChange({
                                    margins: newMargins
                                  });
                                }}
                              >
                                <SelectTrigger className="w-[60px]">
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="in">in</SelectItem>
                                  <SelectItem value="cm">cm</SelectItem>
                                  <SelectItem value="mm">mm</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                              <div key={side}>
                                <label className="text-xs text-muted-foreground capitalize">{side} Margin</label>
                                <input
                                  type="number"
                                  value={pdfSettings.margins[side]}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0) {
                                      handlePdfSettingsChange({
                                        margins: {
                                          ...pdfSettings.margins,
                                          [side]: value
                                        }
                                      });
                                    }
                                  }}
                                  min="0"
                                  step={pdfSettings.margins.unit === 'in' ? '0.1' : pdfSettings.margins.unit === 'cm' ? '0.1' : '1'}
                                  className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Custom Footer Section */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="enableCustomFooter"
                              checked={pdfSettings.customFooter.enabled}
                              onChange={(e) => handlePdfSettingsChange({
                                customFooter: {
                                  ...pdfSettings.customFooter,
                                  enabled: e.target.checked
                                }
                              })}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <label htmlFor="enableCustomFooter" className="text-sm font-medium">
                              Add Custom Footer
                            </label>
                          </div>

                          {pdfSettings.customFooter.enabled && (
                            <div className="space-y-3 pl-6">
                              <div>
                                <label htmlFor="footerText" className="text-xs text-muted-foreground">
                                  Footer Text
                                </label>
                                <input
                                  type="text"
                                  id="footerText"
                                  value={pdfSettings.customFooter.text}
                                  onChange={(e) => handlePdfSettingsChange({
                                    customFooter: {
                                      ...pdfSettings.customFooter,
                                      text: e.target.value
                                    }
                                  })}
                                  placeholder="Enter footer text"
                                  className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground block mb-2">Footer Alignment</label>
                                <div className="flex gap-4">
                                  {['left', 'center', 'right'].map((align) => (
                                    <div key={align} className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        id={`align${align}`}
                                        name="footerAlignment"
                                        checked={pdfSettings.customFooter.alignment === align}
                                        onChange={() => handlePdfSettingsChange({
                                          customFooter: {
                                            ...pdfSettings.customFooter,
                                            alignment: align as 'left' | 'center' | 'right'
                                          }
                                        })}
                                        className="text-primary focus:ring-primary"
                                      />
                                      <label htmlFor={`align${align}`} className="text-sm capitalize">
                                        {align}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Font Sizes Section */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium">Font Sizes</label>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { label: 'Heading 1', key: 'heading1' as keyof typeof pdfSettings.fontSizes, options: [16, 18, 20, 22, 24, 26, 28, 30] },
                              { label: 'Heading 2', key: 'heading2' as keyof typeof pdfSettings.fontSizes, options: [14, 16, 18, 20, 22, 24] },
                              { label: 'Heading 3', key: 'heading3' as keyof typeof pdfSettings.fontSizes, options: [12, 14, 16, 18, 20] },
                              { label: 'Paragraph', key: 'paragraph' as keyof typeof pdfSettings.fontSizes, options: [8, 9, 10, 11, 12, 13, 14, 16] },
                              { label: 'Footer', key: 'footer' as keyof typeof pdfSettings.fontSizes, options: [8, 9, 10, 11, 12] }
                            ].map(({ label, key, options }) => (
                              <div key={key}>
                                <label className="text-xs text-muted-foreground">{label}</label>
                                <Select
                                  value={pdfSettings.fontSizes[key].toString()}
                                  onValueChange={(value) => handlePdfSettingsChange({
                                    fontSizes: {
                                      ...pdfSettings.fontSizes,
                                      [key]: Number(value)
                                    }
                                  })}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select size" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {options.map((size) => (
                                      <SelectItem key={size} value={size.toString()}>
                                        {size}pt
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={() => setPdfSettingsOpen(false)}>
                      Apply Settings
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={handleExportPDF} className="flex items-center gap-2" disabled={isGeneratingPDF}>
                <FileDown className="h-4 w-4" />
                {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
              </Button>
              <Button onClick={handleSaveReport} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Report
              </Button>
            </div>
          </div>
  
          <Card>
            <CardContent className="pt-4">
              <div className="prose prose-sm max-w-none">
                <MenuBar editor={editor} charts={charts} />
                <Separator className="my-4" />
                <EditorContent
                  editor={editor}
                  className="prose prose-strong:text-inherit max-w-none min-h-[700px] overflow-y-auto pl-5 pr-5 pt-0 pb-0
                            [&.ProseMirror-focused]:outline-none
                            [&.ProseMirror-focused]:border-none
                            [&.ProseMirror-focused]:shadow-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }