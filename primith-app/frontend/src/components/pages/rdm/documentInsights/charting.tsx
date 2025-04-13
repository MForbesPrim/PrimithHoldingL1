import { useState } from "react"
import { Upload, ArrowLeft, BarChart, PieChart, LineChart, ArrowLeftRight, Layers, Waves, ChevronDown, Plus, Trash2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { useNavigate } from "react-router-dom"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart as RechartsBarChart,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Cell,
  Area,
  AreaChart,
  CartesianGrid
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Slider
} from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Sample data for demonstration
const sampleData = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 600 },
  { name: "Apr", value: 800 },
  { name: "May", value: 500 },
  { name: "Jun", value: 700 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

// Add type for chart styles
interface ChartStyles {
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
}

// Add interface for column definition
interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number';
}

export function Charting() {
  const [_file, _setFile] = useState<File | null>(null)
  const [isLoading, _setIsLoading] = useState(false)
  const [chartType, setChartType] = useState<string>("bar")
  const [chartData, setChartData] = useState<any[]>(sampleData)
  const [customData, setCustomData] = useState<string>("")
  const [originalData, setOriginalData] = useState<any[]>(sampleData)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [chartStyles, setChartStyles] = useState<ChartStyles>({
    colors: [...COLORS],
    strokeWidth: 2,
    barRadius: 4,
    showGrid: false,
    opacity: 0.8,
    fontSize: 12,
    gridStyle: 'dashed',
    gridDirection: 'both',
    showLegend: true,
    showSingleSeriesLegend: false
  })

  // Add state for columns
  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'value', label: 'Value', type: 'number' }
  ])

  const handleBack = () => {
    navigate("/rdm/document-insights")
  }

  const isDataValidForChartType = (data: any[], chartType: string): boolean => {
    if (!data || data.length === 0) return false;

    const firstRow = data[0];
    const numericColumns = Object.keys(firstRow).filter(key => {
      return key !== 'name' && typeof firstRow[key] === 'number';
    });

    // For stacked charts, check if data has multiple numeric columns
    if (["stacked-bar", "stacked-horizontal-bar", "stacked-area"].includes(chartType)) {
      return numericColumns.length > 1;
    }

    // For pie/donut charts, check if data has name and value columns
    if (["pie", "donut"].includes(chartType)) {
      return (
        (typeof firstRow.name === 'string' || typeof firstRow[Object.keys(firstRow)[0]] === 'string') &&
        numericColumns.length === 1
      );
    }

    // For single series charts (bar, line, area), check if data has at least one numeric column
    if (["bar", "horizontal-bar", "line", "area"].includes(chartType)) {
      return numericColumns.length >= 1;
    }

    // Default case
    return numericColumns.length >= 1;
  }

  const handleChartTypeChange = (value: string) => {
    setChartType(value);

    // If we have custom data (either from file or JSON input), validate it
    if (originalData !== sampleData && originalData !== sampleMultiData) {
      if (!isDataValidForChartType(originalData, value)) {
        toast({
          title: "Incompatible Chart Type",
          description: ["multiple-bar", "stacked-bar", "multiple-line"].includes(value)
            ? "This chart type requires multiple data series. Please select a compatible chart type."
            : ["pie", "donut"].includes(value)
            ? "This chart type requires name and value pairs. Please select a compatible chart type."
            : "Your data format is not compatible with this chart type. Please select a compatible chart type.",
          className: "border-l-2 border-l-red-500",
        });
      }
    } else {
      // If we're using sample data and there are no custom edits, switch between sample types
      const currentData = chartData;
      const isSampleData = JSON.stringify(currentData) === JSON.stringify(sampleData) || 
                          JSON.stringify(currentData) === JSON.stringify(sampleMultiData);
      
      if (isSampleData) {
        const newData = ["multiple-bar", "stacked-bar", "multiple-line", "stacked-area"].includes(value) 
          ? sampleMultiData 
          : sampleData;
        setChartData(newData);
        setOriginalData(newData);

        // Update columns based on the new data structure
        if (["multiple-bar", "stacked-bar", "multiple-line", "stacked-area"].includes(value)) {
          setColumns([
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'series1', label: 'Series 1', type: 'number' },
            { key: 'series2', label: 'Series 2', type: 'number' },
            { key: 'series3', label: 'Series 3', type: 'number' }
          ]);
        } else {
          setColumns([
            { key: 'name', label: 'Name', type: 'text' },
            { key: 'value', label: 'Value', type: 'number' }
          ]);
        }
      }
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      let fileContent = await selectedFile.text();
      let parsedData: any[];

      if (selectedFile.name.endsWith('.json')) {
        parsedData = JSON.parse(fileContent);
      } else if (selectedFile.name.endsWith('.csv')) {
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(header => header.trim()).filter(header => header);
        
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(value => value.trim());
          const row: any = {};
          
          headers.forEach((header, index) => {
            // Only add non-empty values
            if (values[index] && values[index] !== '') {
              // Try to convert to number if possible
              const numValue = Number(values[index]);
              row[header] = isNaN(numValue) ? values[index] : numValue;
            }
          });
          
          // Only include rows that have at least one non-empty value
          return Object.keys(row).length > 0 ? row : null;
        }).filter(row => row !== null);
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or JSON file.');
      }

      const { processedData, dataKeys } = processData(parsedData);
      setChartData(processedData);
      setOriginalData(parsedData);
      setCustomData(JSON.stringify(parsedData, null, 2));
      
      // Update columns based on the processed data
      if (processedData.length > 0) {
        const firstRow = processedData[0] as Record<string, any>;
        const newColumns: ColumnDef[] = [
          { key: 'name', label: 'Name', type: 'text' }
        ];
        
        // Add columns for each data key
        dataKeys.forEach(key => {
          newColumns.push({
            key,
            label: key,
            type: typeof firstRow[key] === 'number' ? 'number' : 'text'
          });
        });
        
        setColumns(newColumns);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process file',
        variant: 'destructive',
      });
    }
  };

  const handleApplyCustomData = () => {
    try {
      const parsedData = JSON.parse(customData);
      const { processedData, dataKeys } = processData(parsedData);
      setChartData(processedData);
      setOriginalData(parsedData);
      
      // Update columns based on the processed data
      if (processedData.length > 0) {
        const firstRow = processedData[0] as Record<string, any>;
        const newColumns: ColumnDef[] = [
          { key: 'name', label: 'Name', type: 'text' }
        ];
        
        // Add columns for each data key
        dataKeys.forEach(key => {
          newColumns.push({
            key,
            label: key,
            type: typeof firstRow[key] === 'number' ? 'number' : 'text'
          });
        });
        
        setColumns(newColumns);
      }
    } catch (error) {
      console.error('Error parsing custom data:', error);
      toast({
        title: 'Error',
        description: 'Invalid JSON data. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  // Sample multi-series data for demonstration
  const sampleMultiData = [
    { name: 'Jan', series1: 400, series2: 300, series3: 200 },
    { name: 'Feb', series1: 300, series2: 400, series3: 300 },
    { name: 'Mar', series1: 600, series2: 500, series3: 400 },
    { name: 'Apr', series1: 800, series2: 700, series3: 600 },
    { name: 'May', series1: 500, series2: 400, series3: 300 },
    { name: 'Jun', series1: 700, series2: 600, series3: 500 },
  ]

  const handleClearData = () => {
    // Reset file input by clearing its value
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    
    // Clear custom data textarea
    setCustomData('');
    
    // Reset both chart data and original data to sample data
    const newData = ["multiple-bar", "stacked-bar", "multiple-line"].includes(chartType) 
      ? sampleMultiData 
      : sampleData;
    setChartData(newData);
    setOriginalData(newData);
    
    // Show toast notification
    toast({
      title: "Data cleared",
      description: "Chart data has been reset to sample data.",
    });
  }

  const handleStyleChange = (key: keyof ChartStyles, value: ChartStyles[keyof ChartStyles]) => {
    console.log(`Setting ${key} to:`, value);
    setChartStyles(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Add function to handle adding a new column
  const handleAddColumn = () => {
    const newColumnKey = `column${columns.length + 1}`;
    setColumns([...columns, { key: newColumnKey, label: newColumnKey, type: 'number' }]);
    
    // Update existing data with the new column
    setChartData(prevData => prevData.map(row => ({
      ...row,
      [newColumnKey]: 0
    })));
  };

  // Add function to handle removing a column
  const handleRemoveColumn = (columnKey: string) => {
    if (columns.length <= 2) {
      toast({
        title: "Cannot Remove Column",
        description: "Chart must have at least two columns (name and value).",
        className: "border-l-2 border-l-red-500",
      });
      return;
    }
    
    setColumns(columns.filter(col => col.key !== columnKey));
    
    // Remove column from data
    setChartData(prevData => prevData.map(row => {
      const newRow = { ...row };
      delete newRow[columnKey];
      return newRow;
    }));
  };

  // Add function to handle column label changes
  const handleColumnLabelChange = (columnKey: string, newLabel: string) => {
    setColumns(columns.map(col => 
      col.key === columnKey ? { ...col, label: newLabel } : col
    ));
  };

  // Add function to handle column type changes
  const handleColumnTypeChange = (columnKey: string, newType: 'text' | 'number') => {
    setColumns(columns.map(col => 
      col.key === columnKey ? { ...col, type: newType } : col
    ));

    // Convert existing data if needed
    if (newType === 'number') {
      setChartData(prevData => prevData.map(row => ({
        ...row,
        [columnKey]: typeof row[columnKey] === 'string' ? parseFloat(row[columnKey]) || 0 : row[columnKey]
      })));
    }
  };

  const renderChart = () => {
    // Check if the current data (not original data) is compatible with the chart type
    if (!isDataValidForChartType(chartData, chartType)) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-center">
          <div>
            <p className="text-lg font-medium mb-2">Cannot display chart</p>
            <p className="text-sm">The current data format is not compatible with this chart type.</p>
            <p className="text-sm">Please select a different chart type or modify your data in the table editor.</p>
          </div>
        </div>
      );
    }

    // Determine the data keys for the chart
    const dataKeys = chartData.length > 0 ? Object.keys(chartData[0]).filter(key => key !== 'name') : ['value'];
    const nameKey = chartData.length > 0 && chartData[0].hasOwnProperty('name') ? 'name' : Object.keys(chartData[0])[0];

    // Create a mapping of data keys to their labels
    const keyToLabel = columns.reduce((acc, col) => ({
      ...acc,
      [col.key]: col.label
    }), {} as Record<string, string>);

    // For pie/donut charts, transform the data if it's not in the right format
    const pieChartData = (chartType === "pie" || chartType === "donut") 
      ? chartData.map(item => ({
          name: item[nameKey],
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
  
      switch (chartType) {
        case "bar":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                  <RechartsBarChart data={chartData}>
                    {gridComponent}
                    <XAxis
                      dataKey={nameKey}
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
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
                    {dataKeys.map((key, index) => (
                      <Bar
                        key={key}
                        name={keyToLabel[key] || key}
                        dataKey={key}
                        fill={chartStyles.colors[index % chartStyles.colors.length]}
                        radius={[chartStyles.barRadius, chartStyles.barRadius, 0, 0]}
                        fillOpacity={chartStyles.opacity}
                      />
                    ))}
                  </RechartsBarChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          )
  
        case "horizontal-bar":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                  <RechartsBarChart layout="vertical" data={chartData} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
                    {gridComponent}
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey={nameKey}
                      type="category"
                      tick={{ fontSize: chartStyles.fontSize }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
                    {dataKeys.map((key, index) => (
                      <Bar
                        key={key}
                        name={keyToLabel[key] || key}
                        dataKey={key}
                        fill={chartStyles.colors[index % chartStyles.colors.length]}
                        radius={[0, chartStyles.barRadius, chartStyles.barRadius, 0]}
                        fillOpacity={chartStyles.opacity}
                      />
                    ))}
                  </RechartsBarChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          )
  
        case "stacked-horizontal-bar":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                  <RechartsBarChart layout="vertical" data={chartData} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
                    {gridComponent}
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey={nameKey}
                      type="category"
                      tick={{ fontSize: chartStyles.fontSize }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
                    {dataKeys.map((key, index) => (
                      <Bar
                        key={key}
                        name={keyToLabel[key] || key}
                        dataKey={key}
                        fill={chartStyles.colors[index % chartStyles.colors.length]}
                        stackId="stack"
                        radius={[0, chartStyles.barRadius, chartStyles.barRadius, 0]}
                        fillOpacity={chartStyles.opacity}
                      />
                    ))}
                  </RechartsBarChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          )
  
        case "multiple-bar":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                  <RechartsBarChart data={chartData}>
                    {gridComponent}
                    <XAxis
                      dataKey={nameKey}
                      tick={{ fontSize: chartStyles.fontSize }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: chartStyles.fontSize }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
                    {dataKeys.map((key, index) => (
                      <Bar
                        key={key}
                        name={keyToLabel[key] || key}
                        dataKey={key}
                        fill={chartStyles.colors[index % chartStyles.colors.length]}
                        radius={[chartStyles.barRadius, chartStyles.barRadius, 0, 0]}
                        fillOpacity={chartStyles.opacity}
                      />
                    ))}
                  </RechartsBarChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          )
  
        case "stacked-bar":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                  <RechartsBarChart data={chartData}>
                    {gridComponent}
                    <XAxis
                      dataKey={nameKey}
                      tick={{ fontSize: chartStyles.fontSize }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: chartStyles.fontSize }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
                    {dataKeys.map((key, index) => (
                      <Bar
                        key={key}
                        name={keyToLabel[key] || key}
                        dataKey={key}
                        fill={chartStyles.colors[index % chartStyles.colors.length]}
                        stackId="stack"
                        radius={[chartStyles.barRadius, chartStyles.barRadius, 0, 0]}
                        fillOpacity={chartStyles.opacity}
                      />
                    ))}
                  </RechartsBarChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          )
  
        case "line":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                  <RechartsLineChart data={chartData}>
                    {gridComponent}
                    <XAxis
                      dataKey={nameKey}
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
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
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
              </ResponsiveContainer>
            </div>
          )
  
        case "pie":
        case "donut":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={{ value: { label: "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      innerRadius={chartType === "donut" ? 60 : 0}
                      outerRadius={150}
                      fill="var(--color-value)"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      opacity={chartStyles.opacity}
                    >
                      {pieChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartStyles.colors[index % chartStyles.colors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
                  </RechartsPieChart>
                </ChartContainer>
              </ResponsiveContainer>
            </div>
          )
  
        case "area":
        case "stacked-area":
          return (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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
                      dataKey={nameKey}
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
                    {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
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
              </ResponsiveContainer>
            </div>
          )
        default:
          return null
      }
    }

  const processData = (data: any[]) => {
    if (!data || data.length === 0) return { processedData: [], dataKeys: [] };

    // Get all unique keys from the data
    const allKeys = Array.from(
      new Set(data.flatMap((item) => Object.keys(item)))
    );

    // Find the category column (usually the first non-numeric column)
    const categoryColumn = allKeys.find(
      (key) =>
        typeof data[0][key] === 'string' ||
        key.toLowerCase().includes('name') ||
        key.toLowerCase().includes('category') ||
        key.toLowerCase().includes('label')
    ) || allKeys[0];

    // Get value columns (all columns except the category column)
    const valueColumns = allKeys.filter((key) => key !== categoryColumn);

    // Transform data to match the expected format
    const processedData = data.map((item) => ({
      name: item[categoryColumn],
      ...Object.fromEntries(
        valueColumns.map((key) => [key, item[key]])
      ),
    }));

    return {
      processedData,
      dataKeys: valueColumns,
    };
  };

  return (
    <div className="container mx-auto py-6 pr-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Data Visualization</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Data Source
              </CardTitle>
              <CardDescription>
                Upload a file or enter custom data for visualization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col space-y-4">
                  <div className="flex flex-col space-y-2">
                    <Label>Upload File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV or JSON file to visualize your data
                    </p>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Label>Custom JSON Data</Label>
                    <Textarea
                      placeholder={`Valid JSON example: [{"name":"Jan","value":400},{"name":"Feb","value":300},...]`}
                      value={customData}
                      onChange={(e) => setCustomData(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={handleClearData}
                        className="text-sm"
                      >
                        Clear Data
                      </Button>
                      <Button
                        onClick={handleApplyCustomData}
                        className="text-sm"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="chartType">Chart Type</Label>
                  <Select value={chartType} onValueChange={handleChartTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chart type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">
                        <div className="flex items-center gap-2">
                          <BarChart className="h-4 w-4" />
                          <span>Bar Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="horizontal-bar">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4" />
                          <span>Horizontal Bar</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stacked-horizontal-bar">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 rotate-90" />
                          <span>Stacked Horizontal Bar</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stacked-bar">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          <span>Stacked Vertical Bar</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="line">
                        <div className="flex items-center gap-2">
                          <LineChart className="h-4 w-4" />
                          <span>Line Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="area">
                        <div className="flex items-center gap-2">
                          <Waves className="h-4 w-4" />
                          <span>Area Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stacked-area">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          <span>Stacked Area</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pie">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4" />
                          <span>Pie Chart</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="donut">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4" />
                          <span>Donut Chart</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Chart Preview</CardTitle>
                  <CardDescription>
                    Visualize your data with interactive charts
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Chart Settings</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="colors" className="w-full">
                      <TabsList className="w-full">
                        <TabsTrigger value="colors" className="flex-1">Colors</TabsTrigger>
                        <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
                      </TabsList>
                      <TabsContent value="colors" className="space-y-4">
                        <div className="grid gap-4">
                          {chartStyles.colors.map((color, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Label>Color {index + 1}</Label>
                              <Input
                                type="color"
                                value={color}
                                onChange={(e) => {
                                  const newColors = [...chartStyles.colors];
                                  newColors[index] = e.target.value;
                                  handleStyleChange('colors', newColors);
                                }}
                                className="w-20 h-8 p-1"
                              />
                            </div>
                          ))}
                          <Button
                            onClick={() => {
                              const newColors = [...chartStyles.colors, '#000000'];
                              handleStyleChange('colors', newColors);
                            }}
                            variant="outline"
                            className="mt-2"
                          >
                            Add Color
                          </Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="style" className="space-y-4">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label>Stroke Width</Label>
                            <Slider
                              value={[chartStyles.strokeWidth]}
                              onValueChange={(values: number[]) => handleStyleChange('strokeWidth', values[0])}
                              min={1}
                              max={5}
                              step={0.5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bar Corner Radius</Label>
                            <Slider
                              value={[chartStyles.barRadius]}
                              onValueChange={(values: number[]) => handleStyleChange('barRadius', values[0])}
                              min={0}
                              max={8}
                              step={1}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Opacity</Label>
                            <Slider
                              value={[chartStyles.opacity * 100]}
                              onValueChange={(values: number[]) => handleStyleChange('opacity', values[0] / 100)}
                              min={20}
                              max={100}
                              step={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Font Size</Label>
                            <Slider
                              value={[chartStyles.fontSize]}
                              onValueChange={(values: number[]) => handleStyleChange('fontSize', values[0])}
                              min={8}
                              max={16}
                              step={1}
                            />
                          </div>
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Label>Show Grid</Label>
                                <Input
                                  type="checkbox"
                                  checked={chartStyles.showGrid}
                                  onChange={(e) => handleStyleChange('showGrid', e.target.checked)}
                                  className="w-4 h-4"
                                />
                              </div>
                              {chartStyles.showGrid && (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <Label>Style</Label>
                                    <Select
                                      value={chartStyles.gridStyle}
                                      onValueChange={(value: 'solid' | 'dashed') => 
                                        handleStyleChange('gridStyle', value)
                                      }
                                    >
                                      <SelectTrigger className="w-24">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="solid">Solid</SelectItem>
                                        <SelectItem value="dashed">Dashed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Label>Direction</Label>
                                    <Select
                                      value={chartStyles.gridDirection}
                                      onValueChange={(value: 'both' | 'horizontal' | 'vertical') => 
                                        handleStyleChange('gridDirection', value)
                                      }
                                    >
                                      <SelectTrigger className="w-28">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="both">Both</SelectItem>
                                        <SelectItem value="horizontal">Horizontal</SelectItem>
                                        <SelectItem value="vertical">Vertical</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center space-x-2">
                                <Label>Show Legend</Label>
                                <Input
                                  type="checkbox"
                                  checked={chartStyles.showLegend}
                                  onChange={(e) => handleStyleChange('showLegend', e.target.checked)}
                                  className="w-4 h-4"
                                />
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label>Show Single Series Legend</Label>
                                <Input
                                  type="checkbox"
                                  checked={chartStyles.showSingleSeriesLegend}
                                  onChange={(e) => handleStyleChange('showSingleSeriesLegend', e.target.checked)}
                                  className="w-4 h-4"
                                  disabled={!chartStyles.showLegend}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Spinner className="h-8 w-8" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {renderChart()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex justify-between p-4">
                  <span>Data Table Editor</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="flex flex-col gap-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const newRow = columns.reduce((acc, col) => ({
                              ...acc,
                              [col.key]: col.type === 'number' ? 0 : ''
                            }), {});
                            setChartData([...chartData, newRow]);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Row
                        </Button>
                        <Button
                          onClick={handleAddColumn}
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Column
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {columns.map((col) => (
                              <TableHead key={col.key} className="min-w-[150px]">
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={col.label}
                                    onChange={(e) => handleColumnLabelChange(col.key, e.target.value)}
                                    className="h-7 w-full"
                                  />
                                  <div className="flex items-center gap-1">
                                    <Select
                                      value={col.type}
                                      onValueChange={(value: 'text' | 'number') => 
                                        handleColumnTypeChange(col.key, value)
                                      }
                                    >
                                      <SelectTrigger className="h-7 w-[100px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="text">Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {col.key !== 'name' && col.key !== 'value' && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveColumn(col.key)}
                                        className="h-7 w-7"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="w-[50px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartData.map((row, index) => (
                            <TableRow key={index}>
                              {columns.map((col) => (
                                <TableCell key={col.key}>
                                  <Input
                                    type={col.type === 'number' ? 'number' : 'text'}
                                    value={row[col.key]}
                                    onChange={(e) => {
                                      const newData = [...chartData];
                                      newData[index] = {
                                        ...row,
                                        [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value
                                      };
                                      setChartData(newData);
                                    }}
                                  />
                                </TableCell>
                              ))}
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const newData = chartData.filter((_, i) => i !== index);
                                    setChartData(newData);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>
      </div>
    </div>
  )
} 