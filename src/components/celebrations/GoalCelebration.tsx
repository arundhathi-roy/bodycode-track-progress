import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Star, Zap } from 'lucide-react';
import { triggerGoalCelebration, triggerMilestoneCelebration } from '@/utils/confetti';

interface GoalCelebrationProps {
  currentWeight: number | null;
  goalWeight: number | null;
  weightUnit: 'lbs' | 'kg';
  onDismiss: () => void;
  type: 'goal' | 'milestone';
  milestone?: number; // 25, 50, 75, 100
}

export const GoalCelebration = ({
  currentWeight,
  goalWeight,
  weightUnit,
  onDismiss,
  type,
  milestone
}: GoalCelebrationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    if (type === 'goal') {
      triggerGoalCelebration();
    } else {
      triggerMilestoneCelebration();
    }
  }, [type]);

  const getIcon = () => {
    if (type === 'goal') return Trophy;
    return milestone === 25 ? Star : milestone === 50 ? Target : milestone === 75 ? Zap : Trophy;
  };

  const getTitle = () => {
    if (type === 'goal') return '🎉 Goal Achieved!';
    return `🌟 ${milestone}% Milestone Reached!`;
  };

  const getDescription = () => {
    if (type === 'goal') {
      return `Congratulations! You've reached your goal weight of ${goalWeight} ${weightUnit}!`;
    }
    return `You're ${milestone}% of the way to your goal! Keep up the amazing work!`;
  };

  const Icon = getIcon();

  return (
    <div className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <Card className={`p-6 max-w-md w-full text-center animate-bounce-in bg-gradient-to-br from-background to-secondary/20 border-2 ${
        type === 'goal' ? 'border-success' : 'border-primary'
      }`}>
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-celebrate ${
          type === 'goal' ? 'bg-success/20' : 'bg-primary/20'
        }`}>
          <Icon className={`h-8 w-8 ${
            type === 'goal' ? 'text-success' : 'text-primary'
          }`} />
        </div>
        
        <h2 className="text-2xl font-bold mb-2 animate-pulse-glow">
          {getTitle()}
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {getDescription()}
        </p>
        
        {currentWeight && goalWeight && (
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Current: {currentWeight} {weightUnit}</span>
              <span>Goal: {goalWeight} {weightUnit}</span>
            </div>
            {type === 'milestone' && milestone && (
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${milestone}%` }}
                />
              </div>
            )}
          </div>
        )}
        
        <Button onClick={onDismiss} className="w-full">
          Continue Your Journey
        </Button>
      </Card>
    </div>
  );
};