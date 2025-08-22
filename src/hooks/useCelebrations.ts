import { useEffect, useState } from 'react';
import { triggerGoalCelebration, triggerMilestoneCelebration, triggerConfetti } from '@/utils/confetti';

export interface Achievement {
  id: string;
  type: 'goal' | 'milestone' | 'streak' | 'weight-loss';
  title: string;
  description: string;
  milestone?: number;
  timestamp: Date;
}

interface UseCelebrationsProps {
  currentWeight: number | null;
  goalWeight: number | null;
  startWeight: number | null;
  recentEntries: Array<{ entry_date: string; weight: number }>;
  weightUnit: 'lbs' | 'kg';
}

export const useCelebrations = ({
  currentWeight,
  goalWeight,
  startWeight,
  recentEntries,
  weightUnit
}: UseCelebrationsProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [shownAchievements, setShownAchievements] = useState<Set<string>>(new Set());

  // Check for goal achievement
  useEffect(() => {
    if (currentWeight && goalWeight && startWeight) {
      const goalAchieved = Math.abs(currentWeight - goalWeight) <= 0.5; // Within 0.5 units
      
      if (goalAchieved && !shownAchievements.has('goal-achieved')) {
        const achievement: Achievement = {
          id: 'goal-achieved',
          type: 'goal',
          title: '🎉 Goal Achieved!',
          description: `Congratulations! You've reached your goal weight of ${goalWeight} ${weightUnit}!`,
          timestamp: new Date()
        };
        
        setAchievements(prev => [...prev, achievement]);
        setShownAchievements(prev => new Set(prev).add('goal-achieved'));
        triggerGoalCelebration();
      }
    }
  }, [currentWeight, goalWeight, startWeight, weightUnit, shownAchievements]);

  // Check for milestone achievements (25%, 50%, 75%)
  useEffect(() => {
    if (currentWeight && goalWeight && startWeight) {
      const totalProgress = Math.abs(startWeight - currentWeight);
      const totalGoal = Math.abs(startWeight - goalWeight);
      const progressPercentage = (totalProgress / totalGoal) * 100;

      const milestones = [25, 50, 75];
      milestones.forEach(milestone => {
        const achievementId = `milestone-${milestone}`;
        if (progressPercentage >= milestone && !shownAchievements.has(achievementId)) {
          const achievement: Achievement = {
            id: achievementId,
            type: 'milestone',
            title: `🌟 ${milestone}% Milestone!`,
            description: `You're ${milestone}% of the way to your goal! Keep up the amazing work!`,
            milestone,
            timestamp: new Date()
          };
          
          setAchievements(prev => [...prev, achievement]);
          setShownAchievements(prev => new Set(prev).add(achievementId));
          triggerMilestoneCelebration();
        }
      });
    }
  }, [currentWeight, goalWeight, startWeight, shownAchievements]);

  // Check for logging streaks
  useEffect(() => {
    if (recentEntries.length >= 7) {
      const last7Days = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        last7Days.push(date.toISOString().split('T')[0]);
      }

      const hasAllDays = last7Days.every(date => 
        recentEntries.some(entry => entry.entry_date === date)
      );

      if (hasAllDays && !shownAchievements.has('7-day-streak')) {
        const achievement: Achievement = {
          id: '7-day-streak',
          type: 'streak',
          title: '🔥 7-Day Streak!',
          description: 'Congratulations on logging your weight for 7 days straight!',
          timestamp: new Date()
        };
        
        setAchievements(prev => [...prev, achievement]);
        setShownAchievements(prev => new Set(prev).add('7-day-streak'));
        triggerConfetti({
          particleCount: 150,
          spread: 100,
          colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFD93D']
        });
      }
    }
  }, [recentEntries, shownAchievements]);

  // Check for significant weight loss
  useEffect(() => {
    if (currentWeight && startWeight) {
      const weightLoss = startWeight - currentWeight;
      const significantMilestones = [5, 10, 15, 20, 25]; // Weight loss milestones
      
      significantMilestones.forEach(milestone => {
        const achievementId = `weight-loss-${milestone}`;
        if (weightLoss >= milestone && !shownAchievements.has(achievementId)) {
          const achievement: Achievement = {
            id: achievementId,
            type: 'weight-loss',
            title: `💪 ${milestone} ${weightUnit} Lost!`,
            description: `Amazing progress! You've lost ${milestone} ${weightUnit}!`,
            timestamp: new Date()
          };
          
          setAchievements(prev => [...prev, achievement]);
          setShownAchievements(prev => new Set(prev).add(achievementId));
          triggerConfetti({
            particleCount: 100,
            spread: 80,
            colors: ['#00C851', '#FFD93D', '#FF6B6B']
          });
        }
      });
    }
  }, [currentWeight, startWeight, weightUnit, shownAchievements]);

  const dismissAchievement = (achievementId: string) => {
    setAchievements(prev => prev.filter(a => a.id !== achievementId));
  };

  const clearAllAchievements = () => {
    setAchievements([]);
  };

  return {
    achievements,
    dismissAchievement,
    clearAllAchievements
  };
};