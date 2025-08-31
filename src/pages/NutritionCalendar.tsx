import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft, Utensils } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface MealEntry {
  id: string;
  food_name: string;
  meal_type: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  notes?: string;
  created_at: string;
}

const NutritionCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMealsForDate = async (date: Date) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('meal_date', dateString)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching meals:', error);
        toast({
          title: "Error",
          description: "Failed to load nutrition data",
          variant: "destructive"
        });
        return;
      }

      setMeals(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load nutrition data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMealsForDate(selectedDate);
  }, [selectedDate, user]);

  const getTotalNutrition = () => {
    return meals.reduce(
      (totals, meal) => ({
        kcal: totals.kcal + Number(meal.kcal),
        protein: totals.protein + Number(meal.protein_g),
        carbs: totals.carbs + Number(meal.carbs_g),
        fat: totals.fat + Number(meal.fat_g),
        fiber: totals.fiber + Number(meal.fiber_g),
        grams: totals.grams + Number(meal.grams)
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, grams: 0 }
    );
  };

  const groupMealsByType = () => {
    const grouped: { [key: string]: MealEntry[] } = {};
    meals.forEach(meal => {
      if (!grouped[meal.meal_type]) {
        grouped[meal.meal_type] = [];
      }
      grouped[meal.meal_type].push(meal);
    });
    return grouped;
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '🌞';
      case 'dinner':
        return '🌙';
      case 'snack':
        return '🍎';
      default:
        return '🍽️';
    }
  };

  const totals = getTotalNutrition();
  const groupedMeals = groupMealsByType();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-card shadow-soft border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Utensils className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Nutrition Calendar</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Date Selection */}
          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <h2 className="text-lg font-semibold text-foreground mb-4">Select Date</h2>
            <div className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="flex-1"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday);
                  }}
                  className="flex-1"
                >
                  Yesterday
                </Button>
              </div>
            </div>
          </Card>

          {/* Nutrition Summary */}
          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Daily Summary - {format(selectedDate, "MMM d, yyyy")}
            </h2>
            
            {isLoading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : meals.length === 0 ? (
              <div className="text-center text-muted-foreground">
                No nutrition data for this date
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totals.kcal}</div>
                    <div className="text-xs text-muted-foreground">Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{totals.grams}g</div>
                    <div className="text-xs text-muted-foreground">Total Weight</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>🥩 Protein:</span>
                    <span className="font-medium">{totals.protein.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🍞 Carbs:</span>
                    <span className="font-medium">{totals.carbs.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🥑 Fat:</span>
                    <span className="font-medium">{totals.fat.toFixed(1)}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🌾 Fiber:</span>
                    <span className="font-medium">{totals.fiber.toFixed(1)}g</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Meal Details */}
          <div className="md:col-span-2 lg:col-span-1">
            <Card className="p-6 bg-gradient-card shadow-soft border-0">
              <h2 className="text-lg font-semibold text-foreground mb-4">Meal Details</h2>
              
              {isLoading ? (
                <div className="text-center text-muted-foreground">Loading meals...</div>
              ) : meals.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  No meals logged for this date
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(groupedMeals).map(([mealType, mealEntries]) => (
                    <div key={mealType} className="space-y-2">
                      <h3 className="font-medium text-foreground flex items-center gap-2">
                        <span>{getMealTypeIcon(mealType)}</span>
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </h3>
                      
                      {mealEntries.map((meal) => (
                        <div key={meal.id} className="bg-background/50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-sm">{meal.food_name}</div>
                            <div className="text-sm text-muted-foreground">{meal.grams}g</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>🔥 {meal.kcal} kcal</div>
                            <div>🥩 {meal.protein_g}g protein</div>
                            <div>🍞 {meal.carbs_g}g carbs</div>
                            <div>🥑 {meal.fat_g}g fat</div>
                          </div>
                          {meal.notes && (
                            <div className="text-xs text-muted-foreground mt-2 italic">
                              {meal.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NutritionCalendar;