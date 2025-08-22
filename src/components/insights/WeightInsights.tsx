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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Trend Analysis */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Weight Trend</h3>
          {getTrendIcon()}
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          {getTrendMessage()}
        </p>
        <Badge variant={analytics.trend === 'decreasing' ? 'default' : 'secondary'}>
          {analytics.trend === 'decreasing' ? 'Losing' : analytics.trend === 'increasing' ? 'Gaining' : 'Stable'}
        </Badge>
      </Card>

      {/* Logging Streak */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Logging Streak</h3>
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <div className="text-2xl font-bold text-primary">
          {analytics.streak}
        </div>
        <p className="text-sm text-muted-foreground">
          {analytics.streak === 1 ? 'day' : 'days'} in a row
        </p>
      </Card>

      {/* Goal Timeline */}
      {timeToGoal && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Goal Timeline</h3>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="text-lg font-semibold">
            ~{timeToGoal}
          </div>
          <p className="text-sm text-muted-foreground">
            At current rate
          </p>
        </Card>
      )}

      {/* Best/Worst Day Analysis */}
      {analytics.bestDay && (
        <Card className="p-4 md:col-span-2 lg:col-span-3">
          <h3 className="font-semibold text-sm mb-3">Day of Week Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Best day for weight loss</p>
              <p className="font-semibold text-success">{analytics.bestDay}</p>
            </div>
            {analytics.worstDay && analytics.worstDay !== analytics.bestDay && (
              <div>
                <p className="text-sm text-muted-foreground">Most challenging day</p>
                <p className="font-semibold text-destructive">{analytics.worstDay}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Monthly Summary */}
      <Card className="p-4 md:col-span-2 lg:col-span-3">
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