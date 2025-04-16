import { ChartData } from '@/services/chartService';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
} from "recharts";

export function renderChart(chartData: ChartData) {
  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No chart data available
      </div>
    );
  }

  const { chartType, chartData: data, chartStyles, columns } = chartData;

  // Find the axis column and get its key
  const axisColumn = columns.find((col: any) => col.isAxisColumn);
  const axisKey = axisColumn?.key || Object.keys(data[0])[0];

  // Determine the data keys for the chart
  const dataKeys = columns
    .filter((col: any) => col.type === 'number' && !col.isAxisColumn)
    .map((col: any) => col.key);

  // Create a mapping of data keys to their labels
  const keyToLabel = columns.reduce((acc: any, col: any) => ({
    ...acc,
    [col.key]: col.label
  }), {});

  // For pie/donut charts, transform the data if needed
  const pieChartData = (chartType === "pie" || chartType === "donut") 
    ? data.map((item: any) => ({
        name: item[axisKey],
        value: typeof item.value === 'number' ? item.value : Number(item[dataKeys[0]])
      }))
    : data;

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
        <ResponsiveContainer width="100%" height="100%">
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <RechartsBarChart data={data} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
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
              {dataKeys.map((key: string, index: number) => (
                <Bar
                  key={key}
                  name={keyToLabel[key] || key}
                  dataKey={key}
                  fill={chartStyles.colors[index % chartStyles.colors.length]}
                  radius={[chartStyles.barRadius, chartStyles.barRadius, 0, 0]}
                  fillOpacity={chartStyles.opacity}
                >
                  {chartStyles.useMultiColor && dataKeys.length === 1 && data.map((_: any, entryIndex: number) => (
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
      );

    case "horizontal-bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <RechartsBarChart layout="vertical" data={data} margin={{ top: 20, right: 50, left: 20, bottom: 20 }}>
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
              {dataKeys.map((key: string, index: number) => (
                <Bar
                  key={key}
                  name={keyToLabel[key] || key}
                  dataKey={key}
                  fill={chartStyles.colors[index % chartStyles.colors.length]}
                  radius={[0, chartStyles.barRadius, chartStyles.barRadius, 0]}
                  fillOpacity={chartStyles.opacity}
                >
                  {chartStyles.useMultiColor && dataKeys.length === 1 && data.map((_: any, entryIndex: number) => (
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
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <RechartsLineChart data={data} margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
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
              {dataKeys.map((key: string, index: number) => (
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
      );

    case "pie":
    case "donut":
      return (
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
                {pieChartData.map((_entry: any, index: number) => (
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
      );

    case "area":
    case "stacked-area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ChartContainer config={{ value: { label: keyToLabel[dataKeys[0]] || "Value", color: chartStyles.colors[0] } } satisfies ChartConfig}>
            <AreaChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                {dataKeys.map((key: string, index: number) => (
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
                {dataKeys.map((key: string, index: number) => (
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
                );

                // Add other chart types as needed
                default:
                return (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                Unsupported chart type: {chartType}
                </div>
                );
                }
                }