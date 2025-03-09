import React, { useRef, useState, useEffect } from 'react';
import { RoadmapItem } from '@/types/projects';
import { 
  format, addDays, differenceInDays, isAfter, isBefore, 
  addMonths, addWeeks, eachDayOfInterval, startOfMonth, endOfMonth,
  differenceInMonths, differenceInWeeks, differenceInYears
} from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// Define time unit types for the view toggle
type TimeUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Define proper types for time periods
type DayTimePeriod = {
  label: string;
  subLabel: string;
  start: Date;
  width: number;
  isToday: boolean;
};

type StandardTimePeriod = {
  label: string;
  start: Date;
  width: number;
};

type TimePeriod = DayTimePeriod | StandardTimePeriod;

interface GanttChartProps {
  items: RoadmapItem[];
  onItemClick?: (item: RoadmapItem) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ items, onItemClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollableAreaRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);
  const [taskColumnWidth, setTaskColumnWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [visibleItems, setVisibleItems] = useState<RoadmapItem[]>([]);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('month');

  // Calculate appropriate width for each time unit
  const getTimeUnitBaseWidth = () => {
    switch(timeUnit) {
      case 'day': return 40;      // 40px per day
      case 'week': return 100;    // 100px per week
      case 'month': return 200;   // 200px per month 
      case 'quarter': return 250; // 250px per quarter
      case 'year': return 300;    // 300px per year
    }
  };

  // Filter only items with both start and end dates
  useEffect(() => {
    const filtered = items.filter(
      item => item.startDate && item.endDate
    );
    setVisibleItems(filtered);
  }, [items]);

  // Calculate date ranges
  const dateRange = React.useMemo(() => {
    if (visibleItems.length === 0) {
      const today = new Date();
      return {
        start: addDays(today, -30),
        end: addDays(today, 60),
      };
    }

    let minDate = new Date();
    let maxDate = new Date();
    let hasSetInitialDates = false;

    visibleItems.forEach(item => {
      if (item.startDate && item.endDate) {
        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);

        if (!hasSetInitialDates) {
          minDate = startDate;
          maxDate = endDate;
          hasSetInitialDates = true;
        } else {
          if (isBefore(startDate, minDate)) minDate = startDate;
          if (isAfter(endDate, maxDate)) maxDate = endDate;
        }
      }
    });

    // Add padding to the range based on the selected time unit
    let paddedStart, paddedEnd;
    
    switch(timeUnit) {
      case 'day':
        paddedStart = addDays(minDate, -3);
        paddedEnd = addDays(maxDate, 3);
        break;
      case 'week':
        paddedStart = addWeeks(minDate, -1);
        paddedEnd = addWeeks(maxDate, 1);
        break;
      case 'quarter':
        paddedStart = addMonths(minDate, -1);
        paddedEnd = addMonths(maxDate, 1);
        break;
      case 'year':
        paddedStart = addMonths(minDate, -2);
        paddedEnd = addMonths(maxDate, 2);
        break;
      default: // month
        // For month view, ensure we start at the beginning of a month and end at the end of a month
        paddedStart = startOfMonth(addDays(minDate, -7));
        paddedEnd = endOfMonth(addDays(maxDate, 7));
    }

    return {
      start: paddedStart,
      end: paddedEnd,
    };
  }, [visibleItems, timeUnit]);

  // Generate time periods for display based on selected time unit
  const timePeriods = React.useMemo(() => {
    const result: TimePeriod[] = [];
    const unitBaseWidth = getTimeUnitBaseWidth();
    
    let currentDate = new Date(dateRange.start);
    
    // Set to start of period
    switch(timeUnit) {
      case 'day':
        // Keep as is - already a day
        break;
      case 'week':
        // Set to start of week (Sunday)
        currentDate.setDate(currentDate.getDate() - currentDate.getDay());
        break;
      case 'month':
        // Set to first day of month
        currentDate.setDate(1);
        break;
      case 'quarter':
        // Set to first day of quarter
        const quarterMonth = Math.floor(currentDate.getMonth() / 3) * 3;
        currentDate.setMonth(quarterMonth);
        currentDate.setDate(1);
        break;
      case 'year':
        // Set to first day of year
        currentDate.setMonth(0);
        currentDate.setDate(1);
        break;
    }

    // For day view, generate all days directly
    if (timeUnit === 'day') {
      const days = eachDayOfInterval({
        start: dateRange.start,
        end: dateRange.end
      });
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      return days.map(day => ({
        label: format(day, 'd'),
        subLabel: format(day, 'EEE'),
        start: day,
        width: unitBaseWidth,
        isToday: format(day, 'yyyy-MM-dd') === today
      })) as DayTimePeriod[];
    }

    // Generate time periods until we reach the end date
    while (currentDate <= dateRange.end) {
      const periodStart = new Date(currentDate);
      
      // Move to the next period
      switch(timeUnit) {
        case 'week':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'month':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'quarter':
          currentDate.setMonth(currentDate.getMonth() + 3);
          break;
        case 'year':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
      
      // Format the label based on time unit
      let label;
      switch(timeUnit) {
        case 'week':
          label = `W${format(periodStart, 'w')}`;
          break;
        case 'month':
          label = format(periodStart, 'MMM yyyy');
          break;
        case 'quarter':
          const quarter = Math.floor(periodStart.getMonth() / 3) + 1;
          label = `Q${quarter} ${format(periodStart, 'yyyy')}`;
          break;
        case 'year':
          label = format(periodStart, 'yyyy');
          break;
      }

      result.push({
        label,
        start: periodStart,
        width: unitBaseWidth,
      });
    }

    return result;
  }, [dateRange, timeUnit]);

  // Calculate the position and width for each item's bar
  const getItemStyle = (item: RoadmapItem) => {
    if (!item.startDate || !item.endDate) return { display: 'none' };
    
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    const unitBaseWidth = getTimeUnitBaseWidth();
    
    // Calculate position based on time units instead of days
    let startOffsetUnits = 0;
    let durationUnits = 0;
    
    switch(timeUnit) {
      case 'day':
        startOffsetUnits = differenceInDays(start, dateRange.start);
        durationUnits = differenceInDays(end, start) + 1;
        break;
        case 'week':
            // Calculate whole weeks
            startOffsetUnits = differenceInWeeks(start, dateRange.start);
            durationUnits = differenceInWeeks(end, start);
            
            // Adjust for partial weeks - start position is shifted by days into week
            const dayOfWeekStart = start.getDay();
            startOffsetUnits += dayOfWeekStart / 7;
            
            // For duration, add the full days spanning from start to end
            const totalDays = differenceInDays(end, start);
            durationUnits = totalDays / 7;
            
            // Ensure minimum visibility
            durationUnits = Math.max(durationUnits, 0.14);
            break;
      case 'month':
        startOffsetUnits = differenceInMonths(start, dateRange.start);
        durationUnits = differenceInMonths(end, start) + 0.03; // Add a small amount to ensure visibility
        
        // Adjust for partial months
        const dayOfMonthStart = start.getDate() - 1;
        const daysInStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
        startOffsetUnits += dayOfMonthStart / daysInStartMonth;
        
        const dayOfMonthEnd = end.getDate();
        const daysInEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
        durationUnits += (dayOfMonthEnd - dayOfMonthStart) / daysInEndMonth;
        break;
      case 'quarter':
        const startQuarter = Math.floor(start.getMonth() / 3);
        const endQuarter = Math.floor(end.getMonth() / 3);
        const startDateQuarter = new Date(start.getFullYear(), startQuarter * 3, 1);
        const endDateQuarter = new Date(end.getFullYear(), endQuarter * 3, 1);
        
        startOffsetUnits = differenceInMonths(startDateQuarter, dateRange.start) / 3;
        durationUnits = (differenceInMonths(endDateQuarter, startDateQuarter) / 3) + 0.01;
        
        // Adjust for position within quarter
        startOffsetUnits += (start.getMonth() % 3) / 3;
        durationUnits += ((end.getMonth() % 3) - (start.getMonth() % 3)) / 3;
        break;
      case 'year':
        startOffsetUnits = differenceInYears(start, dateRange.start);
        durationUnits = differenceInYears(end, start) + 0.01; // Add a small amount to ensure visibility
        
        // Adjust for partial years
        startOffsetUnits += start.getMonth() / 12;
        durationUnits += (end.getMonth() - start.getMonth()) / 12;
        break;
    }
    
    return {
      left: `${Math.max(startOffsetUnits * unitBaseWidth, 0)}px`,
      width: `${Math.max(durationUnits * unitBaseWidth, 8)}px`,
      backgroundColor: getStatusColor(item.status, false),
      borderColor: getStatusColor(item.status, true),
    };
  };

  const getStatusColor = (status: string, border: boolean) => {
    const opacity = border ? 1 : 0.7;
    switch (status) {
      case 'completed':
        return `hsl(var(--success) / ${opacity})`;
      case 'in_progress':
        return `hsl(var(--primary) / ${opacity})`;
      case 'delayed':
        return `hsl(var(--destructive) / ${opacity})`;
      default:
        return `hsl(var(--muted-foreground) / ${opacity})`;
    }
  };

  // Update chart width when container size changes
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setChartWidth(containerRef.current.clientWidth); 
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Handle drag to resize task column
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing && dragHandleRef.current && containerRef.current) {
      e.preventDefault();
      const newWidth = e.clientX - containerRef.current.getBoundingClientRect().left;
      if (newWidth > 150 && newWidth < chartWidth - 100) { // Min and max constraints
        setTaskColumnWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Calculate effective chart width based on time unit and periods
  const effectiveWidth = React.useMemo(() => {
    if (timePeriods.length === 0) return chartWidth;
    
    // Calculate total width based on all time periods
    const totalTimelineWidth = timePeriods.reduce((acc, period) => acc + period.width, 0);
    return taskColumnWidth + totalTimelineWidth;
  }, [timePeriods, taskColumnWidth, chartWidth]);

  if (visibleItems.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <div className="text-center p-8 border border-dashed rounded-md">
            <p className="text-muted-foreground">No items with dates to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-3">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium">Project Timeline</h3>
        <Select value={timeUnit} onValueChange={(value) => setTimeUnit(value as TimeUnit)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day View</SelectItem>
            <SelectItem value="week">Week View</SelectItem>
            <SelectItem value="month">Month View</SelectItem>
            <SelectItem value="quarter">Quarter View</SelectItem>
            <SelectItem value="year">Year View</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="p-0">
        <div ref={containerRef} className="w-full relative overflow-hidden">
        <div 
          ref={scrollableAreaRef}
          className="overflow-x-auto relative" 
          style={{ 
            width: '100%',
            clipPath: 'inset(0)'  // This prevents content from rendering outside its container
          }}
        >
            {/* Main container - will use a single div with border and rounded corners */}
            <div 
              className="border-r rounded-l-xl overflow-hidden" 
              style={{ 
                width: `${effectiveWidth}px`, 
                position: 'relative',
                borderCollapse: 'separate',
                borderSpacing: 0
              }}
            >
              {/* Header row */}
              <div className="flex bg-muted/20 border-b">
                {/* Task column header */}
                <div 
                  className="sticky left-0 z-20 border-r font-medium p-2 text-sm flex items-center bg-card"
                  style={{ width: `${taskColumnWidth}px`, minWidth: `${taskColumnWidth}px` }}
                >
                  Task
                </div>

                {/* Time periods header */}
                <div className="flex flex-grow">
                  {timeUnit === 'day' ? (
                    <div className="flex flex-col w-full">
                      {/* Month row */}
                      <div className="flex border-b">
                        {(() => {
                          const dayPeriods = timePeriods as DayTimePeriod[];
                          const months: {[key: string]: {start: number, width: number}} = {};
                          
                          dayPeriods.forEach((day, index) => {
                            const monthKey = format(day.start, 'MMM yyyy');
                            if (!months[monthKey]) {
                              months[monthKey] = { start: index, width: 0 };
                            }
                            months[monthKey].width += day.width;
                          });
                          
                          return Object.keys(months).map((monthKey, idx, arr) => {
                            const month = months[monthKey];
                            const width = month.width;
                            
                            return (
                              <div
                                key={monthKey}
                                className={`h-8 flex items-center justify-center text-xs font-medium text-muted-foreground ${idx < arr.length - 1 ? 'border-r' : ''}`}
                                style={{ width: `${width}px`, minWidth: `${width}px` }}
                              >
                                {monthKey}
                              </div>
                            );
                          });
                        })()}
                      </div>
                      
                      {/* Days row */}
                      <div className="flex">
                        {(timePeriods as DayTimePeriod[]).map((day, index, arr) => (
                          <div
                            key={index}
                            className={`h-8 flex flex-col items-center justify-center text-xs ${
                              day.isToday ? 'bg-primary/10 font-semibold' : ''
                            } ${index < arr.length - 1 ? 'border-r' : ''}`}
                            style={{ 
                              width: `${day.width}px`, 
                              minWidth: `${day.width}px` 
                            }}
                          >
                            <span className="text-muted-foreground">{day.subLabel}</span>
                            <span>{day.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // Standard header for other time units
                    <>
                      {timePeriods.map((period, index, arr) => (
                        <div
                          key={index}
                          className={`h-10 flex items-center justify-center text-xs font-medium text-muted-foreground ${index < arr.length - 1 ? 'border-r' : ''}`}
                          style={{ 
                            width: `${period.width}px`,
                            minWidth: `${period.width}px`
                          }}
                        >
                          {period.label}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Drag handle */}
              <div
                ref={dragHandleRef}
                onMouseDown={handleMouseDown}
                className="absolute w-1 h-full bg-border hover:bg-primary/50 cursor-col-resize z-30 transition-colors"
                style={{ left: `${taskColumnWidth}px`, top: 0 }}
              />

              {/* Body rows - wrap in a div to handle bottom border properly */}
              <div className="w-full">
                {visibleItems.map((item, idx, arr) => (
                  <div 
                    key={item.id} 
                    className={`flex hover:bg-muted/10 transition-colors cursor-pointer ${idx < arr.length - 1 ? 'border-b' : ''}`} 
                    onClick={() => onItemClick?.(item)}
                  >
                    {/* Task info column */}
                    <div 
                      className="sticky left-0 z-20 border-r p-3 text-sm truncate bg-card" 
                      style={{ 
                        width: `${taskColumnWidth}px`, 
                        minWidth: `${taskColumnWidth}px` 
                      }}
                    >
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.startDate && format(new Date(item.startDate), 'MMM d')} - {item.endDate && format(new Date(item.endDate), 'MMM d, yyyy')}
                      </div>
                    </div>
                    
                    {/* Timeline area */}
                    <div className="relative flex-grow h-16">
                      {/* Background grid */}
                      <div className="absolute inset-0 flex h-full">
                        {timeUnit === 'day' 
                          ? (timePeriods as DayTimePeriod[]).map((day, index, arr) => (
                              <div
                                key={index}
                                className={`h-full ${day.isToday ? 'bg-primary/5' : ''} ${index < arr.length - 1 ? 'border-r' : ''}`}
                                style={{ 
                                  width: `${day.width}px`, 
                                  minWidth: `${day.width}px` 
                                }}
                              />
                            ))
                          : timePeriods.map((period, index, arr) => (
                              <div
                                key={index}
                                className={`h-full ${index < arr.length - 1 ? 'border-r' : ''}`}
                                style={{ 
                                  width: `${period.width}px`, 
                                  minWidth: `${period.width}px` 
                                }}
                              />
                            ))
                        }
                      </div>
                      
                      {/* Task bar */}
                      <div
                        className="absolute h-6 top-5 rounded-sm border text-xs flex items-center justify-center shadow-sm z-10"
                        style={getItemStyle(item)}
                        title={`${item.title} (${item.startDate && format(new Date(item.startDate), 'MMM d')} - ${item.endDate && format(new Date(item.endDate), 'MMM d, yyyy')})`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GanttChart;