import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, ReferenceLine } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ZoomIn, ZoomOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";

interface WeightEntry {
  weight: number;
  entry_date: string;
}

interface EnhancedWeightChartProps {
  weightUnit?: 'lbs' | 'kg';
  goalWeight?: number | null;
}

export const EnhancedWeightChart = ({ 
  weightUnit = 'lbs',
  goalWeight 
}: EnhancedWeightChartProps) => {
  const { user } = useAuth();
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showGoalLine, setShowGoalLine] = useState(true);
  const [zoomDomain, setZoomDomain] = useState<{ start?: number; end?: number }>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('weight, entry_date')
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
    if (dateRange === 'all') return weightData;
    
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[dateRange];
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    return weightData.filter(entry => new Date(entry.entry_date) >= cutoff);
  }, [weightData, dateRange]);

  const chartData = useMemo(() => {
    return filteredData.map(entry => ({
      date: new Date(entry.entry_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: dateRange === '1y' || dateRange === 'all' ? '2-digit' : undefined
      }),
      weight: weightUnit === 'kg' ? (entry.weight / 2.20462) : entry.weight,
      fullDate: entry.entry_date
    }));
  }, [filteredData, weightUnit, dateRange]);

  const handleZoom = (domain: any) => {
    if (domain) {
      setZoomDomain({ start: domain.startIndex, end: domain.endIndex });
    }
  };

  const resetZoom = () => {
    setZoomDomain({});
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{new Date(data.fullDate).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
          <p className="text-primary">
            Weight: {payload[0].value.toFixed(1)} {weightUnit}
          </p>
          {goalWeight && (
            <p className="text-muted-foreground text-sm">
              Goal: {(weightUnit === 'kg' ? goalWeight / 2.20462 : goalWeight).toFixed(1)} {weightUnit}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <ChartSkeleton />;
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

  return (
    <Card className="p-6">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Weight Progress</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetZoom}
              disabled={!zoomDomain.start && !zoomDomain.end}
            >
              <ZoomOut className="h-4 w-4 mr-1" />
              Reset Zoom
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          {goalWeight && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoalLine(!showGoalLine)}
            >
              {showGoalLine ? 'Hide' : 'Show'} Goal Line
            </Button>
          )}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              fontSize={12}
              domain={zoomDomain.start !== undefined ? [zoomDomain.start, zoomDomain.end || 'dataMax'] : ['dataMin', 'dataMax']}
            />
            <YAxis 
              fontSize={12}
              domain={['dataMin - 5', 'dataMax + 5']}
              label={{ value: `Weight (${weightUnit})`, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {showGoalLine && goalWeight && (
              <ReferenceLine 
                y={weightUnit === 'kg' ? goalWeight / 2.20462 : goalWeight} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ value: "Goal", position: "insideTopRight" }}
              />
            )}
            
            <Line
              type="monotone"
              dataKey="weight"
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
            
            {chartData.length > 10 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="hsl(var(--primary))"
                onChange={handleZoom}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};