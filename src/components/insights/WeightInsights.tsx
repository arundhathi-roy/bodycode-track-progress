import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Calendar, Target, Flame } from 'lucide-react';
import { useWeightAnalytics } from '@/hooks/useWeightAnalytics';

interface WeightInsightsProps {
  entries: Array<{ weight: number; entry_date: string }>;
  weightUnit: 'lbs' | 'kg';
  goalWeight: number | null;
  currentWeight: number | null;
}

export const WeightInsights = ({ entries, weightUnit, goalWeight, currentWeight }: WeightInsightsProps) => {
  const analytics = useWeightAnalytics(entries);

  const getTimeToGoal = () => {
    if (!goalWeight || !currentWeight || analytics.averageWeeklyChange === 0) return null;
    
    const weightToLose = Math.abs(currentWeight - goalWeight);
    const weeksToGoal = Math.ceil(weightToLose / Math.abs(analytics.averageWeeklyChange));
    
    if (weeksToGoal > 52) return `${Math.ceil(weeksToGoal / 52)} years`;
    if (weeksToGoal > 4) return `${Math.ceil(weeksToGoal / 4)} months`;
    return `${weeksToGoal} weeks`;
  };

  const getTrendIcon = () => {
    switch (analytics.trend) {
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-success" />;
      case 'increasing': return <TrendingUp className="h-4 w-4 text-destructive" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendMessage = () => {
    const change = Math.abs(analytics.averageWeeklyChange);
    const direction = analytics.trend === 'decreasing' ? 'losing' : analytics.trend === 'increasing' ? 'gaining' : 'maintaining';
    
    if (change > 0.1) {
      return `You're ${direction} ${change.toFixed(1)} ${weightUnit}/week on average`;
    }
    return 'Your weight is staying stable';
  };

  const timeToGoal = getTimeToGoal();

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Monthly Summary */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold">{entries.length}</div>
            <div className="text-sm text-muted-foreground">Total Entries</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {analytics.weeklyAverage.toFixed(1)} {weightUnit}
            </div>
            <div className="text-sm text-muted-foreground">Avg Weekly Change</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {analytics.monthlyAverage.toFixed(1)} {weightUnit}
            </div>
            <div className="text-sm text-muted-foreground">Avg Monthly Change</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{analytics.streak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </div>
        </div>
      </Card>
    </div>
  );
};