import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, TrendingUp, Target, Calendar, LogOut, Settings } from "lucide-react";
import { WeightChart } from "./WeightChart";
import { WeightEntryForm } from "./WeightEntryForm";
import { RecentWeightEntries } from "./RecentWeightEntries";
import { BMICard } from "./BMICard";
import { HeightSetup } from "./HeightSetup";
import { BMIChart } from "./BMIChart";
import { LogoProcessor } from "./LogoProcessor";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  
  // Real data states
  const [userProfile, setUserProfile] = useState<{
    current_weight: number | null;
    height_inches: number | null;
    goal_weight: number | null;
  } | null>(null);
  const [weightEntries, setWeightEntries] = useState<Array<{
    weight: number;
    entry_date: string;
  }>>([]);

  // Load unit preference from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem('weightUnit') as 'lbs' | 'kg';
    if (savedUnit) {
      setWeightUnit(savedUnit);
    }
  }, []);

  // Weight conversion utilities
  const lbsToKg = (lbs: number) => lbs / 2.20462;
  const kgToLbs = (kg: number) => kg * 2.20462;
  
  const convertWeight = (weight: number, fromUnit: 'lbs' | 'kg', toUnit: 'lbs' | 'kg') => {
    if (fromUnit === toUnit) return weight;
    return fromUnit === 'lbs' ? lbsToKg(weight) : kgToLbs(weight);
  };

  const formatWeight = (weight: number | null) => {
    if (weight === null) return 'No data';
    const convertedWeight = convertWeight(weight, 'lbs', weightUnit);
    return `${convertedWeight.toFixed(1)} ${weightUnit}`;
  };

  const handleUnitChange = (newUnit: 'lbs' | 'kg') => {
    setWeightUnit(newUnit);
    localStorage.setItem('weightUnit', newUnit);
  };

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('current_weight, height_inches, goal_weight')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        } else if (profile) {
          setUserProfile(profile);
        }

        // Fetch recent weight entries for calculations
        const { data: entries, error: entriesError } = await supabase
          .from('weight_entries')
          .select('weight, entry_date')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })
          .limit(10);

        if (entriesError) {
          console.error('Error fetching weight entries:', entriesError);
        } else if (entries) {
          setWeightEntries(entries);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // Calculate derived values from real data
  const currentWeight = userProfile?.current_weight || null;
  const height = userProfile?.height_inches || null;
  const goalWeight = userProfile?.goal_weight || null;
  
  // Calculate yesterday's change (if we have at least 2 entries)
  const yesterdayWeight = weightEntries.length >= 2 ? weightEntries[1]?.weight : null;
  const changeFromYesterday = (currentWeight !== null && yesterdayWeight !== null) 
    ? currentWeight - yesterdayWeight 
    : null;
  
  // Calculate total change (from first entry to current)
  const startWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1]?.weight : null;
  const totalChange = (currentWeight !== null && startWeight !== null) 
    ? currentWeight - startWeight 
    : null;
  
  // Calculate progress to goal
  const progressToGoal = (currentWeight !== null && goalWeight !== null && startWeight !== null) 
    ? ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100 
    : 0;
  
  const previousBMI = (height !== null && yesterdayWeight !== null) 
    ? ((yesterdayWeight / (height * height)) * 703) 
    : null;

  // Handle height updates
  const handleHeightUpdate = async (newHeight: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ height_inches: newHeight })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setUserProfile(prev => prev ? { ...prev, height_inches: newHeight } : null);
    } catch (error) {
      console.error('Error updating height:', error);
    }
  };

  // Handle goal weight updates
  const handleGoalWeightUpdate = async (newGoalWeight: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ goal_weight: newGoalWeight })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setUserProfile(prev => prev ? { ...prev, goal_weight: newGoalWeight } : null);
    } catch (error) {
      console.error('Error updating goal weight:', error);
    }
  };

  // Calculate healthy weight range based on BMI
  const getHealthyWeightRange = () => {
    if (!height) return { min: 100, max: 250 }; // Default range if no height
    
    const heightSquared = height * height;
    const minHealthyWeight = Math.round((18.5 * heightSquared) / 703);
    const maxHealthyWeight = Math.round((24.9 * heightSquared) / 703);
    
    return { min: minHealthyWeight, max: maxHealthyWeight };
  };

  const healthyRange = getHealthyWeightRange();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            {!processedLogoUrl && <LogoProcessor onProcessed={setProcessedLogoUrl} />}
            {processedLogoUrl && (
              <img 
                src={processedLogoUrl} 
                alt="BodyCode Logo" 
                className="h-16 mx-auto mb-4"
              />
            )}
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground">Crack the Code to a Better Body</p>
          </div>
          
          <div className="flex items-center gap-3 mt-4">
            {/* Unit Selector */}
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Select value={weightUnit} onValueChange={handleUnitChange}>
                <SelectTrigger className="w-20 h-8 text-sm bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-0 w-20 bg-background border-border z-50">
                  <SelectItem value="lbs" className="text-sm">lbs</SelectItem>
                  <SelectItem value="kg" className="text-sm">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={signOut}
              variant="outline"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatWeight(currentWeight)}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Yesterday's Change</p>
                  <div className="flex items-center gap-2">
                    {changeFromYesterday !== null ? (
                      <>
                        <p className={`text-2xl font-bold ${changeFromYesterday < 0 ? 'text-success' : 'text-warning'}`}>
                          {changeFromYesterday > 0 ? '+' : ''}{convertWeight(changeFromYesterday, 'lbs', weightUnit).toFixed(1)} {weightUnit}
                        </p>
                        {changeFromYesterday < 0 ? (
                          <TrendingDown className="h-5 w-5 text-success" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-warning" />
                        )}
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-muted-foreground">No data</p>
                    )}
                  </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Progress</p>
                <p className={`text-2xl font-bold ${totalChange && totalChange < 0 ? 'text-success' : totalChange && totalChange > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                  {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${convertWeight(totalChange, 'lbs', weightUnit).toFixed(1)} ${weightUnit}` : 'No data'}
                </p>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <Target className="h-6 w-6 text-success" />
              </div>
            </div>
          </Card>

          {/* BMI Card */}
          {height && currentWeight && (
            <BMICard 
              currentWeight={currentWeight} 
              height={height} 
              previousBMI={previousBMI} 
            />
          )}
        </div>

        {/* Height Setup (if not set) */}
        {!height && (
          <div className="mb-8">
            <HeightSetup onHeightSet={handleHeightUpdate} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weight Chart */}
          <Card className="p-6 bg-gradient-card shadow-medium border-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Weight Trend</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-blue-500 to-red-500 hover:from-blue-600 hover:to-red-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-soft"
                  >
                    Log today's weight
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Log Today's Weight</DialogTitle>
                  </DialogHeader>
                  <WeightEntryForm weightUnit={weightUnit} />
                </DialogContent>
              </Dialog>
            </div>
            <WeightChart weightUnit={weightUnit} />
          </Card>

          {/* BMI Chart */}
          {height && (
            <Card className="p-6 bg-gradient-card shadow-medium border-0">
              <h2 className="text-xl font-semibold mb-4 text-foreground">BMI Trend</h2>
              <BMIChart height={height} />
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Goal Progress */}
          <div className="space-y-6">
            {/* Goal Progress */}
            <Card className="p-6 bg-gradient-card shadow-medium border-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Goal Progress</h3>
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Current: {formatWeight(currentWeight)}
                  </span>
                  <span className="text-muted-foreground">
                    Goal: {goalWeight ? formatWeight(goalWeight) : 'Not set'}
                  </span>
                </div>
                
                {/* Goal Weight Slider */}
                {height && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Healthy range: {convertWeight(healthyRange.min, 'lbs', weightUnit).toFixed(1)}-{convertWeight(healthyRange.max, 'lbs', weightUnit).toFixed(1)} {weightUnit}</span>
                      <span>BMI: 18.5-24.9</span>
                    </div>
                    <Slider
                      value={[goalWeight || healthyRange.min]}
                      onValueChange={(value) => handleGoalWeightUpdate(value[0])}
                      max={healthyRange.max}
                      min={healthyRange.min}
                      step={weightUnit === 'kg' ? 0.25 : 0.5}
                      className="w-full"
                    />
                    <div className="text-center">
                      <span className="text-sm font-medium text-primary">
                        {goalWeight ? formatWeight(goalWeight) : 'Set your goal'}
                      </span>
                    </div>
                  </div>
                )}
                
                <Progress value={Math.min(progressToGoal, 100)} className="h-3" />
                <p className="text-sm text-center text-muted-foreground">
                  {currentWeight && goalWeight 
                    ? `${convertWeight(Math.max(0, currentWeight - goalWeight), 'lbs', weightUnit).toFixed(1)} ${weightUnit} to go`
                    : height ? 'Use the slider above to set your goal weight' : 'Set your height first to enable goal setting'
                  }
                </p>
              </div>
            </Card>

            {/* Recent Weight Entries */}
            <Card className="p-6 bg-gradient-card shadow-medium border-0">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Recent Entries</h3>
              <RecentWeightEntries weightUnit={weightUnit} />
            </Card>
          </div>

          {/* Height Setup Card */}
          {height && (
            <div className="space-y-6">
              <HeightSetup onHeightSet={handleHeightUpdate} currentHeight={height} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;