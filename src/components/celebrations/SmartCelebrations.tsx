import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Star, Zap, Flame, TrendingDown, X } from 'lucide-react';
import { useCelebrations, Achievement } from '@/hooks/useCelebrations';

interface SmartCelebrationsProps {
  currentWeight: number | null;
  goalWeight: number | null;
  startWeight: number | null;
  recentEntries: Array<{ entry_date: string; weight: number }>;
  weightUnit: 'lbs' | 'kg';
}

export const SmartCelebrations = ({
  currentWeight,
  goalWeight,
  startWeight,
  recentEntries,
  weightUnit
}: SmartCelebrationsProps) => {
  const { achievements, dismissAchievement } = useCelebrations({
    currentWeight,
    goalWeight,
    startWeight,
    recentEntries,
    weightUnit
  });

  const getIcon = (achievement: Achievement) => {
    switch (achievement.type) {
      case 'goal': return Trophy;
      case 'milestone': return achievement.milestone === 25 ? Star : achievement.milestone === 50 ? Target : Zap;
      case 'streak': return Flame;
      case 'weight-loss': return TrendingDown;
      default: return Star;
    }
  };

  const getColors = (achievement: Achievement) => {
    switch (achievement.type) {
      case 'goal': return 'border-success bg-success/5';
      case 'milestone': return 'border-primary bg-primary/5';
      case 'streak': return 'border-orange-500 bg-orange-500/5';
      case 'weight-loss': return 'border-green-500 bg-green-500/5';
      default: return 'border-primary bg-primary/5';
    }
  };

  const getIconColors = (achievement: Achievement) => {
    switch (achievement.type) {
      case 'goal': return 'text-success';
      case 'milestone': return 'text-primary';
      case 'streak': return 'text-orange-500';
      case 'weight-loss': return 'text-green-500';
      default: return 'text-primary';
    }
  };

  if (achievements.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm">
      {achievements.map((achievement) => {
        const Icon = getIcon(achievement);
        const colors = getColors(achievement);
        const iconColors = getIconColors(achievement);

        return (
          <Card 
            key={achievement.id}
            className={`p-4 ${colors} border-2 animate-slide-in-right shadow-lg backdrop-blur-sm`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full bg-background/50 animate-bounce`}>
                <Icon className={`h-5 w-5 ${iconColors}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm mb-1 animate-pulse-glow">
                  {achievement.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {achievement.description}
                </p>
                
                {achievement.milestone && (
                  <div className="mt-2 w-full bg-secondary/30 rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${achievement.milestone}%` }}
                    />
                  </div>
                )}
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dismissAchievement(achievement.id)}
                className="h-6 w-6 p-0 hover:bg-background/50"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};