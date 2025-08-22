import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Target, Calendar, LogOut } from "lucide-react";
import { WeightChart } from "./WeightChart";
import { WeightEntryForm } from "./WeightEntryForm";
import { BMICard } from "./BMICard";
import { HeightSetup } from "./HeightSetup";
import { BMIChart } from "./BMIChart";
import { LogoProcessor } from "./LogoProcessor";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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
  const yesterdayWeight = weightEntries.length >= 2 ? weightEntries[1].weight : null;
  const changeFromYesterday = currentWeight && yesterdayWeight ? currentWeight - yesterdayWeight : null;
  
  // Calculate total change (from first entry to current)
  const startWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const totalChange = currentWeight && startWeight ? currentWeight - startWeight : null;
  
  // Calculate progress to goal
  const progressToGoal = currentWeight && goalWeight && startWeight 
    ? ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100 
    : 0;
  
  const previousBMI = height && yesterdayWeight ? ((yesterdayWeight / (height * height)) * 703) : null;

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
            <p className="text-muted-foreground">Track your journey to a healthier you</p>
          </div>
          
          <Button 
            onClick={signOut}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentWeight ? `${currentWeight} lbs` : 'No data'}
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
                        {changeFromYesterday > 0 ? '+' : ''}{changeFromYesterday.toFixed(1)} lbs
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
                  {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)} lbs` : 'No data'}
                </p>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <Target className="h-6 w-6 text-success" />
              </div>
            </div>
          </Card>

          {/* BMI Card */}
          {height && (
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
            <h2 className="text-xl font-semibold mb-4 text-foreground">Weight Trend</h2>
            <WeightChart />
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
          {/* Goal Progress & Quick Entry */}
          <div className="space-y-6">
            {/* Goal Progress */}
            <Card className="p-6 bg-gradient-card shadow-medium border-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Goal Progress</h3>
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Current: {currentWeight ? `${currentWeight} lbs` : 'No data'}
                  </span>
                  <span className="text-muted-foreground">
                    Goal: {goalWeight ? `${goalWeight} lbs` : 'Not set'}
                  </span>
                </div>
                <Progress value={Math.min(progressToGoal, 100)} className="h-3" />
                <p className="text-sm text-center text-muted-foreground">
                  {currentWeight && goalWeight 
                    ? `${Math.max(0, currentWeight - goalWeight).toFixed(1)} lbs to go`
                    : 'Set your goal weight to track progress'
                  }
                </p>
              </div>
            </Card>

            {/* Quick Weight Entry */}
            <Card className="p-6 bg-gradient-card shadow-medium border-0">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Entry</h3>
              <WeightEntryForm />
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