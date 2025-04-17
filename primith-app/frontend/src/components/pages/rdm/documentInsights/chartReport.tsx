  import { useEffect, useState, ReactElement, useRef } from "react"
  import { 

  } from "lucide-react"
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
  import Underline from '@tiptap/extension-underline'
  import TextAlign from '@tiptap/extension-text-align'
  import Highlight from '@tiptap/extension-highlight'
  import Link from '@tiptap/extension-link'
  import Table from '@tiptap/extension-table'
  import TableRow from '@tiptap/extension-table-row'
  import TableCell from '@tiptap/extension-table-cell'
  import TableHeader from '@tiptap/extension-table-header'
  import Image from '@tiptap/extension-image';
  import ImageResize from 'tiptap-extension-resize-image';
  import TaskList from '@tiptap/extension-task-list'
  import TaskItem from '@tiptap/extension-task-item'
  import { Divider } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/Divider';
  import { Variable } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/Variable';
  import { InfoPanel } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/InfoPanel';
  import { DateNode } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/DateNode';
  import { Expand } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/Expand';
  import {
    Undo2,
    Redo2,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Table as TableIcon,
    Image as ImageIcon,
    Link as LinkIcon,
    ChevronDown,
    ArrowLeft,
    Heading1,
    Heading2,
    Heading3, 
    BarChart, 
    Settings,
    Indent,
    Outdent,
    SeparatorHorizontal,
    Type,
    Highlighter,
    FileDown,
    Search,
    Save,
    CheckSquare,
    Plus,
    Minus,
    MoreHorizontal, 
    Info, 
    Calendar, 
    ChevronRight, 
  } from 'lucide-react';
  import { PageBreak } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/PageBreak';
  import { Indent as IndentExtension } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/Indent';
  import SearchAndReplace from '@/components/pages/rdm/pages/TipTapExtensionsExtra/SearchAndReplace';
  import SearchReplaceMenu from '@/components/pages/rdm/pages/TipTapExtensionsExtra/SearchReplaceMenu';
  import { GapCursorExtension } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/GapCursor'
  import { BackColor } from "@/components/pages/rdm/pages/TipTapExtensionsExtra/BackgroundColor";
  import { TableCellAttributes } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/TableCellAttributes';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
  } from "@/components/ui/dropdown-menu"
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
  import TextStyle from "@tiptap/extension-text-style"
  import Color from "@tiptap/extension-color"

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
          top: '-5px', // <‑‑ push text 5 px higher
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

  interface TooltipButtonProps {
    title: string;
    onClick?: (event?: React.MouseEvent) => void;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    asDiv?: boolean;
    hideTooltip?: boolean;
  }

  const TooltipButton: React.FC<TooltipButtonProps> = ({
    title,
    onClick,
    disabled = false,
    children,
    className = '',
    asDiv = false,
    hideTooltip = false
  }) => {
    const baseClass = `relative p-2 rounded transition-colors duration-200 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'
    } ${className}`;

    const handleClick = (event: React.MouseEvent) => {
      if (onClick && !disabled) {
        onClick(event);
      }
    };

    const tooltipClass = !hideTooltip && title
      ? "group-hover:opacity-100 group-hover:visible opacity-0 invisible absolute top-full left-1/2 -translate-x-1/2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg transition-all duration-200 whitespace-nowrap z-50 mt-2"
      : "";

    const content = (
      <>
        {children}
        {!hideTooltip && title && <span className={tooltipClass}>{title}</span>}
      </>
    );

    return asDiv ? (
      <div className={`group ${baseClass}`} onClick={handleClick}>
        {content}
      </div>
    ) : (
      <button className={`group ${baseClass}`} onClick={handleClick} disabled={disabled}>
        {content}
      </button>
    );
  };

  const MenuBar = ({ editor, charts }: { editor: any, charts: ChartData[] }) => {
    const [_savedCharts, setSavedCharts] = useState<ChartReport[]>([]);
    const { toast } = useToast();
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [isLinkActive, setIsLinkActive] = useState(false);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [currentColor, setCurrentColor] = useState('#000000');
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);

    const getBlockType = () => {
      if (editor.isActive('heading', { level: 1 })) return { label: 'Heading 1', Icon: Heading1 }
      if (editor.isActive('heading', { level: 2 })) return { label: 'Heading 2', Icon: Heading2 }
      if (editor.isActive('heading', { level: 3 })) return { label: 'Heading 3', Icon: Heading3 }
      return { label: 'Paragraph', Icon: Type }
    }

    const { label: _currentLabel, Icon: CurrentIcon } = getBlockType()


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

      const handleClickOutside = () => {
        setOpenMenu(null);
      };
      
      window.addEventListener('click', handleClickOutside);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('savedChartsUpdated', handleCustomEvent);
        window.removeEventListener('click', handleClickOutside);
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

    const closeAllMenus = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setOpenMenu(null);
    };

    const handleLinkSubmit = () => {
      if (linkUrl) {
        // Check if URL has scheme, otherwise add https://
        const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`;
        
        if (isLinkActive) {
          // If link is already active, update it
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        } else {
          // Otherwise create a new link
          editor.chain().focus().setLink({ href: url }).run();
        }
      } else if (isLinkActive) {
        // If URL is empty and link is active, unset it
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      }
      
      setIsLinkDialogOpen(false);
    };

    const HIGHLIGHT_COLORS = [
      { color: '#FFFF00', label: 'Yellow' },
      { color: '#00FFFF', label: 'Cyan' },
      { color: '#FF00FF', label: 'Magenta' },
      { color: '#FFA500', label: 'Orange' },
      { color: '#98FB98', label: 'Pale Green' },
      { color: '#ADD8E6', label: 'Light Blue' },
      { color: '#FFC0CB', label: 'Pink' },
      { color: '#E6E6FA', label: 'Lavender' },
    ];

    const TableOptionsMenu = ({ editor }: { editor: any }) => {
      if (!editor || !editor.isActive('table')) return null;
      
      const CELL_COLORS = [
        { color: '#ffffff', label: 'White' },
        { color: '#f8f9fa', label: 'Light Gray' },
        { color: '#e2e8f0', label: 'Gray' },
        { color: '#fef3c7', label: 'Yellow' },
        { color: '#dcfce7', label: 'Green' },
        { color: '#dbeafe', label: 'Blue' },
        { color: '#fce7f3', label: 'Pink' },
        { color: '#fee2e2', label: 'Red' },
        { color: '#f3e8ff', label: 'Purple' },
        { color: '#ffedd5', label: 'Orange' },
      ];
    
      const handleCellColorChange = (color: string) => {
        editor.chain().focus().setCellAttribute('backgroundColor', color).run();
      };
      
      return (
        <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
          <ul className="space-y-1 pl-1.5 mt-1.5 mb-1.5 pr-1.5">
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M13,2A2,2 0 0,0 11,4V20A2,2 0 0,0 13,22H22V2H13M20,10V14H13V10H20M20,16V20H13V16H20M20,4V8H13V4H20M9,11H6V8H4V11H1V13H4V16H6V13H9V11Z" />
            </svg>
              <span>Column Before</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M11,2A2,2 0 0,1 13,4V20A2,2 0 0,1 11,22H2V2H11M4,10V14H11V10H4M4,16V20H11V16H4M4,4V8H11V4H4M15,11H18V8H20V11H23V13H20V16H18V13H15V11Z" />
            </svg>
              <span>Column After</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M4,2H11A2,2 0 0,1 13,4V20A2,2 0 0,1 11,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M4,10V14H11V10H4M4,16V20H11V16H4M4,4V8H11V4H4M17.59,12L15,9.41L16.41,8L19,10.59L21.59,8L23,9.41L20.41,12L23,14.59L21.59,16L19,13.41L16.41,16L15,14.59L17.59,12Z" />
            </svg>
              <span>Delete Column</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().addRowBefore().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M22,14A2,2 0 0,0 20,12H4A2,2 0 0,0 2,14V21H4V19H8V21H10V19H14V21H16V19H20V21H22V14M4,14H8V17H4V14M10,14H14V17H10V14M20,14V17H16V14H20M11,10H13V7H16V5H13V2H11V5H8V7H11V10Z" />
            </svg>
              <span>Row Before</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M22,10A2,2 0 0,1 20,12H4A2,2 0 0,1 2,10V3H4V5H8V3H10V5H14V3H16V5H20V3H22V10M4,10H8V7H4V10M10,10H14V7H10V10M20,10V7H16V10H20M11,14H13V17H16V19H13V22H11V19H8V17H11V14Z" />
            </svg>
              <span>Row After</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M9.41,13L12,15.59L14.59,13L16,14.41L13.41,17L16,19.59L14.59,21L12,18.41L9.41,21L8,19.59L10.59,17L8,14.41L9.41,13M22,9A2,2 0 0,1 20,11H4A2,2 0 0,1 2,9V6A2,2 0 0,1 4,4H20A2,2 0 0,1 22,6V9M4,9H8V6H4V9M10,9H14V6H10V9M16,9H20V6H16V9Z" />
            </svg>
              <span>Delete Row</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().mergeCells().run()}
            >
              <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#5f6368">
                <path d="M120-120v-240h80v160h160v80H120Zm480 0v-80h160v-160h80v240H600ZM287-327l-57-56 57-57H80v-80h207l-57-57 57-56 153 153-153 153Zm386 0L520-480l153-153 57 56-57 57h207v80H673l57 57-57 56ZM120-600v-240h240v80H200v160h-80Zm640 0v-160H600v-80h240v240h-80Z"/>
              </svg>
              <span>Merge Cells</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().splitCell().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M19 14H21V20H3V14H5V18H19V14M3 4V10H5V6H19V10H21V4H3M11 11V13H8V15L5 12L8 9V11H11M16 11V9L19 12L16 15V13H13V11H16Z" />
            </svg>
              <span>Split Cells</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M4 3H18C19.11 3 20 3.9 20 5V12.08C18.45 11.82 16.92 12.18 15.68 13H12V17H13.08C12.97 17.68 12.97 18.35 13.08 19H4C2.9 19 2 18.11 2 17V5C2 3.9 2.9 3 4 3M4 7V11H10V7H4M12 7V11H18V7H12M4 13V17H10V13H4M15.94 18.5H17.94V14.5H19.94V18.5H21.94L18.94 21.5L15.94 18.5" />
            </svg>
              <span>Header Column</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M4 3H18C19.11 3 20 3.9 20 5V12.08C18.45 11.82 16.92 12.18 15.68 13H12V17H13.08C12.97 17.68 12.97 18.35 13.08 19H4C2.9 19 2 18.11 2 17V5C2 3.9 2.9 3 4 3M4 7V11H10V7H4M12 7V11H18V7H12M4 13V17H10V13H4M19.44 21V19H15.44V17H19.44V15L22.44 18L19.44 21" />
            </svg>
              <span>Header Row</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().toggleHeaderCell().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M4 3H18C19.11 3 20 3.9 20 5V12.08C18.45 11.82 16.92 12.18 15.68 13H12V17H13.08C12.97 17.68 12.97 18.35 13.08 19H4C2.9 19 2 18.11 2 17V5C2 3.9 2.9 3 4 3M4 7V11H10V7H4M12 7V11H18V7H12M4 13V17H10V13H4M17.75 21L15 18L16.16 16.84L17.75 18.43L21.34 14.84L22.5 16.25L17.75 21" />
            </svg>
              <span>Header Cell</span>
            </li>
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
            <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M15.46,15.88L16.88,14.46L19,16.59L21.12,14.46L22.54,15.88L20.41,18L22.54,20.12L21.12,21.54L19,19.41L16.88,21.54L15.46,20.12L17.59,18L15.46,15.88M4,3H18A2,2 0 0,1 20,5V12.08C18.45,11.82 16.92,12.18 15.68,13H12V17H13.08C12.97,17.68 12.97,18.35 13.08,19H4A2,2 0 0,1 2,17V5A2,2 0 0,1 4,3M4,7V11H10V7H4M12,7V11H18V7H12M4,13V17H10V13H4Z" />
            </svg>
              <span>Delete Table</span>
            </li>
            <li className="px-3 py-2">
              <div className="text-sm text-gray-700 mb-2">Cell Background</div>
              <div className="grid grid-cols-4 gap-1">
                {CELL_COLORS.map(({ color, label }) => (
                  <button
                    key={color}
                    onClick={() => handleCellColorChange(color)}
                    className="w-6 h-6 rounded border border-gray-200 hover:border-gray-400 transition-all"
                    style={{ backgroundColor: color }}
                    title={label}
                  />
                ))}
              </div>
            </li>
            
            {/* Add clear background option */}
            <li
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => handleCellColorChange('transparent')}
            >
              <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/>
              </svg>
              <span>Clear Background</span>
            </li>
          </ul>
        </div>
      );
    };

    const MoreElementsMenu = () => {
      if (!editor) return null;
      
      return (
        <div className="absolute top-full right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px] z-50"
            onClick={(e) => e.stopPropagation()}>
          <ul className="space-y-1 pl-1.5 mt-1.5 mb-1.5 pr-1.5">
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                editor.chain()
                  .focus()
                  .insertContent([
                    { type: 'horizontalRule' },
                    { type: 'paragraph', content: [] }
                  ])
                  .run()
                closeAllMenus();
              }}
            >
              <Minus className="w-4 h-4 mr-2" />
              <span>Divider</span>
            </li>
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                // Add image function would go here
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = () => {
                  if (input.files?.length) {
                    const file = input.files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                      editor.chain()
                        .focus()
                        .setImage({ src: reader.result })
                        .run();
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
                closeAllMenus();
              }}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              <span>Image</span>
            </li>
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                editor.chain()
                  .focus()
                  .insertContent([
                    { type: 'paragraph', content: [{ type: 'text', text: new Date().toLocaleDateString() }] }
                  ])
                  .run()
                closeAllMenus();
              }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              <span>Date</span>
            </li>
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                editor.chain().focus().insertContent({
                  type: 'infoPanel',
                  attrs: { text: 'Add information here' }
                }).run()
                closeAllMenus();
              }}
            >
              <Info className="w-4 h-4 mr-2" />
              <span>Info Panel</span>
            </li>
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                editor.chain()
                  .focus()
                  .insertContent([
                    {
                      type: 'expand',
                      attrs: { title: 'Click to expand', isOpen: false },
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Expandable content here' }] }]
                    },
                    { type: 'paragraph', content: [] }
                  ])
                  .run()
                closeAllMenus();
              }}
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              <span>Expand</span>
            </li>
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                editor.chain()
                  .focus()
                  .toggleTaskList()
                  .run()
                closeAllMenus();
              }}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              <span>Task List</span>
            </li>
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                editor.chain().focus().setPageBreak().run()
                closeAllMenus();
              }}
            >
              <SeparatorHorizontal className="w-4 h-4 mr-2" />
            <span>Page Break</span>
          </li>
          </ul>
        </div>
      );
    };

    if (!editor) {
      return null;
    }

    return (
      <div className="flex items-center gap-1 mb-4 flex-wrap border-b border-gray-200 pb-2" onClick={(e) => e.stopPropagation()}>
        {/* Undo / Redo */}
        <TooltipButton
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        {/* Bold / Italic / Underline / Strike */}
        <TooltipButton
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          <Bold className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          <Italic className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-gray-200' : ''}
        >
          <UnderlineIcon className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-gray-200' : ''}
        >
          <Strikethrough className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        {/* Text Color */}
        <div className="relative">
          <TooltipButton
            title="Text Color"
            onClick={(event) => {
              if (!event) return;
              event.stopPropagation();
              if (colorInputRef.current) {
                colorInputRef.current.click();
              }
            }}
            className={editor.isActive('textStyle', { color: currentColor }) ? 'bg-gray-200' : ''}
          >
            <Type className="w-4 h-4 text-gray-600" style={{ color: currentColor }} />
            <input
              ref={colorInputRef}
              type="color"
              value={currentColor}
              onChange={(e) => {
                const color = e.target.value;
                setCurrentColor(color);
                editor.chain().focus().setColor(color).run();
              }}
              className="absolute opacity-0 w-0 h-0 overflow-hidden"
              style={{
                clip: 'rect(0 0 0 0)',
                clipPath: 'inset(50%)',
                position: 'absolute'
              }}
            />
          </TooltipButton>
        </div>

        {/* Link */}
        <TooltipButton
          title="Link"
          onClick={(event) => {
            event?.stopPropagation();
            // When clicking the link button, open the dialog.
            if (editor.isActive('link')) {
              // If already linked, prefill the input and mark it as active.
              setLinkUrl(editor.getAttributes('link')?.href || '');
              setIsLinkActive(true);
            } else {
              setLinkUrl('');
              setIsLinkActive(false);
            }
            setIsLinkDialogOpen(true);
          }}
          className={editor.isActive('link') ? 'bg-gray-200' : ''}
        >
          <LinkIcon className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        {/* Highlight */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative">
              <TooltipButton
                title="Highlight"
                className={`relative ${editor.isActive('highlight') ? 'bg-gray-200' : ''}`}
              >
                <div className="flex items-center gap-1">
                  <Highlighter className="w-4 h-4 text-gray-600" />
                  <ChevronDown className="w-3 h-3 text-gray-600" />
                </div>
              </TooltipButton>
            </div>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="p-2">
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                  className={`
                    w-8 h-8 rounded 
                    ${editor.isActive('highlight', { color }) ? 'ring-2 ring-black ring-offset-2' : ''}
                    hover:ring-2 hover:ring-gray-400 hover:ring-offset-2
                    transition-all
                  `}
                  style={{ backgroundColor: color }}
                  title={label}
                />
              ))}
            </div>
            
            {editor.isActive('highlight') && (
              <>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  className="justify-center text-xs text-red-600"
                >
                  Clear Highlight
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Lists */}
        <TooltipButton
          title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
        >
          <List className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Numbered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
        >
          <ListOrdered className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        {/* Alignment */}
        <TooltipButton
          title="Align Left"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}
        >
          <AlignLeft className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Align Center"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}
        >
          <AlignCenter className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Align Right"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}
        >
          <AlignRight className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Justify"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}
        >
          <AlignJustify className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        {/* Indent */}
        <TooltipButton
          title="Increase Indent"
          onClick={() => editor.chain().focus().indent().run()}
        >
          <Indent className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Decrease Indent"
          onClick={() => editor.chain().focus().outdent().run()}
        >
          <Outdent className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        {/* Headings */}
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-1 cursor-pointer">
              <CurrentIcon className="h-4 w-4 text-gray-600" />
              <ChevronDown className="h-3 w-3 text-gray-600" />
            </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" sideOffset={4} className="p-1">
          <DropdownMenuItem
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={`cursor-pointer ${editor.isActive('paragraph') ? 'font-semibold' : ''}`}
          >
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {[1, 2, 3].map((level) => (
            <DropdownMenuItem
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              className={`cursor-pointer ${editor.isActive('heading', { level }) ? 'font-semibold' : ''}`}
            >
              Heading {level}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

        {/* Table - Moved to main menu */}
        <TooltipButton
          title="Insert Table"
          onClick={() => {
            editor.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run();
          }}
          className={editor.isActive('table') ? 'bg-gray-200' : ''}
        >
          <TableIcon className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        {/* Table Options - Only show when a table is selected */}
        {editor.isActive('table') && (
          <div className="relative">
            <TooltipButton
              title="Table Options"
              onClick={(event) => {
                if (!event) return;
                event.stopPropagation();
                setOpenMenu(openMenu === 'tableOptions' ? null : 'tableOptions');
              }}
              className={openMenu === 'tableOptions' ? 'bg-gray-200' : ''}
            >
              <div className="flex items-center gap-1">
                <MoreHorizontal className="w-4 h-4 text-gray-600" />
                <ChevronDown className="w-3 h-3 text-gray-600" />
              </div>
            </TooltipButton>
            {openMenu === 'tableOptions' && <TableOptionsMenu editor={editor} />}
          </div>
        )}

        <div className="relative inline-block">
          <TooltipButton
            title="Search"
            onClick={e => {
              e?.stopPropagation();
              setIsSearchMenuOpen(open => !open);
            }}
            className={isSearchMenuOpen ? 'bg-gray-200' : ''}
          >
            <Search className="w-4 h-4 text-gray-600" />
          </TooltipButton>

          {isSearchMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 z-50"
              onClick={e => e.stopPropagation()}
            >
              <SearchReplaceMenu editor={editor} />
            </div>
          )}
        </div>

        {/* Insert Chart */}
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

        {/* More Elements Menu */}
        <div className="relative ml-auto">
          <TooltipButton
            title="More Elements"
            onClick={(event) => {
              if (!event) return;
              event.stopPropagation();
              setOpenMenu(openMenu === 'moreElements' ? null : 'moreElements');
            }}
            className={openMenu === 'moreElements' ? 'bg-gray-200' : ''}
          >
            <div className="flex items-center gap-1">
              <Plus className="w-4 h-4 text-gray-600" />
              <ChevronDown className="w-3 h-3 text-gray-600" />
            </div>
          </TooltipButton>
          {openMenu === 'moreElements' && <MoreElementsMenu />}
        </div>

        {/* Link Dialog */}
        {isLinkDialogOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setIsLinkDialogOpen(false)}
          >
            <div 
              className="bg-white p-4 rounded-lg w-[400px] max-w-[90vw] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium mb-3">{isLinkActive ? 'Edit Link' : 'Add Link'}</h3>
              <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-2 border border-gray-300 rounded mb-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLinkSubmit();
                    } else if (e.key === 'Escape') {
                      setIsLinkDialogOpen(false);
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  {isLinkActive && (
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        editor.chain().focus().extendMarkRange('link').unsetLink().run();
                        setIsLinkDialogOpen(false);
                      }}
                    >
                      Remove Link
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLinkDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLinkSubmit}
                  >
                    {isLinkActive ? 'Update' : 'Add'} Link
                  </Button>
                </div>
              </div>
            </div>
          )}
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
          }),
          Underline,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
          Highlight.configure({
            multicolor: true,
          }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              rel: 'noopener noreferrer',
              class: 'text-primary underline',
            },
          }),
          PageBreak,
          Table.configure({
            resizable: true,
          }),
          TableRow,
          TableCell,
          TableHeader,
          SearchAndReplace.configure({
            searchResultClass: 'search-highlight',
            disableRegex: true,
          }),
          TextStyle,
          Color.configure({
            types: ['textStyle'],
          }),
          Image.configure({
            allowBase64: true,
            HTMLAttributes: {
              class: 'rounded-md max-w-full',
            },
          }),
          ImageResize,
          TaskList,
          TaskItem.configure({
            nested: true,
          }),
          IndentExtension.configure({
            types: ['listItem', 'paragraph'],
            minIndent: 0,
            maxIndent: 8,
          }),
          // Add the additional extensions
          Divider,
          InfoPanel,
          DateNode,
          Variable,
          Expand,
          GapCursorExtension,
          TableCellAttributes.configure({
            types: ['tableCell', 'tableHeader'],
          }),
          BackColor.configure({
            types: ['textStyle', 'tableCell', 'tableRow', 'tableHeader'],
          }),
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
                  onChange={(e) => setReportName(e.target.value)}
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