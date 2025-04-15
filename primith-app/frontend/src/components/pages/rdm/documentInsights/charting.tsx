import { useState, useEffect } from "react"
import { Upload, BarChart, PieChart, LineChart, ArrowLeftRight, Layers, Waves, ChevronDown, Plus, Trash2, Settings, Calculator, HelpCircle, Undo, Download, X, Group, Calendar as CalendarIcon, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Checkbox
} from "@/components/ui/checkbox"

// Sample data for demonstration
const sampleData = [
  { name: "Jan", value: 400 },
  { name: "Feb", value: 300 },
  { name: "Mar", value: 600 },
  { name: "Apr", value: 800 },
  { name: "May", value: 500 },
  { name: "Jun", value: 700 },
]

const COLOR_THEMES = {
  default: ["#1E293B", "#334155", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"] as string[], // Slate colors
  primary: ["#3B82F6", "#8B5CF6", "#14B8A6", "#7DD3FC", "#4ADE80", "#38BDF8"] as string[], // Previous default colors
  ocean: ["#006D77", "#83C5BE", "#EDF6F9", "#FFDDD2", "#E29578", "#006466"] as string[],
  forest: ["#2D6A4F", "#40916C", "#52B788", "#74C69D", "#95D5B2", "#B7E4C7"] as string[],
  berry: ["#7B2CBF", "#9D4EDD", "#C77DFF", "#E0AAFF", "#E6B8FF", "#ECC5FF"] as string[],
  earth: ["#553939", "#704F4F", "#A77979", "#C5B0B0", "#D4C1C1", "#E3D3D3"] as string[],
  neon: ["#FF0080", "#FF00FF", "#8000FF", "#0000FF", "#0080FF", "#00FFFF"] as string[],
  pastel: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFB3FF", "#FFE4B5"] as string[]
};

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
  colorTheme: keyof typeof COLOR_THEMES;
  useMultiColor: boolean;
  legendPosition: {
    vertical: 'top' | 'middle' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
    layout: 'horizontal' | 'vertical';
  };
}

// Add interface for column definition with formula support
interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'formula' | 'date';
  formula?: string;
  isAxisColumn?: boolean;  // New property to track axis column
}

// Add these new interfaces near the top with other interfaces
interface GroupByConfig {
  column: string;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
  dateFormat?: 'year' | 'month' | 'day' | 'quarter' | 'none';
}

// Add interface for data row type near the top with other interfaces
interface DataRow {
  [key: string]: string | number;
}

