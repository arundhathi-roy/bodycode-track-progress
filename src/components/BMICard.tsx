import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";

interface BMICardProps {
  currentWeight: number;
  height: number; // in inches
  previousBMI?: number;
}

const BMICard = ({ currentWeight, height, previousBMI }: BMICardProps) => {
  // Calculate BMI: weight (lbs) / (height (inches))^2 * 703
  const currentBMI = (currentWeight / (height * height)) * 703;
  const bmiChange = previousBMI ? currentBMI - previousBMI : 0;

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: "Underweight", color: "bg-blue-100 text-blue-800" };
    if (bmi < 25) return { category: "Normal", color: "bg-success/20 text-success" };
    if (bmi < 30) return { category: "Overweight", color: "bg-warning/20 text-warning" };
    return { category: "Obese", color: "bg-destructive/20 text-destructive" };
  };

  const bmiCategory = getBMICategory(currentBMI);

  const formatHeight = (inches: number) => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-soft border-0">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Current BMI</p>
            <p className="text-2xl font-bold text-foreground">{currentBMI.toFixed(1)}</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Activity className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <Badge variant="secondary" className={bmiCategory.color}>
            {bmiCategory.category}
          </Badge>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Height: {formatHeight(height)}</span>
            {previousBMI && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">•</span>
                <span className={bmiChange < 0 ? 'text-success' : bmiChange > 0 ? 'text-warning' : 'text-muted-foreground'}>
                  {bmiChange > 0 ? '+' : ''}{bmiChange.toFixed(1)}
                </span>
                {bmiChange !== 0 && (
                  bmiChange < 0 ? 
                    <TrendingDown className="h-3 w-3 text-success" /> : 
                    <TrendingUp className="h-3 w-3 text-warning" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div>Normal: 18.5-24.9</div>
            <div>Overweight: 25-29.9</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { BMICard };