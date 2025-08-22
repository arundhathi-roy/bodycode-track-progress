import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface WeightEntry {
  weight: number;
  entry_date: string;
}

interface WeightChartProps {
  weightUnit?: 'lbs' | 'kg';
}

const WeightChart = ({ weightUnit = 'lbs' }: WeightChartProps) => {
  const { user } = useAuth();
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Weight conversion utilities
  const convertWeight = (weight: number, fromUnit: 'lbs' | 'kg', toUnit: 'lbs' | 'kg') => {
    if (fromUnit === toUnit) return weight;
    return fromUnit === 'lbs' ? weight / 2.20462 : weight * 2.20462;
  };

  useEffect(() => {
    const fetchWeightData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('weight, entry_date')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: true });

        if (error) throw error;
        
        setWeightData(data || []);
      } catch (error) {
        console.error('Error fetching weight data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeightData();
  }, [user]);

  const formatChartData = () => {
    return weightData.map(entry => ({
      date: new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: convertWeight(entry.weight, 'lbs', weightUnit),
      fullDate: entry.entry_date
    }));
  };

  const data = formatChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-medium p-3">
          <p className="text-sm font-medium text-foreground">{`Date: ${label}`}</p>
          <p className="text-sm text-primary">
            {`Weight: ${payload[0].value.toFixed(1)} ${weightUnit}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">No weight data yet</p>
            <p className="text-sm text-muted-foreground">Start logging your weight to see the trend</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              domain={data.length > 1 ? ['dataMin - 2', 'dataMax + 2'] : [0, 'dataMax + 10']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2, fill: 'hsl(var(--background))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export { WeightChart };