// Revised formula evaluation function
const evaluateFormula = (formula: string, rowData: any, allData: any[]): number => {
    try {
      // Enhanced debugging
      console.log("Evaluating formula:", {
        formula,
        rowData,
        availableColumns: Object.keys(rowData)
      });
      
      // If the formula is just a simple column reference like [columnName]
      if (formula.match(/^\[([^\]]+)\]$/)) {
        const columnName = formula.slice(1, -1); // Remove [ and ]
        console.log("Direct column reference detected:", columnName);
        
        if (!(columnName in rowData)) {
          console.warn(`Column "${columnName}" not found in row data:`, Object.keys(rowData));
          return 0;
        }
        
        const value = rowData[columnName];
        console.log("Direct column value:", value);
        
        if (typeof value === 'number') return value;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      
      let processedFormula = formula;
      const aggregateValues: { [key: string]: number } = {}; 

      // Handle aggregates first
      const aggregateRegex = /(SUM|AVG|MIN|MAX)\(\[([^\]]+)\]\)/g;
      let match;
      while ((match = aggregateRegex.exec(formula)) !== null) {
        const [fullMatch, funcName, colName] = match;
        if (!(fullMatch in aggregateValues)) {
          const values = allData
            .map(row => {
              const val = row[colName];
              return typeof val === 'number' ? val : parseFloat(val);
            })
            .filter(v => !isNaN(v));

          if (values.length === 0) {
            aggregateValues[fullMatch] = 0;
          } else {
            switch (funcName) {
              case 'SUM': aggregateValues[fullMatch] = values.reduce((sum, val) => sum + val, 0); break;
              case 'AVG': aggregateValues[fullMatch] = values.reduce((sum, val) => sum + val, 0) / values.length; break;
              case 'MIN': aggregateValues[fullMatch] = Math.min(...values); break;
              case 'MAX': aggregateValues[fullMatch] = Math.max(...values); break;
              default: aggregateValues[fullMatch] = 0;
            }
          }
          console.log(`Aggregate ${fullMatch} =`, aggregateValues[fullMatch]);
        }
      }

      // Replace aggregates
      for (const [key, value] of Object.entries(aggregateValues)) {
        const escaped = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        processedFormula = processedFormula.replace(new RegExp(escaped, 'g'), value.toString());
      }
      console.log("After aggregate replacement:", processedFormula);

      // Handle regular column references
      processedFormula = processedFormula.replace(/\[([^\]]+)\]/g, (_, colName) => {
        console.log("Processing column reference:", colName);
        
        if (!(colName in rowData)) {
          console.warn(`Column "${colName}" not found in:`, Object.keys(rowData));
          return '0';
        }
        
        const value = rowData[colName];
        console.log(`Column ${colName} value:`, value);
        
        if (typeof value === 'number') return value.toString();
        const parsed = parseFloat(value);
        return isNaN(parsed) ? '0' : parsed.toString();
      });
      
      console.log("Final formula to evaluate:", processedFormula);

      // Safety check
      if (!processedFormula.trim() || /[^-()\d/*+.\s]/g.test(processedFormula)) {
        console.warn("Invalid formula after processing:", processedFormula);
        return 0;
      }

      const result = new Function(`return ${processedFormula}`)();
      console.log("Evaluation result:", result);
      return typeof result === 'number' ? result : 0;
      
    } catch (error) {
      console.error("Formula evaluation error:", {
        error,
        formula,
        rowData
      });
      return 0;
    }
};

interface SavedChart {
  name: string;
  chartType: string;
  chartData: any[];
  chartStyles: any;
  columns: any[];
  groupByConfig: any;
  savedAt: string;
}

export function Charting({ chartName, savedChartData, originalSavedAt, viewOnly = false }: { 
  chartName?: string;
  savedChartData?: SavedChart;
  originalSavedAt?: string;
  viewOnly?: boolean;
}) {
  const [_file, _setFile] = useState<File | null>(null)
  const [isLoading, _setIsLoading] = useState(false)
  const [chartType, setChartType] = useState<string>("bar")
  const [chartData, setChartData] = useState<any[]>(sampleData)
  const [customData, setCustomData] = useState<string>("")
  const { toast } = useToast()
  const [chartStyles, setChartStyles] = useState<ChartStyles>({
    colors: [...COLOR_THEMES.default],
    strokeWidth: 2,
    barRadius: 4,
    showGrid: false,
    opacity: 0.8,
    fontSize: 12,
    gridStyle: 'dashed',
    gridDirection: 'both',
    showLegend: true,
    showSingleSeriesLegend: false,
    colorTheme: 'default',
    useMultiColor: true,
    legendPosition: {
      vertical: 'top',
      horizontal: 'center',
      layout: 'horizontal'
    }
  })

  // Add state for columns
  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'name', label: 'Name', type: 'text', isAxisColumn: true },
    { key: 'value', label: 'Value', type: 'number' }
  ])

  // Add state for formula mode
  const [formulaMode, setFormulaMode] = useState<{[key: string]: boolean}>({});
  const [formulaInput, setFormulaInput] = useState<{[key: string]: string}>({});

  // Add state to track which cells have formulas
  const [formulaCells, setFormulaCells] = useState<{[key: string]: string}>({});

  // Add state for column formula mode
  const [columnFormulaMode, setColumnFormulaMode] = useState<{[key: string]: boolean}>({});
  const [columnFormulaInput, setColumnFormulaInput] = useState<{[key: string]: string}>({});

  // Add state for storing previous column values
  const [columnHistory, setColumnHistory] = useState<{[key: string]: { values: any[], timestamp: number }}>({});

  // Add state for storing previous cell values
  const [cellHistory, setCellHistory] = useState<{[key: string]: { value: any, timestamp: number }}>({});

  // Add state for temporary column labels
  const [tempColumnLabels, setTempColumnLabels] = useState<{[key: string]: string}>({});

  // Add these new states in the Charting component
  const [groupByConfig, setGroupByConfig] = useState<GroupByConfig | null>(null);
  const [groupedData, setGroupedData] = useState<any[] | null>(null);
  const [showGroupBy, setShowGroupBy] = useState(false);

  // Add new state for axis sorting
  const [axisSorting, setAxisSorting] = useState<'none' | 'asc' | 'desc' | 'chronological'>('none');

  // Initialize state with saved chart data if available
  useEffect(() => {
    if (savedChartData) {
      setChartType(savedChartData.chartType);
      setChartData(savedChartData.chartData);
      setChartStyles(savedChartData.chartStyles);
      setColumns(savedChartData.columns);
      if (savedChartData.groupByConfig) {
        setGroupByConfig(savedChartData.groupByConfig);
      }
    }
  }, [savedChartData]);

  // Add sorting function
  const sortData = (data: any[]) => {
    if (!data || data.length === 0 || axisSorting === 'none') return data;
    
    const axisColumn = columns.find(col => col.isAxisColumn);
    const axisKey = axisColumn?.key || Object.keys(data[0])[0];

    return [...data].sort((a, b) => {
      const aVal = a[axisKey];
      const bVal = b[axisKey];

      if (axisSorting === 'asc') {
        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal;
        }
        // Handle string values
        return String(aVal).localeCompare(String(bVal));
      } else if (axisSorting === 'desc') {
        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return bVal - aVal;
        }
        // Handle string values
        return String(bVal).localeCompare(String(aVal));
      } else if (axisSorting === 'chronological') {
        const dateA = new Date(aVal);
        const dateB = new Date(bVal);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
      }
      return 0;
    });
  };

  // Add formula help content
  const formulaHelpContent = (
    <div className="max-w-xs text-gray-800">
      <h4 className="font-medium mb-2 text-gray-900">Formula Syntax</h4>
      <ul className="text-sm space-y-1">
        <li><strong className="text-gray-900">Column References:</strong> <span className="text-gray-800">[columnName]</span></li>
        <li><strong className="text-gray-900">Basic Math:</strong> <span className="text-gray-800">+, -, *, /, (, )</span></li>
        <li><strong className="text-gray-900">Functions:</strong></li>
        <li className="text-gray-800">SUM([columnName]) - Sum of all values in column</li>
        <li className="text-gray-800">AVG([columnName]) - Average of all values in column</li>
        <li className="text-gray-800">MIN([columnName]) - Minimum value in column</li>
        <li className="text-gray-800">MAX([columnName]) - Maximum value in column</li>
        <li><strong className="text-gray-900">Examples:</strong></li>
        <li className="text-gray-800">[value] * 2</li>
        <li className="text-gray-800">SUM([value]) / 5</li>
        <li className="text-gray-800">MAX([value]) - [value]</li>
      </ul>
    </div>
  );

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

    // Get numeric columns from current data
    const numericColumns = columns.filter(col => 
      col.type === 'number' && 
      col.key !== 'name' && 
      chartData.some(row => typeof row[col.key] === 'number' || !isNaN(Number(row[col.key])))
    );

    // Check compatibility based on chart type and available data series
    const isCompatible = (() => {
      // For stacked/multiple series charts
      if (["stacked-bar", "stacked-horizontal-bar", "multiple-bar", "stacked-area"].includes(value)) {
        return numericColumns.length > 1;
      }

      // For pie/donut charts
      if (["pie", "donut"].includes(value)) {
        const hasNameColumn = columns.some(col => col.key === 'name' || col.type === 'text');
        return hasNameColumn && numericColumns.length === 1;
      }

      // For single series charts (bar, horizontal-bar, line, area)
      return numericColumns.length >= 1;
    })();

    if (!isCompatible) {
      toast({
        title: "Incompatible Chart Type",
        description: ["stacked-bar", "stacked-horizontal-bar", "multiple-bar", "stacked-area"].includes(value)
          ? "This chart type requires multiple numeric columns. Please add more numeric columns or select a different chart type."
          : ["pie", "donut"].includes(value)
          ? "This chart type requires exactly one name column and one numeric value column. Please adjust your data or select a different chart type."
          : "This chart type requires at least one numeric column. Please add numeric data or select a different chart type.",
        className: "border-l-2 border-l-red-500",
      });
      return;
    }

    // Check if we're using sample data
    const isSampleData = JSON.stringify(chartData) === JSON.stringify(sampleData) || 
                        JSON.stringify(chartData) === JSON.stringify(sampleMultiData);
    
    if (isSampleData) {
      const newData = ["multiple-bar", "stacked-bar", "multiple-line", "stacked-area"].includes(value) 
        ? sampleMultiData 
        : sampleData;
      setChartData(newData);

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

  // Add helper function to detect if a value is a date
  const isValidDate = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    
    // Common date formats to check
    const datePatterns = [
      // ISO formats
      /^\d{4}-\d{2}-\d{2}$/,                           // YYYY-MM-DD
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/,           // YYYY-MM-DD HH:mm
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/,     // YYYY-MM-DD HH:mm:ss
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}.\d{3}Z?$/, // YYYY-MM-DD HH:mm:ss.sss
      
      // US formats
      /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,        // MM/DD/YYYY
      /^(0[1-9]|1[0-2])\-(0[1-9]|[12]\d|3[01])\-\d{4}$/,        // MM-DD-YYYY
      
      // European formats
      /^(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/,        // DD.MM.YYYY
      /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,        // DD/MM/YYYY
      /^(0[1-9]|[12]\d|3[01])\-(0[1-9]|1[0-2])\-\d{4}$/,        // DD-MM-YYYY
      
      // Other common formats
      /^\d{4}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/,        // YYYY/MM/DD
      /^\d{4}\.(0[1-9]|1[0-2])\.(0[1-9]|[12]\d|3[01])$/,        // YYYY.MM.DD
      
      // Short year formats
      /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{2}$/,        // MM/DD/YY
      /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{2}$/         // DD/MM/YY
    ];

    // Check if the value matches any of the date patterns
    if (!datePatterns.some(pattern => pattern.test(value))) {
      return false;
    }

    // Try parsing with different date parsing strategies
    const tryParsing = () => {
      // Direct new Date() parsing
      let date = new Date(value);
      if (!isNaN(date.getTime())) return true;

      // Try US format MM/DD/YYYY
      const [m1, d1, y1] = value.split('/');
      if (m1 && d1 && y1) {
        date = new Date(parseInt(y1), parseInt(m1) - 1, parseInt(d1));
        if (!isNaN(date.getTime())) return true;
      }

      // Try European format DD.MM.YYYY
      const [d2, m2, y2] = value.split('.');
      if (d2 && m2 && y2) {
        date = new Date(parseInt(y2), parseInt(m2) - 1, parseInt(d2));
        if (!isNaN(date.getTime())) return true;
      }

      // Try European format DD-MM-YYYY
      const [d3, m3, y3] = value.split('-');
      if (d3 && m3 && y3 && y3.length === 4) {
        date = new Date(parseInt(y3), parseInt(m3) - 1, parseInt(d3));
        if (!isNaN(date.getTime())) return true;
      }

      return false;
    };

    return tryParsing();
  };

  // Helper function to standardize date format
  const standardizeDate = (value: string): string => {
    if (!value) return value;

    let date: Date | null = null;

    // Try direct parsing first
    date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try US format MM/DD/YYYY
    const [m1, d1, y1] = value.split('/');
    if (m1 && d1 && y1) {
      date = new Date(parseInt(y1), parseInt(m1) - 1, parseInt(d1));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try European format DD.MM.YYYY
    const [d2, m2, y2] = value.split('.');
    if (d2 && m2 && y2) {
      date = new Date(parseInt(y2), parseInt(m2) - 1, parseInt(d2));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    // Try European format DD-MM-YYYY
    const [d3, m3, y3] = value.split('-');
    if (d3 && m3 && y3 && y3.length === 4) {
      date = new Date(parseInt(y3), parseInt(m3) - 1, parseInt(d3));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }

    return value;
  };

  // Add helper function to detect column type
  const detectColumnType = (values: any[]): 'text' | 'number' | 'date' => {
    // Filter out null/undefined/empty values
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (validValues.length === 0) return 'text';

    // Check for dates first
    if (validValues.some(value => isValidDate(value))) {
      // If more than 30% of valid values are dates, consider it a date column
      const dateCount = validValues.filter(value => isValidDate(value)).length;
      if (dateCount / validValues.length > 0.3) {
        return 'date';
      }
    }

    // Check for numbers
    const numberCount = validValues.filter(value => !isNaN(Number(value))).length;
    if (numberCount / validValues.length > 0.7) {
      return 'number';
    }

    return 'text';
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      // Reset sorting when loading new file
      resetSorting();
      
      let fileContent = await selectedFile.text();
      let parsedData: any[];

      if (selectedFile.name.endsWith('.json')) {
        parsedData = JSON.parse(fileContent);
        // For JSON, use the first object's keys to create columns
        if (parsedData.length > 0) {
          const firstRow = parsedData[0];
          const newColumns: ColumnDef[] = Object.keys(firstRow).map((key, index) => {
            // Get all values for this column to detect type
            const columnValues = parsedData.map(row => row[key]);
            const detectedType = detectColumnType(columnValues);
            
            return {
              key,
              label: key,
              type: detectedType,
              isAxisColumn: index === 0
            };
          });
          setColumns(newColumns);
        }
      } else if (selectedFile.name.endsWith('.csv')) {
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(header => header.trim()).filter(header => header);
        
        // Parse CSV data
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(value => value.trim());
          const row: any = {};
          
          headers.forEach((header, index) => {
            if (values[index] && values[index] !== '') {
              row[header] = values[index];
            }
          });
          
          return Object.keys(row).length > 0 ? row : null;
        }).filter(row => row !== null);

        // Create columns from CSV headers with type detection
        const newColumns: ColumnDef[] = headers.map((header, index) => {
          // Get all values for this column to detect type
          const columnValues = parsedData.map(row => row[header]);
          const detectedType = detectColumnType(columnValues);
          
          return {
            key: header,
            label: header,
            type: detectedType,
            isAxisColumn: index === 0
          };
        });
        setColumns(newColumns);

        // Convert values based on detected types
        parsedData = parsedData.map(row => {
          const newRow = { ...row };
          newColumns.forEach(col => {
            if (col.type === 'number') {
              newRow[col.key] = Number(row[col.key]);
            } else if (col.type === 'date') {
              newRow[col.key] = standardizeDate(row[col.key]);
            }
          });
          return newRow;
        });
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or JSON file.');
      }

      setChartData(parsedData);
      setCustomData(JSON.stringify(parsedData, null, 2));

      toast({
        title: "File Uploaded Successfully",
        description: `${selectedFile.name} has been loaded.`,
        duration: 2000,
      });

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
      
      // Update columns based on the processed data
      if (processedData.length > 0) {
        const firstRow = processedData[0] as Record<string, any>;
        const newColumns: ColumnDef[] = [
          { key: 'name', label: 'Name', type: 'text' }
        ];
        
        dataKeys.forEach(key => {
          newColumns.push({
            key,
            label: key,
            type: typeof firstRow[key] === 'number' ? 'number' : 'text'
          });
        });
        
        setColumns(newColumns);
      }

      toast({
        title: "Custom Data Applied",
        description: "Your JSON data has been loaded successfully.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error parsing custom data:', error);
      toast({
        title: 'Error',
        description: 'Invalid JSON data. Please check the format.',
        variant: 'destructive',
        duration: 2000,
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
    
    // Reset chart data to sample data based on current chart type
    const newData = ["multiple-bar", "stacked-bar", "multiple-line"].includes(chartType) 
      ? sampleMultiData 
      : sampleData;
    setChartData(newData);
    
    // Reset columns based on sample data type
    if (["multiple-bar", "stacked-bar", "multiple-line"].includes(chartType)) {
      setColumns([
        { key: 'name', label: 'Name', type: 'text', isAxisColumn: true },
        { key: 'series1', label: 'Series 1', type: 'number' },
        { key: 'series2', label: 'Series 2', type: 'number' },
        { key: 'series3', label: 'Series 3', type: 'number' }
      ]);
    } else {
      setColumns([
        { key: 'name', label: 'Name', type: 'text', isAxisColumn: true },
        { key: 'value', label: 'Value', type: 'number' }
      ]);
    }

    // Reset sorting to none
    resetSorting();
  };

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

  // Handle temporary label changes while typing
  const handleColumnLabelInput = (columnKey: string, newLabel: string) => {
    setTempColumnLabels(prev => ({
      ...prev,
      [columnKey]: newLabel
    }));
  };

  // Finalize column label change on blur
  const handleColumnLabelBlur = (columnKey: string) => {
    const newLabel = tempColumnLabels[columnKey];
    if (!newLabel || newLabel === columns.find(col => col.key === columnKey)?.label) {
      return;
    }

    // Get the column being renamed
    const column = columns.find(col => col.key === columnKey);
    const isAxisColumn = column?.isAxisColumn;

    // Update columns array with new label
    const updatedColumns = columns.map(col => 
      col.key === columnKey ? { ...col, key: newLabel.toLowerCase(), label: newLabel } : col
    );
    setColumns(updatedColumns);

    // Update chart data to use new column key
    setChartData(prevData => prevData.map(row => {
      const newRow = { ...row };
      if (columnKey in newRow) {
        const value = newRow[columnKey];
        delete newRow[columnKey];
        newRow[newLabel.toLowerCase()] = value;
      }
      return newRow;
    }));

    // Update formula cells with new column key
    setFormulaCells(prev => {
      const newFormulaCells: {[key: string]: string} = {};
      Object.entries(prev).forEach(([key, formula]) => {
        const newFormula = formula.replace(
          new RegExp(`\\[${columnKey}\\]`, 'g'),
          `[${newLabel.toLowerCase()}]`
        );
        newFormulaCells[key.replace(columnKey, newLabel.toLowerCase())] = newFormula;
      });
      return newFormulaCells;
    });

    // Update formula inputs with new column key
    setFormulaInput(prev => {
      const newFormulaInput: {[key: string]: string} = {};
      Object.entries(prev).forEach(([key, formula]) => {
        const newFormula = formula.replace(
          new RegExp(`\\[${columnKey}\\]`, 'g'),
          `[${newLabel.toLowerCase()}]`
        );
        newFormulaInput[key.replace(columnKey, newLabel.toLowerCase())] = newFormula;
      });
      return newFormulaInput;
    });

    // Clear temporary label
    setTempColumnLabels(prev => {
      const newTemp = { ...prev };
      delete newTemp[columnKey];
      return newTemp;
    });

    // Show toast if renaming axis column
    if (isAxisColumn) {
      toast({
        title: "Axis Labels Column Updated",
        description: `The axis labels column has been renamed to "${newLabel}". This column will still be used for chart axis labels.`,
      });
    }
  };

  // Add function to handle column type changes
  const handleColumnTypeChange = (columnKey: string, newType: 'text' | 'number' | 'date') => {
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

  // Modify handleFormulaInput to include history tracking
  const handleFormulaInput = (rowIndex: number, columnKey: string, formula: string) => {
    const cellKey = `${rowIndex}-${columnKey}`;
    
    // Store current value before applying formula if not already stored
    if (!cellHistory[cellKey] || cellHistory[cellKey].timestamp < Date.now() - 30000) { // 30 seconds expiry
      setCellHistory(prev => ({
        ...prev,
        [cellKey]: {
          value: chartData[rowIndex][columnKey],
          timestamp: Date.now()
        }
      }));
    }
    
    // Update formula input state
    setFormulaInput(prev => ({
      ...prev,
      [cellKey]: formula
    }));
    
    try {
      // Update the data with the calculated value
      const newData = [...chartData];
      const result = evaluateFormula(formula, newData[rowIndex], newData);
      newData[rowIndex] = {
        ...newData[rowIndex],
        [columnKey]: result
      };
      setChartData(newData);
      
      // Track which cells have formulas
      if (formula.trim()) {
        setFormulaCells(prev => ({
          ...prev,
          [cellKey]: formula
        }));
      } else {
        // Remove formula tracking if formula is empty
        const newFormulaCells = {...formulaCells};
        delete newFormulaCells[cellKey];
        setFormulaCells(newFormulaCells);
      }
    } catch (error) {
      console.error('Error applying cell formula:', error);
      toast({
        title: "Formula Error",
        description: "There was an error applying the formula. Please check your formula syntax.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };
  
  // Add function to handle undo cell formula
  const handleUndoCellFormula = (rowIndex: number, columnKey: string) => {
    const cellKey = `${rowIndex}-${columnKey}`;
    const history = cellHistory[cellKey];
    
    if (history && history.timestamp > Date.now() - 30000) { // 30 seconds undo window
      // Restore the previous value
      const newData = [...chartData];
      newData[rowIndex] = {
        ...newData[rowIndex],
        [columnKey]: history.value
      };
      setChartData(newData);
      
      // Clear formula tracking for this cell
      const newFormulaCells = {...formulaCells};
      delete newFormulaCells[cellKey];
      setFormulaCells(newFormulaCells);
      
      // Clear formula input
      setFormulaInput(prev => {
        const newInputs = {...prev};
        delete newInputs[cellKey];
        return newInputs;
      });
      
      // Clear cell history
      setCellHistory(prev => {
        const newHistory = {...prev};
        delete newHistory[cellKey];
        return newHistory;
      });
      
      // Exit formula mode
      setFormulaMode(prev => ({
        ...prev,
        [cellKey]: false
      }));
      
      toast({
        title: "Changes Undone",
        description: "Cell value has been restored to its previous state.",
        duration: 2000,
      });
    } else {
      toast({
        title: "Cannot Undo",
        description: "Undo is only available for 30 seconds after applying a formula.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Add function to handle column formula input
  const handleColumnFormulaInput = (columnKey: string, formula: string) => {
    // Store current values before applying formula if not already stored
    if (!columnHistory[columnKey] || columnHistory[columnKey].timestamp < Date.now() - 30000) { // 30 seconds expiry
      setColumnHistory(prev => ({
        ...prev,
        [columnKey]: {
          values: chartData.map(row => ({ ...row })),
          timestamp: Date.now()
        }
      }));
    }
    
    // Update column formula input state
    setColumnFormulaInput(prev => ({
      ...prev,
      [columnKey]: formula
    }));
    
    try {
      // Apply the formula to all rows in the column
      const newData = chartData.map((row) => {
        const result = evaluateFormula(formula, row, chartData);
        return {
          ...row,
          [columnKey]: result
        };
      });
      
      setChartData(newData);
      
      // Track which columns have formulas
      if (formula.trim()) {
        setFormulaCells(prev => {
          const newFormulaCells = {...prev};
          // Add formula to all cells in this column
          chartData.forEach((_, rowIndex) => {
            newFormulaCells[`${rowIndex}-${columnKey}`] = formula;
          });
          return newFormulaCells;
        });
      } else {
        // Remove formula tracking if formula is empty
        const newFormulaCells = {...formulaCells};
        chartData.forEach((_, rowIndex) => {
          delete newFormulaCells[`${rowIndex}-${columnKey}`];
        });
        setFormulaCells(newFormulaCells);
      }
    } catch (error) {
      console.error('Error applying column formula:', error);
      toast({
        title: "Formula Error",
        description: "There was an error applying the formula. Please check your formula syntax.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };
  
  // Add function to toggle column formula mode
  const toggleColumnFormulaMode = (columnKey: string) => {
    setColumnFormulaMode(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Add function to handle undo column formula
  const handleUndoColumnFormula = (columnKey: string) => {
    const history = columnHistory[columnKey];
    if (history && history.timestamp > Date.now() - 30000) { // 30 seconds undo window
      setChartData(history.values);
      
      // Clear formula tracking for this column
      const newFormulaCells = {...formulaCells};
      chartData.forEach((_, rowIndex) => {
        delete newFormulaCells[`${rowIndex}-${columnKey}`];
      });
      setFormulaCells(newFormulaCells);
      
      // Clear column formula input
      setColumnFormulaInput(prev => {
        const newInputs = {...prev};
        delete newInputs[columnKey];
        return newInputs;
      });
      
      // Clear column history
      setColumnHistory(prev => {
        const newHistory = {...prev};
        delete newHistory[columnKey];
        return newHistory;
      });
      
      // Exit formula mode
      setColumnFormulaMode(prev => ({
        ...prev,
        [columnKey]: false
      }));
      
      toast({
        title: "Changes Undone",
        description: "Column values have been restored to their previous state.",
      });
    } else {
      toast({
        title: "Cannot Undo",
        description: "Undo is only available for 30 seconds after applying a formula.",
        variant: "destructive",
      });
    }
  };

  // Add function to toggle formula mode
  const toggleFormulaMode = (rowIndex: number, columnKey: string) => {
    const cellKey = `${rowIndex}-${columnKey}`;
    setFormulaMode(prev => ({
      ...prev,
      [cellKey]: !prev[cellKey]
    }));
  };

  const formatDate = (date: string | number, format: 'year' | 'month' | 'day' | 'quarter' | 'none'): string => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return String(date);
        
      switch (format) {
        case 'year':
          return d.getFullYear().toString();
        case 'month':
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        case 'day':
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        case 'quarter':
          const quarter = Math.floor(d.getMonth() / 3) + 1;
          return `${d.getFullYear()}-Q${quarter}`;
        default:
          return String(date);
      }
    } catch {
      return String(date);
    }
  };

  // Update handleGroupBy to use the latest data
  const handleGroupBy = (config: GroupByConfig) => {
    if (!config.column) {
      setGroupedData(null);
      setGroupByConfig(null);
      return;
    }

    // Set the selected column as the axis column
    setColumns(prevColumns => prevColumns.map(col => ({
      ...col,
      isAxisColumn: col.key === config.column
    })));

    const groups = new Map<string, any[]>();
    
    // Group the data
    chartData.forEach(row => {
      const groupValue = config.dateFormat 
        ? formatDate(row[config.column], config.dateFormat)
        : String(row[config.column]);
      
      if (!groups.has(groupValue)) {
        groups.set(groupValue, []);
      }
      groups.get(groupValue)!.push(row);
    });

    // Aggregate the groups
    let aggregatedData = Array.from(groups.entries()).map(([groupValue, rows]) => {
      const result: any = {
        [config.column]: groupValue
      };

      // For each numeric column, apply the aggregation
      columns.forEach(col => {
        if (col.type === 'number' && col.key !== config.column) {
          const values = rows.map(row => Number(row[col.key])).filter(v => !isNaN(v));
          
          if (values.length > 0) {
            switch (config.aggregation) {
              case 'sum':
                result[col.key] = values.reduce((a, b) => a + b, 0);
                break;
              case 'average':
                result[col.key] = values.reduce((a, b) => a + b, 0) / values.length;
                break;
              case 'count':
                result[col.key] = values.length;
                break;
              case 'min':
                result[col.key] = Math.min(...values);
                break;
              case 'max':
                result[col.key] = Math.max(...values);
                break;
            }
          } else {
            result[col.key] = 0;
          }
        }
      });

      return result;
    });

    // Apply sorting if enabled
    aggregatedData = sortData(aggregatedData);

    setGroupedData(aggregatedData);
    setGroupByConfig(config);
  };

  // Add this function to clear grouping
  const clearGrouping = () => {
    setGroupedData(null);
    setGroupByConfig(null);
    toast({
      title: "Grouping Cleared",
      description: "Showing original ungrouped data.",
      duration: 2000,
    });
  };

  // Update renderChart to use sorted data
  const renderChart = () => {
    // Get the current data to use for rendering
    let currentData = groupedData || chartData;
    
    // Apply sorting to the data
    currentData = sortData(currentData);

    // Check if the current data is compatible with the chart type
    if (!isDataValidForChartType(currentData, chartType)) {
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

    // Find the axis column and get its key
    const axisColumn = columns.find(col => col.isAxisColumn);
    const axisKey = axisColumn?.key || Object.keys(currentData[0])[0];

    // Determine the data keys for the chart (all numeric columns except the axis column)
    const dataKeys = columns
      .filter(col => col.type === 'number' && !col.isAxisColumn)
      .map(col => col.key);

    // Create a mapping of data keys to their labels
    const keyToLabel = columns.reduce((acc, col) => ({
      ...acc,
      [col.key]: col.label
    }), {} as Record<string, string>);

    // For pie/donut charts, transform the data if it's not in the right format
    const pieChartData = (chartType === "pie" || chartType === "donut") 
      ? currentData.map(item => ({
          name: item[axisKey],
          value: typeof item.value === 'number' ? item.value : Number(item[dataKeys[0]])
        }))
      : currentData;

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
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <RechartsBarChart data={currentData} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
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
                      verticalAlign={chartStyles.legendPosition.vertical}
                      align={chartStyles.legendPosition.horizontal}
                      layout={chartStyles.legendPosition.layout}
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
                      {chartStyles.useMultiColor && dataKeys.length === 1 && currentData.map((_, entryIndex) => (
                        <Cell
                          key={`cell-${entryIndex}`}
                          fill={chartStyles.colors[entryIndex % chartStyles.colors.length]}
                        />
                      ))}
                    </Bar>
                  ))}
                </RechartsBarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )
  
      case "horizontal-bar":
        return (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <RechartsBarChart layout="vertical" data={currentData} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
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
                  {chartStyles.showLegend && (dataKeys.length > 1 || chartStyles.showSingleSeriesLegend) && <Legend />}
                  {dataKeys.map((key, index) => (
                    <Bar
                      key={key}
                      name={keyToLabel[key] || key}
                      dataKey={key}
                      fill={chartStyles.colors[index % chartStyles.colors.length]}
                      radius={[0, chartStyles.barRadius, chartStyles.barRadius, 0]}
                      fillOpacity={chartStyles.opacity}
                    >
                      {chartStyles.useMultiColor && dataKeys.length === 1 && currentData.map((_, entryIndex) => (
                        <Cell
                          key={`cell-${entryIndex}`}
                          fill={chartStyles.colors[entryIndex % chartStyles.colors.length]}
                        />
                      ))}
                    </Bar>
                  ))}
                </RechartsBarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )
  
      case "stacked-horizontal-bar":
        return (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <RechartsBarChart layout="vertical" data={currentData} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
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
                    >
                      {chartStyles.useMultiColor && dataKeys.length === 1 && currentData.map((_, entryIndex) => (
                        <Cell
                          key={`cell-${entryIndex}`}
                          fill={chartStyles.colors[entryIndex % chartStyles.colors.length]}
                        />
                      ))}
                    </Bar>
                  ))}
                </RechartsBarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )
  
      case "multiple-bar":
        return (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <RechartsBarChart data={currentData}>
                  {gridComponent}
                  <XAxis
                    dataKey={axisKey}
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
                    >
                      {chartStyles.useMultiColor && dataKeys.length === 1 && currentData.map((_, entryIndex) => (
                        <Cell
                          key={`cell-${entryIndex}`}
                          fill={chartStyles.colors[entryIndex % chartStyles.colors.length]}
                        />
                      ))}
                    </Bar>
                  ))}
                </RechartsBarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )
  
      case "stacked-bar":
        return (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <RechartsBarChart data={currentData}>
                  {gridComponent}
                  <XAxis
                    dataKey={axisKey}
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
                    >
                      {chartStyles.useMultiColor && dataKeys.length === 1 && currentData.map((_, entryIndex) => (
                        <Cell
                          key={`cell-${entryIndex}`}
                          fill={chartStyles.colors[entryIndex % chartStyles.colors.length]}
                        />
                      ))}
                    </Bar>
                  ))}
                </RechartsBarChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )
  
      case "line":
        return (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <RechartsLineChart data={currentData} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
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
                      verticalAlign={chartStyles.legendPosition.vertical}
                      align={chartStyles.legendPosition.horizontal}
                      layout={chartStyles.legendPosition.layout}
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
            </ResponsiveContainer>
          </div>
        )
  
      case "pie":
      case "donut":
        return (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <RechartsPieChart margin={{ top: 40, right: 20, bottom: 30, left: 20 }}>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    innerRadius={chartType === "donut" ? 60 : 0}
                    outerRadius={100}
                    fill="var(--color-value)"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    style={{
                      fontSize: `${chartStyles.fontSize}px`
                    }}
                    opacity={chartStyles.opacity}
                  >
                    {pieChartData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartStyles.useMultiColor 
                          ? chartStyles.colors[index % chartStyles.colors.length]
                          : chartStyles.colors[0]
                        }
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {chartStyles.showLegend && (
                    <Legend
                      verticalAlign={chartStyles.legendPosition.vertical}
                      align={chartStyles.legendPosition.horizontal}
                      layout={chartStyles.legendPosition.layout}
                      wrapperStyle={{
                        fontSize: `${chartStyles.fontSize}px`,
                        padding: '10px'
                      }}
                    />
                  )}
                </RechartsPieChart>
              </ChartContainer>
            </ResponsiveContainer>
          </div>
        )
  
      case "area":
      case "stacked-area":
        return (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
                <AreaChart
                  data={currentData}
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
                      verticalAlign={chartStyles.legendPosition.vertical}
                      align={chartStyles.legendPosition.horizontal}
                      layout={chartStyles.legendPosition.layout}
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

  // Add color theme preview component
  const ColorThemePreview = ({ colors, selected }: { colors: string[], selected: boolean }) => (
    <div className={`flex gap-1 p-1 rounded-md ${selected ? 'ring-2 ring-primary' : 'hover:bg-accent'}`}>
      {colors.slice(0, 6).map((color, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-sm"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  // Update the handleExportCSV function with proper typing
  const handleExportCSV = () => {
    try {
      // Create CSV header row using column labels
      const headers = columns.map(col => col.label).join(',');
      
      // Get the current data to export (grouped or original)
      const currentData = groupedData || chartData;
      
      // Create CSV rows from data with proper typing
      const rows = currentData.map((row: DataRow) => 
        columns.map(col => {
          const value = row[col.key];
          // Handle values that might contain commas by wrapping in quotes
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      );
      
      // Rest of the function remains the same
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'chart_data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "Your data has been exported to CSV format.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Add this function in the Charting component
  const handleSetAxisColumn = (columnKey: string) => {
    // Update columns to set the new axis column
    setColumns(prevColumns => prevColumns.map(col => ({
      ...col,
      isAxisColumn: col.key === columnKey
    })));

    toast({
      title: "Axis Column Changed",
      description: `Column "${columns.find(col => col.key === columnKey)?.label}" will now be used for chart axis labels.`,
    });
  };

  // Update useEffect to regroup data when chartData changes
  useEffect(() => {
    if (groupByConfig) {
      handleGroupBy(groupByConfig);
    }
  }, [chartData]);

  // Add function to reset sorting
  const resetSorting = () => {
    setAxisSorting('none');
    if (groupByConfig) {
      handleGroupBy(groupByConfig);
    }
  };

  // Add function to parse stored date string
  const parseStoredDate = (dateStr: string | null) => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Update renderCell to use the new parse function
  const renderCell = (row: any, rowIndex: number, col: ColumnDef) => {
    if (formulaMode[`${rowIndex}-${col.key}`]) {
      return (
        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <Input
              type="text"
              value={formulaInput[`${rowIndex}-${col.key}`] || ''}
              onChange={(e) => handleFormulaInput(rowIndex, col.key, e.target.value)}
              placeholder="Enter formula (e.g., [value]*2)"
              className="h-8 bg-blue-50 border-blue-200"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <span className="text-xs text-blue-500 font-medium">fx</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-white border-gray-200 shadow-md">
                  {formulaHelpContent}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {cellHistory[`${rowIndex}-${col.key}`] && 
             cellHistory[`${rowIndex}-${col.key}`].timestamp > Date.now() - 30000 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUndoCellFormula(rowIndex, col.key)}
                      className="h-8 w-8"
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Undo formula changes (available for 30 seconds)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => toggleFormulaMode(rowIndex, col.key)}
              className="h-8 w-8"
            >
              <Calculator className="h-4 w-4 text-blue-500" />
            </Button>
          </div>
        </div>
      );
    }

    if (col.type === 'date') {
      return (
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-8",
                  !row[col.key] && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {row[col.key] ? row[col.key] : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseStoredDate(row[col.key])}
                onSelect={(date) => handleDateChange(date, rowIndex, col.key)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          <Input
            type={col.type === 'number' ? 'number' : 'text'}
            value={row[col.key]}
            onChange={(e) => {
              const newData = [...chartData];
              newData[rowIndex] = {
                ...row,
                [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value
              };
              setChartData(newData);
            }}
            className={`h-8 ${formulaCells[`${rowIndex}-${col.key}`] ? 'bg-blue-50 border-blue-200 pr-8' : ''}`}
          />
          {formulaCells[`${rowIndex}-${col.key}`] && (
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <span className="text-xs text-blue-500 font-medium">fx</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="flex flex-col gap-1.5 rounded-md border bg-popover p-2 text-popover-foreground shadow-md"
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      Formula:
                    </div>
                    <div className="rounded-sm bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
                      {formulaCells[`${rowIndex}-${col.key}`]}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        {col.type === 'number' && (
          <Button
            variant={formulaCells[`${rowIndex}-${col.key}`] ? "secondary" : "ghost"}
            size="icon"
            onClick={() => toggleFormulaMode(rowIndex, col.key)}
            className="h-8 w-8"
          >
            <Calculator className={`h-4 w-4 ${formulaCells[`${rowIndex}-${col.key}`] ? 'text-blue-500' : ''}`} />
          </Button>
        )}
      </div>
    );
  };

  // Update handleDateChange to store date in consistent format
  const handleDateChange = (date: Date | undefined, rowIndex: number, columnKey: string) => {
    if (!date) return;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    const newData = [...chartData];
    newData[rowIndex] = {
      ...newData[rowIndex],
      [columnKey]: formattedDate
    };
    setChartData(newData);
  };

  const handleSaveChart = () => {
    if (!chartData.length || !columns.length) {
      toast({
        title: "Cannot Save Chart",
        description: "Please add some data and configure columns before saving.",
        variant: "destructive",
      })
      return
    }

    // Get existing saved charts
    const existingSavedCharts = JSON.parse(localStorage.getItem('savedCharts') || '[]')
    
    const chartToSave = {
      name: chartName || 'Untitled Chart',
      chartType,
      chartData,
      chartStyles,
      columns,
      groupByConfig,
      savedAt: originalSavedAt || new Date().toISOString()
    }

    let updatedCharts
    if (originalSavedAt) {
      // Update existing chart
      updatedCharts = existingSavedCharts.map((chart: SavedChart) => 
        chart.savedAt === originalSavedAt ? chartToSave : chart
      )
      toast({
        title: "Chart Updated",
        description: "Your changes have been saved.",
        duration: 2000,
      })
    } else {
      // Save new chart
      updatedCharts = [...existingSavedCharts, chartToSave]
      toast({
        title: "Chart Saved",
        description: "Your chart has been saved successfully.",
        duration: 2000,
      })
    }

    // Save to localStorage
    localStorage.setItem('savedCharts', JSON.stringify(updatedCharts))
    
    // Update the current savedChartData if this was an edit
    if (originalSavedAt) {
      // Create and dispatch a custom event with the updated chart data
      const updateEvent = new CustomEvent('chartUpdated', {
        detail: {
          savedAt: originalSavedAt,
          updatedChart: chartToSave
        }
      });
      window.dispatchEvent(updateEvent);
    } else {
      // For new charts, just trigger the regular update
      window.dispatchEvent(new Event('savedChartsUpdated'))
    }
  }

  // Add new type for simplified legend position
  type SimpleLegendPosition = 'bottom' | 'top' | 'left' | 'right';

  // Add helper function to convert simple position to detailed settings
  const getLegendPositionSettings = (position: SimpleLegendPosition): ChartStyles['legendPosition'] => {
    switch (position) {
      case 'bottom':
        return { vertical: 'bottom', horizontal: 'center', layout: 'horizontal' };
      case 'top':
        return { vertical: 'top', horizontal: 'center', layout: 'horizontal' };
      case 'left':
        return { vertical: 'middle', horizontal: 'left', layout: 'vertical' };
      case 'right':
        return { vertical: 'middle', horizontal: 'right', layout: 'vertical' };
    }
  };

  // Add helper function to get simple position from detailed settings
  const getSimpleLegendPosition = (position: ChartStyles['legendPosition']): SimpleLegendPosition => {
    if (position.vertical === 'bottom') return 'bottom';
    if (position.vertical === 'top') return 'top';
    if (position.horizontal === 'left') return 'left';
    return 'right';
  };

  // Render only the chart in view-only mode
  if (viewOnly && savedChartData) {
    return (
      <div className="w-full h-full">
        {renderChart()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="container mx-auto py-0">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6">
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
                          placeholder={`JSON example: [{"name":"Jan","value":400},...]`}
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
                            Apply JSON
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
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={handleSaveChart}
                      >
                        <Save className="h-4 w-4" />
                        Save Chart
                      </Button>
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
                              <TabsTrigger value="axis" className="flex-1">Axis</TabsTrigger>
                            </TabsList>
                            <TabsContent value="colors" className="space-y-4">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Color Theme</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {(Object.entries(COLOR_THEMES) as Array<[keyof typeof COLOR_THEMES, string[]]>).map(([theme, colors]) => (
                                      <Button
                                        key={theme}
                                        variant="ghost"
                                        className="flex items-center justify-between p-2 h-auto"
                                        onClick={() => {
                                          handleStyleChange('colorTheme', theme);
                                          handleStyleChange('colors', [...colors]);
                                        }}
                                      >
                                        <span className="capitalize text-sm">{theme}</span>
                                        <ColorThemePreview colors={colors} selected={chartStyles.colorTheme === theme} />
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="useMultiColor"
                                    checked={chartStyles.useMultiColor}
                                    onCheckedChange={(checked) => handleStyleChange('useMultiColor', !!checked)}
                                  />
                                  <Label htmlFor="useMultiColor">
                                    Use multiple colors for single-series charts
                                  </Label>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          <HelpCircle className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        When enabled, each bar or segment will use a different color from the theme.
                                        This only affects single-series charts like bar charts and pie charts.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <Collapsible>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" className="flex items-center gap-2 w-full justify-between">
                                      <span>Custom Colors</span>
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="space-y-4 pt-4">
                                    {chartStyles.colors.map((color, index) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <Label className="w-24">Color {index + 1}</Label>
                                        <div className="flex-1 flex items-center gap-2">
                                          <Input
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                              const newColors = [...chartStyles.colors];
                                              newColors[index] = e.target.value;
                                              handleStyleChange('colors', newColors);
                                              handleStyleChange('colorTheme', 'default');
                                            }}
                                            className="w-20 h-8 p-1"
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              const newColors = chartStyles.colors.filter((_, i) => i !== index);
                                              handleStyleChange('colors', newColors);
                                            }}
                                            className="h-8 w-8"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    <Button
                                      onClick={() => {
                                        const newColors = [...chartStyles.colors, '#000000'];
                                        handleStyleChange('colors', newColors);
                                        handleStyleChange('colorTheme', 'default');
                                      }}
                                      variant="outline"
                                      className="w-full"
                                    >
                                      Add Color
                                    </Button>
                                  </CollapsibleContent>
                                </Collapsible>
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
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium">Legend Position</label>
                                  <Select
                                    defaultValue="bottom"
                                    value={getSimpleLegendPosition(chartStyles.legendPosition)}
                                    onValueChange={(value: SimpleLegendPosition) => {
                                      setChartStyles({
                                        ...chartStyles,
                                        legendPosition: getLegendPositionSettings(value)
                                      });
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="bottom">Bottom</SelectItem>
                                      <SelectItem value="top">Top</SelectItem>
                                      <SelectItem value="left">Left</SelectItem>
                                      <SelectItem value="right">Right</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                            <TabsContent value="axis" className="space-y-4">
                              <div className="space-y-2">
                                <Label>Axis Labels Sorting</Label>
                                <Select
                                  defaultValue="none"
                                  value={axisSorting}
                                  onValueChange={(value: 'none' | 'asc' | 'desc' | 'chronological') => {
                                    setAxisSorting(value);
                                    // Trigger regrouping if grouping is active
                                    if (groupByConfig) {
                                      handleGroupBy(groupByConfig);
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue defaultValue="none" placeholder="None (Default Order)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None (Default Order)</SelectItem>
                                    <SelectItem value="asc">Ascending (ASC)</SelectItem>
                                    <SelectItem value="desc">Descending (DESC)</SelectItem>
                                    <SelectItem value="chronological">Chronological (for dates)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col h-[350px]">
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
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setShowGroupBy(!showGroupBy)}
                                    className={showGroupBy ? "bg-accent" : ""}
                                  >
                                    <Group className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {showGroupBy ? "Hide Grouping Options" : "Show Grouping Options"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              onClick={handleExportCSV}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Export CSV
                            </Button>
                          </div>
                        </div>

                        {showGroupBy && (
                          <div className="border rounded-lg p-4 bg-muted/50">
                            <div className="flex items-center gap-4">
                              <Label>Group By:</Label>
                              <Select
                                value={groupByConfig?.column || "none"}
                                onValueChange={(value) => {
                                  if (value === "none") {
                                    clearGrouping();
                                    return;
                                  }
                                  const col = columns.find(c => c.key === value);
                                  const isDateLike = col && chartData.some(row => {
                                    const val = row[col.key];
                                    return !isNaN(new Date(val).getTime());
                                  });
                                  
                                  handleGroupBy({
                                    column: value,
                                    aggregation: groupByConfig?.aggregation || 'sum',
                                    dateFormat: isDateLike ? 'day' : 'none'
                                  });
                                }}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {columns.map(col => (
                                    <SelectItem key={col.key} value={col.key}>
                                      {col.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {groupByConfig && (
                                <>
                                  <Label>Aggregate:</Label>
                                  <Select
                                    value={groupByConfig.aggregation}
                                    onValueChange={(value: 'sum' | 'average' | 'count' | 'min' | 'max') => {
                                      handleGroupBy({
                                        ...groupByConfig,
                                        aggregation: value
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="w-[150px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sum">Sum</SelectItem>
                                      <SelectItem value="average">Average</SelectItem>
                                      <SelectItem value="count">Count</SelectItem>
                                      <SelectItem value="min">Minimum</SelectItem>
                                      <SelectItem value="max">Maximum</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {groupByConfig && chartData.some(row => {
                                    const val = row[groupByConfig.column];
                                    return !isNaN(new Date(val).getTime());
                                  }) && (
                                    <>
                                      <Label>Date Format:</Label>
                                      <Select
                                        value={groupByConfig.dateFormat || 'none'}
                                        onValueChange={(value: 'year' | 'month' | 'day' | 'quarter' | 'none') => {
                                          handleGroupBy({
                                            ...groupByConfig,
                                            dateFormat: value
                                          });
                                        }}
                                      >
                                        <SelectTrigger className="w-[150px]">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">No Format</SelectItem>
                                          <SelectItem value="year">Year</SelectItem>
                                          <SelectItem value="quarter">Quarter</SelectItem>
                                          <SelectItem value="month">Month</SelectItem>
                                          <SelectItem value="day">Day</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </>
                                  )}

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={clearGrouping}
                                    className="h-8 w-8"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {columns.map((col) => (
                                  <TableHead key={col.key} className="min-w-[150px]">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                          <Input
                                            value={tempColumnLabels[col.key] ?? col.label}
                                            onChange={(e) => handleColumnLabelInput(col.key, e.target.value)}
                                            onBlur={() => handleColumnLabelBlur(col.key)}
                                            className="h-7 w-full"
                                          />
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Select
                                            value={col.type}
                                            onValueChange={(value: 'text' | 'number' | 'date') => 
                                              handleColumnTypeChange(col.key, value)
                                            }
                                          >
                                            <SelectTrigger className="h-7 w-[100px]">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="text">Text</SelectItem>
                                              <SelectItem value="number">Number</SelectItem>
                                              <SelectItem value="date">Date</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant={col.isAxisColumn ? "secondary" : "ghost"}
                                                  size="icon"
                                                  onClick={() => col.isAxisColumn ? null : handleSetAxisColumn(col.key)}
                                                  className={`h-7 w-7 ${col.isAxisColumn ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800' : ''}`}
                                                  disabled={col.isAxisColumn}
                                                >
                                                  <ArrowLeftRight className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="top">
                                                {col.isAxisColumn ? "Current Axis Labels Column" : "Set as Axis Labels Column"}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          {col.type === 'number' && (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    variant={columnFormulaMode[col.key] ? "secondary" : "ghost"}
                                                    size="icon"
                                                    onClick={() => toggleColumnFormulaMode(col.key)}
                                                    className="h-7 w-7"
                                                  >
                                                    <Calculator className="h-4 w-4" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                  Column Formula
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
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
                                      {col.type === 'number' && columnFormulaMode[col.key] && (
                                        <div className="flex items-center gap-1 px-1">
                                          <Input
                                            type="text"
                                            value={columnFormulaInput[col.key] || ''}
                                            onChange={(e) => handleColumnFormulaInput(col.key, e.target.value)}
                                            placeholder="Enter formula for entire column"
                                            className="h-7 text-xs bg-secondary/50"
                                          />
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                >
                                                  <HelpCircle className="h-3 w-3" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent side="right" className="bg-white border-gray-200 shadow-md">
                                                {formulaHelpContent}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          {columnHistory[col.key] && columnHistory[col.key].timestamp > Date.now() - 30000 && (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleUndoColumnFormula(col.key)}
                                                    className="h-7 w-7"
                                                  >
                                                    <Undo className="h-3 w-3" />
                                                  </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                  Undo formula changes (available for 30 seconds)
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </TableHead>
                                ))}
                                <TableHead className="w-[50px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {chartData.map((row: DataRow, index: number) => (
                                <TableRow key={index}>
                                  {columns.map((col) => (
                                    <TableCell key={col.key}>
                                      {renderCell(row, index, col)}
                                    </TableCell>
                                  ))}
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const newData = chartData.filter((_: DataRow, i: number) => i !== index);
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
      </div>
    </div>
  )
} 