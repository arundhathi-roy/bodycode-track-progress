import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface BMIChartProps {
  height: number; // in inches
}

interface WeightEntry {
  weight: number;
  entry_date: string;
}

const BMIChart = ({ height }: BMIChartProps) => {
  const { user } = useAuth();
  const [weightData, setWeightData] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const formatBMIData = () => {
    return weightData.map(entry => {
      const bmi = (entry.weight / (height * height)) * 703;
      return {
        date: new Date(entry.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bmi: Math.round(bmi * 10) / 10,
        weight: entry.weight,
        fullDate: entry.entry_date
      };
    });
  };

  const data = formatBMIData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-medium p-3">
          <p className="text-sm font-medium text-foreground">{`Date: ${label}`}</p>
          <p className="text-sm text-primary">
            {`BMI: ${payload[0].value}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {`Weight: ${payload[0].payload.weight} lbs`}
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
            <p className="text-muted-foreground mb-2">No BMI data yet</p>
            <p className="text-sm text-muted-foreground">Start logging your weight to see BMI trend</p>
          </div>
        </div>
      ) : (
        <>
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
                domain={data.length > 1 ? ['dataMin - 1', 'dataMax + 1'] : [0, 'dataMax + 2']}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for BMI categories */}
              <ReferenceLine y={18.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={25} stroke="hsl(var(--warning))" strokeDasharray="5 5" opacity={0.7} />
              <ReferenceLine y={30} stroke="hsl(var(--destructive))" strokeDasharray="5 5" opacity={0.7} />
              
              <Line
                type="monotone"
                dataKey="bmi"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2, fill: 'hsl(var(--background))' }}
              />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="mt-2 text-xs text-muted-foreground text-center space-x-4">
            <span>Normal: 18.5-25</span>
            <span>Overweight: 25-30</span>
            <span>Obese: 30+</span>
          </div>
        </>
      )}
    </div>
  );
};

export { BMIChart };