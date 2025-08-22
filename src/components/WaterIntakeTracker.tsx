import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Minus, Droplets, Download, Wine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WaterEntry {
  id: string;
  user_id: string;
  entry_date: string;
  glasses_consumed: number;
  created_at: string;
  updated_at: string;
}

interface WaterIntakeTrackerProps {
  currentWeight: number | null;
  weightUnit: 'lbs' | 'kg';
}

export const WaterIntakeTracker = ({ currentWeight, weightUnit }: WaterIntakeTrackerProps) => {
  const { user } = useAuth();
  const [todayGlasses, setTodayGlasses] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTodayWaterIntake();
    }
  }, [user]);

  const fetchTodayWaterIntake = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('water_intake')
        .select('glasses_consumed')
        .eq('user_id', user?.id)
        .eq('entry_date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      setTodayGlasses(data?.glasses_consumed || 0);
    } catch (error) {
      console.error('Error fetching water intake:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateWaterIntake = async (newCount: number) => {
    if (!user || newCount < 0) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('water_intake')
        .upsert({
          user_id: user.id,
          entry_date: today,
          glasses_consumed: newCount
        }, {
          onConflict: 'user_id,entry_date'
        });

      if (error) throw error;
      setTodayGlasses(newCount);
    } catch (error) {
      console.error('Error updating water intake:', error);
      toast.error('Failed to update water intake');
    }
  };

  // Calculate recommended water intake based on weight
  const getRecommendedGlasses = () => {
    if (!currentWeight) return 8; // Default 8 glasses
    
    // Convert weight to pounds if needed
    const weightInLbs = weightUnit === 'kg' ? currentWeight * 2.20462 : currentWeight;
    
    // Formula: weight in lbs / 2 = ounces of water needed per day
    // 1 glass = 8 oz, so divide by 8
    const recommendedOunces = weightInLbs / 2;
    const recommendedGlasses = Math.ceil(recommendedOunces / 8);
    
    // Cap between 6-15 glasses for safety
    return Math.max(6, Math.min(15, recommendedGlasses));
  };

  const recommendedGlasses = getRecommendedGlasses();
  const progressPercentage = Math.min((todayGlasses / recommendedGlasses) * 100, 100);

  const addGlass = () => updateWaterIntake(todayGlasses + 1);
  const removeGlass = () => updateWaterIntake(Math.max(0, todayGlasses - 1));

  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-success';
    if (progressPercentage >= 75) return 'bg-primary';
    if (progressPercentage >= 50) return 'bg-warning';
    return 'bg-secondary';
  };

  const getStatusMessage = () => {
    if (progressPercentage >= 100) return 'Great job! 🎉';
    if (progressPercentage >= 75) return 'Almost there! 💪';
    if (progressPercentage >= 50) return 'Good progress! 👍';
    return 'Keep going! 💧';
  };

  if (loading) {
    return (
      <Card className="p-4 md:p-6 bg-gradient-card shadow-medium border-0">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 md:p-4 bg-gradient-card shadow-medium border-0 h-fit">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">Water Intake</h3>
          <Droplets className="h-4 w-4 text-primary" />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 text-xs px-2 py-1">
              <Download className="h-3 w-3" />
              History
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Water Intake History</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Track your daily water intake progress and view historical data.
              </p>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm font-medium">Today's Progress</p>
                <p className="text-2xl font-bold text-primary">{todayGlasses}/{recommendedGlasses} glasses</p>
                <p className="text-xs text-muted-foreground mt-1">{getStatusMessage()}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {/* Today's Progress - Compact */}
        <div className="bg-primary/5 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">Today's Goal</span>
            <span className="text-xs text-muted-foreground">
              {todayGlasses}/{recommendedGlasses} glasses
            </span>
          </div>
          <Progress value={progressPercentage} className="h-1.5 mb-1" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Based on {weightUnit === 'lbs' ? currentWeight : (currentWeight! * 2.20462).toFixed(0)} lbs
            </span>
            <Badge variant={progressPercentage >= 100 ? 'default' : 'secondary'} className="text-xs px-1.5 py-0.5">
              {progressPercentage.toFixed(0)}%
            </Badge>
          </div>
        </div>

        {/* Interactive Controls - Compact */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={removeGlass}
            disabled={todayGlasses === 0}
            className="h-8 w-8 rounded-full"
          >
            <Minus className="h-3 w-3" />
          </Button>
          
          <div className="flex items-center justify-center text-center gap-2">
            <Wine className="h-5 w-5 text-primary/60" />
            <div>
              <div className="text-xl font-bold text-primary">
                {todayGlasses}
              </div>
              <div className="text-xs text-muted-foreground">
                glass{todayGlasses !== 1 ? 'es' : ''}
              </div>
            </div>
            {/* Animated Water Glass - Smaller */}
            <div className={`transition-all duration-300 ${todayGlasses > 0 ? 'animate-bounce' : ''}`}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={`text-blue-500 transition-all duration-300 ${
                  todayGlasses >= recommendedGlasses ? 'text-green-500 scale-110' : 
                  todayGlasses >= recommendedGlasses * 0.75 ? 'text-blue-500 scale-105' :
                  todayGlasses >= recommendedGlasses * 0.5 ? 'text-blue-400' : 'text-gray-400'
                }`}
              >
                {/* Water Glass Shape */}
                <path d="M5 12V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v5M5 12l1 6h12l1-6M5 12h14" />
                {/* Water Level */}
                {todayGlasses > 0 && (
                  <path 
                    d={`M6 ${20 - Math.min(todayGlasses / recommendedGlasses * 8, 8)}h12`}
                    stroke="currentColor" 
                    strokeWidth="6" 
                    opacity="0.6"
                    className="animate-pulse"
                  />
                )}
              </svg>
            </div>
          </div>
          
          <Button
            variant="default"
            size="icon"
            onClick={addGlass}
            className="h-8 w-8 rounded-full"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Status Message - Compact */}
        <div className="text-center">
          <p className="text-xs font-medium text-foreground">{getStatusMessage()}</p>
          <p className="text-xs text-muted-foreground">
            {recommendedGlasses - todayGlasses > 0 
              ? `${recommendedGlasses - todayGlasses} more to go`
              : 'Goal achieved! 🌊'
            }
          </p>
        </div>
      </div>
    </Card>
  );
};