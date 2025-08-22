import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Target, Lightbulb, CheckCircle } from 'lucide-react';

interface ProgressInsightsProps {
  currentWeight: number | null;
  goalWeight: number | null;
  weightEntries: Array<{ weight: number; entry_date: string }>;
  weightUnit: 'lbs' | 'kg';
}

export const ProgressInsights = ({ 
  currentWeight, 
  goalWeight, 
  weightEntries, 
  weightUnit 
}: ProgressInsightsProps) => {
  const getInsights = () => {
    const insights = [];

    if (!currentWeight || !goalWeight || weightEntries.length < 2) {
      insights.push({
        type: 'tip',
        title: 'Start Your Journey',
        message: 'Log weights consistently for a few days to get personalized insights!',
        icon: Lightbulb,
        variant: 'default' as const
      });
      return insights;
    }

    // Calculate recent trend
    const recentEntries = weightEntries.slice(-7);
    const oldestRecent = recentEntries[0].weight;
    const newestRecent = recentEntries[recentEntries.length - 1].weight;
    const weeklyChange = newestRecent - oldestRecent;

    // Progress toward goal
    const totalProgress = Math.abs(goalWeight - currentWeight);
    const isLosingWeight = goalWeight < currentWeight;

    if (isLosingWeight && weeklyChange < 0) {
      insights.push({
        type: 'success',
        title: 'Great Progress!',
        message: `You're trending downward - you've lost ${Math.abs(weeklyChange).toFixed(1)} ${weightUnit} this week!`,
        icon: CheckCircle,
        variant: 'default' as const
      });
    } else if (isLosingWeight && weeklyChange > 2) {
      insights.push({
        type: 'tip',
        title: 'Consider Slowing Down',
        message: 'You\'re losing weight quickly. Consider aiming for 1-2 lbs per week for sustainable results.',
        icon: Lightbulb,
        variant: 'secondary' as const
      });
    } else if (!isLosingWeight && weeklyChange > 0) {
      insights.push({
        type: 'success',
        title: 'Building Progress!',
        message: `You're gaining weight steadily - up ${weeklyChange.toFixed(1)} ${weightUnit} this week!`,
        icon: TrendingUp,
        variant: 'default' as const
      });
    }

    // Consistency insights
    const hasRecentGaps = weightEntries.some((entry, index) => {
      if (index === 0) return false;
      const currentDate = new Date(entry.entry_date);
      const previousDate = new Date(weightEntries[index - 1].entry_date);
      const daysDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 3;
    });

    if (hasRecentGaps) {
      insights.push({
        type: 'tip',
        title: 'Stay Consistent',
        message: 'Try to log your weight every day or two for better tracking accuracy.',
        icon: Target,
        variant: 'secondary' as const
      });
    }

    // Goal proximity
    const progressPercent = Math.abs((currentWeight - goalWeight) / totalProgress) * 100;
    if (progressPercent > 75) {
      insights.push({
        type: 'success',
        title: 'Almost There!',
        message: `You're ${(100 - progressPercent).toFixed(0)}% away from your goal. Keep it up!`,
        icon: Target,
        variant: 'default' as const
      });
    }

    // Plateau detection
    const last10Entries = weightEntries.slice(-10);
    if (last10Entries.length >= 10) {
      const weights = last10Entries.map(e => e.weight);
      const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
      const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
      
      if (variance < 1) { // Low variance indicates plateau
        insights.push({
          type: 'tip',
          title: 'Breaking Through Plateaus',
          message: 'Your weight has been stable lately. Consider adjusting your routine or consulting a professional.',
          icon: Lightbulb,
          variant: 'secondary' as const
        });
      }
    }

    return insights.slice(0, 3); // Limit to 3 insights
  };

  const insights = getInsights();

  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground">Insights & Tips</h3>
      {insights.map((insight, index) => {
        const Icon = insight.icon;
        return (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                insight.type === 'success' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <Badge variant={insight.variant} className="text-xs">
                    {insight.type === 'success' ? 'Progress' : 'Tip'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.message}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};