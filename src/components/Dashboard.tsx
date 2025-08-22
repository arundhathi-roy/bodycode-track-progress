import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, TrendingUp, Target, Calendar, LogOut, Plus, Download, Bell } from "lucide-react";
import { WeightChart } from "./WeightChart";
import { WeightEntryForm } from "./WeightEntryForm";
import { RecentWeightEntries } from "./RecentWeightEntries";
import { BMICard } from "./BMICard";
import { HeightSetup } from "./HeightSetup";
import { BMIChart } from "./BMIChart";
import { QuickWeightActions } from "./quick-actions/QuickWeightActions";
import { WeightInsights } from "./insights/WeightInsights";
import { OnboardingWizard } from "./onboarding/OnboardingWizard";
import { AdvancedWeightChart } from "./charts/AdvancedWeightChart";
import { MenstrualCycleTracker } from "./DailyFlowTracker";
import { SwipeableEntry } from "./mobile/SwipeableEntry";
import { SmartCelebrations } from "./celebrations/SmartCelebrations";
import { BottomSheet } from "./mobile/BottomSheet";
import { DataExport } from "./data-management/DataExport";
import { WaterIntakeTracker } from "./WaterIntakeTracker";
import { ProgressInsights } from "./help/ProgressInsights";
import { NotificationSystem } from "./notifications/NotificationSystem";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: 'achievement' | 'reminder' | 'milestone' | 'tip';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [recentEntries, setRecentEntries] = useState<Array<{ id: string; weight: number; entry_date: string; notes?: string }>>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Real data states
  const [userProfile, setUserProfile] = useState<{
    current_weight: number | null;
    height_inches: number | null;
    goal_weight: number | null;
    gender: string | null;
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

  // Initialize notifications
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        type: 'achievement',
        title: '🎉 7-Day Streak!',
        message: 'Congratulations on logging your weight for 7 days straight!',
        isRead: false,
        createdAt: new Date()
      },
      {
        id: '2',
        type: 'milestone',
        title: '🌟 25% to Goal',
        message: 'You\'re a quarter of the way to your goal weight. Keep it up!',
        isRead: false,
        createdAt: new Date(Date.now() - 86400000)
      }
    ];

    setNotifications(sampleNotifications);
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('current_weight, height_inches, goal_weight, gender')
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
          .select('id, weight, entry_date, notes')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })
          .limit(10);

        if (entriesError) {
          console.error('Error fetching weight entries:', entriesError);
        } else if (entries) {
          setWeightEntries(entries);
          setRecentEntries(entries);
        }

        // Check if user is new (no height set) and show onboarding
        if (!profile?.height_inches) {
          setShowOnboarding(true);
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

  const refreshData = () => {
    // Refetch user data after updates
    if (user) {
      const fetchUserData = async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_weight, height_inches, goal_weight, gender')
            .eq('user_id', user.id)
            .single();

          if (profile) setUserProfile(profile);

          const { data: entries } = await supabase
            .from('weight_entries')
            .select('id, weight, entry_date, notes')
            .eq('user_id', user.id)
            .order('entry_date', { ascending: false })
            .limit(10);

          if (entries) {
            setWeightEntries(entries);
            setRecentEntries(entries);
          }
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      };
      fetchUserData();
    }
  };

  // Handle notification mark as read
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

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
    <>
      {/* Onboarding for new users */}
      {showOnboarding && (
        <OnboardingWizard 
          onComplete={() => {
            setShowOnboarding(false);
            refreshData();
          }}
        />
      )}

      {/* Smart Celebrations with Confetti */}
      <SmartCelebrations 
        currentWeight={currentWeight}
        goalWeight={goalWeight}
        startWeight={startWeight}
        recentEntries={recentEntries}
        weightUnit={weightUnit}
      />

      {/* Goal celebrations are triggered automatically by the components when goals are reached */}

      {/* Notification system */}

      <div className="min-h-screen bg-gradient-subtle">
        {/* Top Bar with Sign Out */}
        <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 max-w-7xl">
            <div className="flex justify-end">
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Notification Bell */}
                {user && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size={isMobile ? "sm" : "default"}
                        className="relative bg-background/80 p-2 sm:px-3"
                      >
                        <Bell className="h-4 w-4" />
                        {/* Badge for unread count */}
                        {unreadCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 text-xs p-0 flex items-center justify-center min-w-4 sm:min-w-5"
                          >
                            {unreadCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-[90vw] sm:w-80 p-0 mx-2 sm:mx-0" 
                      align="end"
                      side="bottom"
                      sideOffset={8}
                    >
                      <NotificationSystem 
                        userId={user.id} 
                        notifications={notifications}
                        onMarkAsRead={markNotificationAsRead}
                      />
                    </PopoverContent>
                  </Popover>
                )}
                
                <Button 
                  onClick={signOut}
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  className="bg-background/80 px-2 sm:px-4"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
          {/* Main Header */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <img 
              src="/lovable-uploads/467ae3da-92f0-4349-a90d-c4f23b6a1995.png" 
              alt="BodyCode Logo" 
              className="h-16 sm:h-20 md:h-24 lg:h-28 mx-auto mb-3 sm:mb-4"
            />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 px-2">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground px-2">Crack the Code to a Better Body</p>
            
            {/* Water Intake Widget - Centered */}
            {height && currentWeight && (
              <div className="flex justify-center mt-4 sm:mt-6 md:mt-8 px-2">
                <div className="w-full max-w-md">
                  <WaterIntakeTracker 
                    currentWeight={currentWeight}
                    weightUnit={weightUnit}
                  />
                </div>
              </div>
            )}
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <Card className="p-4 sm:p-5 md:p-6 bg-gradient-card shadow-soft border-0 col-span-1 sm:col-span-2 lg:col-span-1 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-primary/3 rounded-full translate-y-6 -translate-x-6"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Current Weight</h3>
                    <Select value={weightUnit} onValueChange={handleUnitChange}>
                      <SelectTrigger className="w-16 sm:w-18 h-7 text-xs bg-background/80 border-border/50 rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-0 w-16 sm:w-18 bg-background border-border z-50">
                        <SelectItem value="lbs" className="text-xs">lbs</SelectItem>
                        <SelectItem value="kg" className="text-xs">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 tracking-tight">
                      {formatWeight(currentWeight)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Track your progress</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {isMobile ? (
                      <Button 
                        onClick={() => setShowBottomSheet(true)}
                        className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 hover:from-blue-600 hover:via-purple-600 hover:to-red-600 text-white rounded-xl py-3 h-auto font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Log Today's Weight
                      </Button>
                    ) : (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 hover:from-blue-600 hover:via-purple-600 hover:to-red-600 text-white rounded-xl py-3 h-auto font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Log Today's Weight
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] sm:max-w-md mx-auto">
                          <DialogHeader>
                            <DialogTitle>Log Today's Weight</DialogTitle>
                          </DialogHeader>
                          <WeightEntryForm weightUnit={weightUnit} />
                        </DialogContent>
                      </Dialog>
                    )}
                    
                    {/* Export Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full rounded-xl border-border/50 bg-background/50 hover:bg-background/80 backdrop-blur-sm transition-all duration-300">
                          <Download className="h-4 w-4 mr-2" />
                          Export Data
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] sm:max-w-md mx-auto">
                        <DialogHeader>
                          <DialogTitle>Export Weight Data</DialogTitle>
                        </DialogHeader>
                        <DataExport weightUnit={weightUnit} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {/* Icon */}
                <div className="p-3 sm:p-4 bg-primary/10 rounded-2xl ml-3 sm:ml-4 backdrop-blur-sm">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Yesterday's Change</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  {changeFromYesterday !== null ? (
                    <>
                      <p className={`text-lg sm:text-xl md:text-2xl font-bold ${changeFromYesterday < 0 ? 'text-success' : 'text-warning'}`}>
                        {changeFromYesterday > 0 ? '+' : ''}{convertWeight(changeFromYesterday, 'lbs', weightUnit).toFixed(1)} {weightUnit}
                      </p>
                      {changeFromYesterday < 0 ? (
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                      ) : (
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                      )}
                    </>
                  ) : (
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-muted-foreground">No data</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Progress</p>
                </div>
                <p className={`text-lg sm:text-xl md:text-2xl font-bold ${totalChange && totalChange < 0 ? 'text-success' : totalChange && totalChange > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                  {totalChange !== null ? `${totalChange > 0 ? '+' : ''}${convertWeight(totalChange, 'lbs', weightUnit).toFixed(1)} ${weightUnit}` : 'No data'}
                </p>
              </div>
              <div className="p-2 sm:p-2 md:p-3 bg-success/10 rounded-full ml-2 sm:ml-3">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-success" />
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

        {/* Weight Insights */}
        <div className="mb-6 md:mb-8">
          <WeightInsights 
            entries={weightEntries}
            currentWeight={currentWeight}
            goalWeight={goalWeight}
            weightUnit={weightUnit}
          />
        </div>

        {/* Progress Insights */}
        <div className="mb-6 md:mb-8">
          <ProgressInsights 
            currentWeight={currentWeight}
            goalWeight={goalWeight}
            weightEntries={weightEntries}
            weightUnit={weightUnit}
          />
        </div>

        {/* Quick Actions */}
        {currentWeight && (
          <div className="mb-6 md:mb-8">
            <QuickWeightActions 
              currentWeight={currentWeight}
              weightUnit={weightUnit}
              onWeightUpdate={refreshData}
              recentEntries={recentEntries}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          {/* Advanced Weight Chart */}
          <div className="w-full">
            <AdvancedWeightChart 
              weightUnit={weightUnit} 
              goalWeight={goalWeight}
              height={height}
            />
          </div>
          
          {/* Menstrual Cycle Tracker - Only for female users */}
          {userProfile?.gender === 'female' && (
            <div className="w-full">
              <MenstrualCycleTracker />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Goal Progress */}
          <div className="space-y-4 sm:space-y-6">
            {/* Goal Progress */}
            <Card className="p-3 sm:p-4 md:p-6 bg-gradient-card shadow-medium border-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Goal Progress</h3>
                </div>
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
                    <div className="flex flex-col sm:flex-row justify-between text-xs text-muted-foreground space-y-1 sm:space-y-0">
                      <span>Healthy: {convertWeight(healthyRange.min, 'lbs', weightUnit).toFixed(1)}-{convertWeight(healthyRange.max, 'lbs', weightUnit).toFixed(1)} {weightUnit}</span>
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
            <Card className="p-3 sm:p-4 md:p-6 bg-gradient-card shadow-medium border-0">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-foreground">Recent Entries</h3>
              {isMobile ? (
                <div className="space-y-2">
                  {recentEntries.slice(0, 5).map((entry) => (
                    <SwipeableEntry
                      key={entry.id}
                      onEdit={() => {/* Edit functionality */}}
                      onDelete={async () => {
                        try {
                          await supabase
                            .from('weight_entries')
                            .delete()
                            .eq('id', entry.id);
                          refreshData();
                        } catch (error) {
                          console.error('Error deleting entry:', error);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center p-3">
                        <span className="text-sm font-medium">
                          {formatWeight(entry.weight)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </span>
                      </div>
                    </SwipeableEntry>
                  ))}
                </div>
              ) : (
                <RecentWeightEntries weightUnit={weightUnit} />
              )}
            </Card>
          </div>

          {/* Height Setup Card */}
          {height && (
            <div className="space-y-6">
              <HeightSetup onHeightSet={handleHeightUpdate} currentHeight={height} />
            </div>
          )}
        </div>

        {/* Mobile Bottom Sheet for Weight Entry */}
        {isMobile && (
          <BottomSheet
            isOpen={showBottomSheet}
            onClose={() => setShowBottomSheet(false)}
            title="Log Today's Weight"
          >
            <WeightEntryForm weightUnit={weightUnit} />
          </BottomSheet>
        )}
      </div>
    </div>
    </>
  );
};

export default Dashboard;