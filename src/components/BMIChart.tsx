import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface BMIChartProps {
  height: number; // in inches
}

const BMIChart = ({ height }: BMIChartProps) => {
  // Generate BMI data based on weight data
  const generateBMIData = () => {
    const data = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    
    let weight = 180.0;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Simulate gradual weight loss
      weight -= 0.3 + (Math.random() - 0.5) * 0.8;
      const bmi = (weight / (height * height)) * 703;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bmi: Math.round(bmi * 10) / 10,
        weight: Math.round(weight * 10) / 10,
        fullDate: date.toISOString().split('T')[0]
      });
    }
    
    return data;
  };

  const data = generateBMIData();

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
            domain={['dataMin - 1', 'dataMax + 1']}
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
    </div>
  );
};

export { BMIChart };