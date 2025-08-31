import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DailyNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
}

const NutritionProfile = () => {
  const { user } = useAuth();
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition>({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Daily targets (can be made configurable later)
  const targets = {
    calories: 2000,
    protein: 150, // grams
    carbs: 250,   // grams  
    fat: 67,      // grams
    fiber: 25     // grams
  };

  useEffect(() => {
    const fetchDailyNutrition = async () => {
      if (!user) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: meals, error } = await supabase
          .from('meals')
          .select('kcal, protein_g, carbs_g, fat_g, fiber_g')
          .eq('user_id', user.id)
          .eq('meal_date', today);

        if (error) {
          console.error('Error fetching daily nutrition:', error);
          return;
        }

        if (meals) {
          const totals = meals.reduce((acc, meal) => ({
            totalCalories: acc.totalCalories + Number(meal.kcal),
            totalProtein: acc.totalProtein + Number(meal.protein_g),
            totalCarbs: acc.totalCarbs + Number(meal.carbs_g),
            totalFat: acc.totalFat + Number(meal.fat_g),
            totalFiber: acc.totalFiber + Number(meal.fiber_g)
          }), {
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
            totalFiber: 0
          });

          setDailyNutrition(totals);
        }
      } catch (error) {
        console.error('Error fetching daily nutrition:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyNutrition();
  }, [user]);

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const formatNumber = (num: number, decimals = 1) => {
    return Number(num.toFixed(decimals));
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card shadow-soft border-0">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card shadow-soft border-0">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Daily Nutrition</h3>
        <Target className="h-4 w-4 text-muted-foreground ml-auto" />
      </div>

      <div className="space-y-6">
        {/* Calories */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Calories</span>
            <span className="text-sm text-muted-foreground">
              {formatNumber(dailyNutrition.totalCalories, 0)} / {targets.calories} kcal
            </span>
          </div>
          <Progress 
            value={getProgressPercentage(dailyNutrition.totalCalories, targets.calories)} 
            className="h-2"
          />
        </div>

        {/* Protein */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Protein</span>
            <span className="text-sm text-muted-foreground">
              {formatNumber(dailyNutrition.totalProtein)}g / {targets.protein}g
            </span>
          </div>
          <Progress 
            value={getProgressPercentage(dailyNutrition.totalProtein, targets.protein)} 
            className="h-2"
          />
        </div>

        {/* Carbohydrates */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Carbohydrates</span>
            <span className="text-sm text-muted-foreground">
              {formatNumber(dailyNutrition.totalCarbs)}g / {targets.carbs}g
            </span>
          </div>
          <Progress 
            value={getProgressPercentage(dailyNutrition.totalCarbs, targets.carbs)} 
            className="h-2"
          />
        </div>

        {/* Fat */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Fat</span>
            <span className="text-sm text-muted-foreground">
              {formatNumber(dailyNutrition.totalFat)}g / {targets.fat}g
            </span>
          </div>
          <Progress 
            value={getProgressPercentage(dailyNutrition.totalFat, targets.fat)} 
            className="h-2"
          />
        </div>

        {/* Fiber */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Fiber</span>
            <span className="text-sm text-muted-foreground">
              {formatNumber(dailyNutrition.totalFiber)}g / {targets.fiber}g
            </span>
          </div>
          <Progress 
            value={getProgressPercentage(dailyNutrition.totalFiber, targets.fiber)} 
            className="h-2"
          />
        </div>

        {/* Summary Stats */}
        <div className="pt-4 border-t border-border/20">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {formatNumber(dailyNutrition.totalCalories, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Calories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {formatNumber(dailyNutrition.totalProtein + dailyNutrition.totalCarbs + dailyNutrition.totalFat)}g
              </div>
              <div className="text-xs text-muted-foreground">Total Macros</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default NutritionProfile;