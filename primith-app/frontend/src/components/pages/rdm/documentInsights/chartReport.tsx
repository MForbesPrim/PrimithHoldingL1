import { useEffect, useState, ReactElement } from "react"
import { ArrowLeft, Bold, Italic, List, ListOrdered, Heading2, ChevronDown, Save, BarChart, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useNavigate } from "react-router-dom"
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
} from "@/components/ui/dialog"

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
  groupByConfig: any;
  savedAt: string;
}

function renderChartContent(reportData: ChartReport): ReactElement {
  if (!reportData) {
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
  const axisColumn = columns.find(col => col.isAxisColumn);
  const axisKey = axisColumn?.key || Object.keys(chartData[0])[0];

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
  atom: true, // Makes the node a single unit

  addAttributes() {
    return {
      chartData: {
        default: null
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
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chart' })]
  },

  addNodeView() {
    return ({ node, editor }) => {
      const container = document.createElement('div')
      container.classList.add('chart-container', 'my-4', 'border', 'rounded-lg', 'p-4')
      container.style.height = '300px'

      // Get the chart data from the node's attributes or editor's storage
      const reportData = node.attrs.chartData || editor.storage.chart?.reportData

      if (reportData) {
        // Create a new container for Recharts
        const chartContainer = document.createElement('div')
        chartContainer.style.width = '100%'
        chartContainer.style.height = '100%'
        container.appendChild(chartContainer)

        // Log the chart data for debugging
        console.log('Chart data in node view:', reportData);

        // Create a deep clone of the report data to avoid any reference issues
        const clonedReportData = JSON.parse(JSON.stringify(reportData));

        // Render the chart using React
        const root = ReactDOM.createRoot(chartContainer)
        root.render(renderChartContent(clonedReportData))
      } else {
        container.textContent = 'No chart data available'
      }

      return {
        dom: container,
        destroy: () => {
          // Cleanup if needed
        },
      }
    }
  },
})

const MenuBar = ({ editor }: { editor: any }) => {
  const [savedCharts, setSavedCharts] = useState<ChartReport[]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Load saved charts from localStorage
    const loadSavedCharts = () => {
      const storedCharts = localStorage.getItem('savedCharts')
      if (storedCharts) {
        try {
          setSavedCharts(JSON.parse(storedCharts))
        } catch (error) {
          console.error('Error loading saved charts:', error)
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

  const handleInsertChart = (chart: ChartReport) => {
    if (editor) {
      // Create a deep clone of the chart data to avoid any reference issues
      const clonedChart = JSON.parse(JSON.stringify(chart));
      
      editor.chain().focus().insertContent({
        type: 'chart',
        attrs: {
          chartData: clonedChart
        }
      }).run()
  
      toast({
        title: "Chart Inserted",
        description: `Chart "${chart.name}" has been inserted into your report.`,
        duration: 2000,
      })
    }
  }

  if (!editor) {
    return null
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
          {savedCharts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-2">No saved charts found</p>
              <p className="text-sm text-muted-foreground">
                Create and save a chart first to insert it into your report.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 py-4">
              {savedCharts.map((chart, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleInsertChart(chart)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <h3 className="font-medium">{chart.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chart.chartType} Chart • {new Date(chart.savedAt).toLocaleDateString()}
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
  )
}

export function ChartReport() {
  const [reportData, setReportData] = useState<ChartReport | null>(null)
  const [reportName, setReportName] = useState<string>("Untitled Report")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

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
  })

  useEffect(() => {
    // Retrieve the report data from localStorage
    const storedData = localStorage.getItem('chartReport')
    const savedReport = localStorage.getItem('savedReport')

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        setReportData(parsedData)

        // If there's a saved report, restore its content and name
        if (savedReport) {
          const { content, name } = JSON.parse(savedReport)
          editor?.commands.setContent(content)
          if (name) {
            setReportName(name)
          }
        }
      } catch (error) {
        console.error('Error parsing report data:', error)
        toast({
          title: "Error",
          description: "Failed to load the chart report.",
          variant: "destructive",
          duration: 2000,
        })
      }
    } else {
      console.log("No report data found")
    }
  }, [editor])

  // Store the report data in the editor's storage when it's available
  useEffect(() => {
    if (editor && reportData) {
      editor.storage.chart = {
        reportData
      }
    }
  }, [editor, reportData])

  const handleBack = () => {
    navigate("/rdm/document-insights/chart-dashboard")
  }

  const handleSaveReport = () => {
    if (editor) {
      const content = editor.getHTML()
      // Save both the report content and chart data
      const reportToSave = {
        content,
        chartData: reportData,
        name: reportName
      }
      localStorage.setItem('savedReport', JSON.stringify(reportToSave))
      
      toast({
        title: "Report Saved",
        description: "Your report has been saved successfully.",
        duration: 2000,
      })
    }
  }

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    toast({ title: "Generating PDF...", description: "Preparing report...", duration: 5000 });
  
    let tempRenderContainer = null;
  
    try {
      // Get editor content
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
          // For chart nodes, create a placeholder with a unique ID
          const chartPlaceholder = document.createElement('div');
          chartPlaceholder.setAttribute('data-type', 'chart');
          chartPlaceholder.setAttribute('data-chart-id', `chart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
          chartPlaceholder.className = 'chart-container my-4 border rounded-lg p-4';
          chartPlaceholder.style.height = '300px';

          return chartPlaceholder;
        } else if (node.type === 'paragraph') {
          const p = document.createElement('p');
          if (node.content) {
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
        if (!reportData) {
          placeholder.innerHTML = '[Chart data not available]';
          continue;
        }
  
        const chartRenderDiv = document.createElement('div');
        chartRenderDiv.style.width = '100%';
        chartRenderDiv.style.height = '300px'; 
        chartRenderDiv.style.overflow = 'visible'; 
        placeholder.innerHTML = '';
        placeholder.appendChild(chartRenderDiv);
  
        // Render chart with a unique key
        const root = ReactDOM.createRoot(chartRenderDiv);
        root.render(renderChartContent(reportData));
        
        // Wait for chart rendering
        await new Promise(resolve => setTimeout(resolve, 2000));
  
        try {
          // Capture chart
          const canvas = await html2canvas(placeholder as HTMLElement, {
            scale: 2,
            useCORS: true,
            logging: true,
            background: '#ffffff',
          } as any);
          
          const imgDataUrl = canvas.toDataURL('image/png');
          
          // Create image
          const img = document.createElement('img');
          img.src = imgDataUrl;
          img.alt = `Chart (${reportData.chartType})`;
          img.style.width = '100%';
          img.style.maxWidth = '650px';
          img.style.display = 'block';
          img.style.margin = '1rem auto';
          
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
      
      // Use html2canvas to capture the entire content
      const contentCanvas = await html2canvas(tempRenderContainer, {
        scale: 2,
        useCORS: true,
        background: '#ffffff',
      } as any);
      
      const contentImgData = contentCanvas.toDataURL('image/png', 0.7);
      
      // Add content to PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = contentCanvas.width;
      const imgHeight = contentCanvas.height;
      
      // Calculate ratio
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight) * 0.9;
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      
      // Add image to PDF with compression options
      pdf.addImage(contentImgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio, '', 'FAST', 0);
      
      // Handle multi-page content if needed
      let heightLeft = imgHeight * ratio - pdfHeight + 20; // 20mm padding
      let position = pdfHeight - 20; // Initial position
      
      while (heightLeft > 0) {
        pdf.addPage();
        pdf.addImage(contentImgData, 'PNG', imgX, -(position), imgWidth * ratio, imgHeight * ratio, '', 'FAST', 0);
        heightLeft -= (pdfHeight - 20);
        position += (pdfHeight - 20);
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
    setReportName(e.target.value)
  }

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
              <MenuBar editor={editor} />
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
  )
} 
