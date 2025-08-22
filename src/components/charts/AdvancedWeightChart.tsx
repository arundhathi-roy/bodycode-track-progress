import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, ReferenceLine, Area, AreaChart, ReferenceArea } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ZoomIn, ZoomOut, TrendingUp, TrendingDown, Target, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval } from "date-fns";

interface WeightEntry {
  weight: number;
  entry_date: string;
  notes?: string;
}

interface AdvancedWeightChartProps {
  weightUnit?: 'lbs' | 'kg';
  goalWeight?: number | null;
  height?: number;
}

type ChartType = 'line' | 'area';
type ViewMode = 'weight' | 'bmi' | 'progress';

export const AdvancedWeightChart = ({ 
  weightUnit = 'lbs',
  goalWeight,
  height 
}: AdvancedWeightChartProps) => {
  const { user } = useAuth();
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [showGoalLine, setShowGoalLine] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<ViewMode>('weight');
  const [zoomDomain, setZoomDomain] = useState<{ left?: number; right?: number }>({});
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('weight, entry_date, notes')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: true });

        if (error) throw error;
        if (data) setWeightData(data);
      } catch (error) {
        console.error('Error fetching weight data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return weightData;
    
    return weightData.filter(entry => {
      const entryDate = new Date(entry.entry_date);
      return isWithinInterval(entryDate, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [weightData, dateRange]);

  const chartData = useMemo(() => {
    return filteredData.map((entry, index) => {
      const weight = weightUnit === 'kg' ? (entry.weight / 2.20462) : entry.weight;
      const bmi = height ? (entry.weight / (height * height)) * 703 : 0;
      
      // Calculate progress percentage
      const firstWeight = filteredData[0]?.weight || entry.weight;
      const progress = goalWeight ? ((firstWeight - entry.weight) / (firstWeight - goalWeight)) * 100 : 0;
      
      return {
        date: format(new Date(entry.entry_date), 'MMM dd'),
        fullDate: entry.entry_date,
        weight: parseFloat(weight.toFixed(1)),
        bmi: parseFloat(bmi.toFixed(1)),
        progress: Math.max(0, Math.min(100, progress)),
        rawWeight: entry.weight,
        notes: entry.notes,
        index
      };
    });
  }, [filteredData, weightUnit, height, goalWeight]);

  const getYAxisConfig = () => {
    switch (viewMode) {
      case 'weight':
        return {
          domain: ['dataMin - 2', 'dataMax + 2'],
          label: `Weight (${weightUnit})`,
          dataKey: 'weight'
        };
      case 'bmi':
        return {
          domain: [15, 35],
          label: 'BMI',
          dataKey: 'bmi'
        };
      case 'progress':
        return {
          domain: [0, 100],
          label: 'Progress (%)',
          dataKey: 'progress'
        };
      default:
        return {
          domain: ['dataMin - 2', 'dataMax + 2'],
          label: `Weight (${weightUnit})`,
          dataKey: 'weight'
        };
    }
  };

  const handleZoom = useCallback((domain: any) => {
    if (domain) {
      setZoomDomain({ left: domain.left, right: domain.right });
    }
  }, []);

  const resetZoom = () => {
    setZoomDomain({});
  };

  const getStatistics = () => {
    if (chartData.length < 2) return null;
    
    const firstEntry = chartData[0];
    const lastEntry = chartData[chartData.length - 1];
    const yConfig = getYAxisConfig();
    
    const change = lastEntry[yConfig.dataKey] - firstEntry[yConfig.dataKey];
    const changePercentage = ((change / firstEntry[yConfig.dataKey]) * 100);
    
    return {
      change,
      changePercentage,
      isPositive: change > 0,
      unit: viewMode === 'weight' ? weightUnit : viewMode === 'bmi' ? '' : '%'
    };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const yConfig = getYAxisConfig();
      
      return (
        <Card className="p-4 shadow-lg border-2 bg-background/95 backdrop-blur-sm">
          <div className="space-y-2">
            <p className="font-semibold text-sm">
              {format(new Date(data.fullDate), 'EEEE, MMMM do, yyyy')}
            </p>
            
            <div className="space-y-1">
              <p className="text-primary font-medium">
                {viewMode === 'weight' && `Weight: ${data.weight} ${weightUnit}`}
                {viewMode === 'bmi' && `BMI: ${data.bmi}`}
                {viewMode === 'progress' && `Progress: ${data.progress.toFixed(1)}%`}
              </p>
              
              {viewMode !== 'weight' && (
                <p className="text-muted-foreground text-sm">
                  Weight: {data.weight} {weightUnit}
                </p>
              )}
              
              {viewMode !== 'bmi' && height && (
                <p className="text-muted-foreground text-sm">
                  BMI: {data.bmi}
                </p>
              )}
            </div>
            
            {data.notes && (
              <p className="text-muted-foreground text-sm border-t pt-2">
                📝 {data.notes}
              </p>
            )}
            
            {goalWeight && viewMode === 'weight' && (
              <p className="text-muted-foreground text-sm">
                Goal: {(weightUnit === 'kg' ? goalWeight / 2.20462 : goalWeight).toFixed(1)} {weightUnit}
              </p>
            )}
          </div>
        </Card>
      );
    }
    return null;
  };

  const statistics = getStatistics();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6 text-center">
        <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">No Weight Data Yet</h3>
        <p className="text-muted-foreground">
          Start tracking your weight to see your progress over time.
        </p>
      </Card>
    );
  }

  const yConfig = getYAxisConfig();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Advanced Weight Analytics
            </h3>
            
            {statistics && (
              <Badge variant={statistics.isPositive ? "destructive" : "default"} className="flex items-center gap-1">
                {statistics.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {statistics.change > 0 ? '+' : ''}{statistics.change.toFixed(1)} {statistics.unit}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <DatePickerWithRange
              onRangeChange={setDateRange}
              initialRange={dateRange}
              className="w-auto"
            />
            
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Weight</SelectItem>
                {height && <SelectItem value="bmi">BMI</SelectItem>}
                {goalWeight && <SelectItem value="progress">Progress</SelectItem>}
              </SelectContent>
            </Select>
            
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="area">Area</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              disabled={!zoomDomain.left && !zoomDomain.right}
            >
              <ZoomOut className="h-4 w-4 mr-1" />
              Reset Zoom
            </Button>
            
            {goalWeight && viewMode === 'weight' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGoalLine(!showGoalLine)}
              >
                <Target className="h-4 w-4 mr-1" />
                {showGoalLine ? 'Hide' : 'Show'} Goal
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart 
                data={chartData} 
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                onMouseMove={(e) => setHoveredPoint(e?.activePayload?.[0]?.payload)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  domain={zoomDomain.left !== undefined ? [zoomDomain.left, zoomDomain.right || 'dataMax'] : ['dataMin', 'dataMax']}
                />
                <YAxis 
                  fontSize={12}
                  domain={yConfig.domain}
                  label={{ value: yConfig.label, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {showGoalLine && goalWeight && viewMode === 'weight' && (
                  <ReferenceLine 
                    y={weightUnit === 'kg' ? goalWeight / 2.20462 : goalWeight} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="5 5"
                    label={{ value: "Goal", position: "insideTopRight" }}
                  />
                )}
                
                <Area
                  type="monotone"
                  dataKey={yConfig.dataKey}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorWeight)"
                  dot={{
                    fill: "hsl(var(--primary))",
                    strokeWidth: 2,
                    r: 3
                  }}
                  activeDot={{
                    r: 6,
                    stroke: "hsl(var(--primary))",
                    strokeWidth: 2,
                    fill: "hsl(var(--background))"
                  }}
                />
                
                {chartData.length > 15 && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="hsl(var(--primary))"
                    onChange={handleZoom}
                  />
                )}
              </AreaChart>
            ) : (
              <LineChart 
                data={chartData} 
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                onMouseMove={(e) => setHoveredPoint(e?.activePayload?.[0]?.payload)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  fontSize={12}
                  domain={zoomDomain.left !== undefined ? [zoomDomain.left, zoomDomain.right || 'dataMax'] : ['dataMin', 'dataMax']}
                />
                <YAxis 
                  fontSize={12}
                  domain={yConfig.domain}
                  label={{ value: yConfig.label, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {showGoalLine && goalWeight && viewMode === 'weight' && (
                  <ReferenceLine 
                    y={weightUnit === 'kg' ? goalWeight / 2.20462 : goalWeight} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="5 5"
                    label={{ value: "Goal", position: "insideTopRight" }}
                  />
                )}
                
                <Line
                  type="monotone"
                  dataKey={yConfig.dataKey}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{
                    fill: "hsl(var(--primary))",
                    strokeWidth: 2,
                    r: 4
                  }}
                  activeDot={{
                    r: 6,
                    stroke: "hsl(var(--primary))",
                    strokeWidth: 2,
                    fill: "hsl(var(--background))"
                  }}
                />
                
                {chartData.length > 15 && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="hsl(var(--primary))"
                    onChange={handleZoom}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Statistics */}
      {statistics && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Period Change</p>
              <p className={`text-lg font-semibold ${statistics.isPositive ? 'text-destructive' : 'text-success'}`}>
                {statistics.change > 0 ? '+' : ''}{statistics.change.toFixed(1)} {statistics.unit}
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Percentage Change</p>
              <p className={`text-lg font-semibold ${statistics.isPositive ? 'text-destructive' : 'text-success'}`}>
                {statistics.changePercentage > 0 ? '+' : ''}{statistics.changePercentage.toFixed(1)}%
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Data Points</p>
              <p className="text-lg font-semibold">{chartData.length}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};