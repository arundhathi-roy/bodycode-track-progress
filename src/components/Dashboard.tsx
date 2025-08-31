import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingDown, TrendingUp, Target, Calendar, LogOut, Plus, Download, Bell, User } from "lucide-react";
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
import { BottomSheet } from "./mobile/BottomSheet";
import { DataExport } from "./data-management/DataExport";
import { WaterIntakeTracker } from "./WaterIntakeTracker";
import { ProgressInsights } from "./help/ProgressInsights";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NotificationSystem } from "./notifications/NotificationSystem";
import FoodRecognition from "./FoodRecognition";
import NutritionProfile from "./NutritionProfile";
import { Link } from "react-router-dom";


const Dashboard = () => {
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [recentEntries, setRecentEntries] = useState<Array<{ id: string; weight: number; entry_date: string; notes?: string }>>([]);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'achievement' | 'reminder' | 'milestone' | 'tip';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>>([]);
  
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

        // Fetch notifications
        const { data: notificationData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (notificationData) {
          setNotifications(notificationData.map(n => ({
            id: n.id,
            type: n.type as 'achievement' | 'reminder' | 'milestone' | 'tip',
            title: n.title,
            message: n.message,
            is_read: n.is_read,
            created_at: n.created_at
          })));
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read);

  const refreshData = async () => {
    // Force refresh user data after updates
    if (user) {
      console.log('🔄 Refreshing user data...');
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_weight, height_inches, goal_weight, gender')
          .eq('user_id', user.id)
          .single();

        console.log('📊 Fresh profile data:', profile);
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

        // Refresh notifications
        const { data: notificationData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (notificationData) {
          setNotifications(notificationData.map(n => ({
            id: n.id,
            type: n.type as 'achievement' | 'reminder' | 'milestone' | 'tip',
            title: n.title,
            message: n.message,
            is_read: n.is_read,
            created_at: n.created_at
          })));
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
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


      <div className="min-h-screen bg-gradient-subtle">
        {/* Top Bar with Sign Out */}
        <div className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 max-w-7xl">
            <div className="flex justify-end">
              <div className="flex items-center gap-1 sm:gap-2">
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      className="bg-background/80 px-2 sm:px-4"
                    >
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline sm:ml-2">Profile</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Profile Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        <strong>Email:</strong> {user?.email}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Current Weight:</strong> {formatWeight(currentWeight)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Height:</strong> {height ? `${Math.floor(height / 12)}'${height % 12}"` : 'Not set'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Gender:</strong> {userProfile?.gender || 'Not set'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Goal Weight:</strong> {formatWeight(goalWeight)}
                      </div>
                      <div className="pt-4">
                        <HeightSetup 
                          onHeightSet={(newHeight) => {
                            handleHeightUpdate(newHeight);
                            refreshData();
                          }} 
                          currentHeight={height} 
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      size={isMobile ? "sm" : "default"}
                      className="bg-background/80 px-2 sm:px-4 relative"
                    >
                      <Bell className="h-4 w-4" />
                      {unreadNotifications.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full"></span>
                      )}
                      <span className="hidden sm:inline sm:ml-2">Notifications</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Notifications</DialogTitle>
                    </DialogHeader>
                    <NotificationSystem
                      userId={user?.id || ''}
                      notifications={notifications.map(n => ({
                        id: n.id,
                        type: n.type,
                        title: n.title,
                        message: n.message,
                        isRead: n.is_read,
                        createdAt: new Date(n.created_at)
                      }))}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  </DialogContent>
                </Dialog>
                
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
              src="/lovable-uploads/photo-output.PNG" 
              alt="BodyCode Logo" 
              className="h-24 sm:h-28 md:h-32 lg:h-40 mx-auto mb-3 sm:mb-4"
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
        
        {/* Nutrition Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
          {/* Nutrition Profile - Daily totals */}
          <div className="lg:col-span-1">
            <NutritionProfile />
          </div>

          {/* Calories Tracker */}
          <div className="lg:col-span-2">
            <FoodRecognition />
          </div>
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
          
          {/* Menstrual Cycle Tracker - Only visible for female users */}
          {(() => {
            console.log('🔍 Debug - userProfile:', userProfile);
            console.log('🔍 Debug - gender value:', userProfile?.gender);
            console.log('🔍 Debug - condition result:', userProfile?.gender === 'female');
            return userProfile?.gender === 'female';
          })() && (
            <div className="w-full">
              <MenstrualCycleTracker />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Goal Progress */}
          <div className="space-y-4 sm:space-y-6">
            {/* Goal Progress */}
            <Card className="p-4 sm:p-6 md:p-8 bg-gradient-card shadow-elegant border-0 overflow-hidden relative group animate-fade-in">
              {/* Background decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-12 translate-x-12 transition-transform duration-500 group-hover:scale-110"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-success/3 rounded-full translate-y-8 -translate-x-8 transition-transform duration-500 group-hover:scale-105"></div>
              <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-primary/2 rounded-full translate-x-8 transition-transform duration-700 group-hover:rotate-12"></div>
              
              <div className="relative z-10 space-y-8">
                {/* Header with enhanced styling */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl backdrop-blur-sm border border-primary/20 shadow-inner">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">Goal Progress</h3>
                      <p className="text-sm text-muted-foreground">Track your journey to success</p>
                    </div>
                  </div>
                  
                  {/* Progress Badge */}
                  {currentWeight && goalWeight && (
                    <div className="px-4 py-2 bg-primary/10 rounded-full border border-primary/20 shadow-soft">
                      <span className="text-sm font-bold text-primary">
                        {Math.round(progressToGoal)}% Complete
                      </span>
                    </div>
                  )}
                </div>

                {/* Current vs Goal Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 bg-background/50 rounded-2xl border border-border/50 backdrop-blur-sm hover-scale transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Current Weight</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                      {formatWeight(currentWeight)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="p-6 bg-background/50 rounded-2xl border border-border/50 backdrop-blur-sm hover-scale transition-all duration-300 group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-success rounded-full"></div>
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Target Weight</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                      {goalWeight ? formatWeight(goalWeight) : 'Not set'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {goalWeight && currentWeight ? 
                        `${Math.abs(currentWeight - goalWeight) < 1 ? 'Almost there!' : 
                          currentWeight > goalWeight ? 'Weight loss goal' : 'Weight gain goal'}` : 
                        'Set your target below'
                      }
                    </p>
                  </div>
                </div>

                {/* Weekly Progress Indicators */}
                {weightEntries.length > 0 && (
                  <div className="p-5 bg-background/30 rounded-xl border border-border/30 space-y-4">
                    <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      Weekly Snapshot
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">This Week</p>
                        <p className="font-bold text-foreground">
                          {changeFromYesterday !== null ? 
                            `${changeFromYesterday > 0 ? '+' : ''}${convertWeight(changeFromYesterday, 'lbs', weightUnit).toFixed(1)}` : 
                            '0.0'
                          }
                        </p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Total Change</p>
                        <p className="font-bold text-foreground">
                          {totalChange !== null ? 
                            `${totalChange > 0 ? '+' : ''}${convertWeight(totalChange, 'lbs', weightUnit).toFixed(1)}` : 
                            '0.0'
                          }
                        </p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Days Tracking</p>
                        <p className="font-bold text-foreground">{weightEntries.length}</p>
                      </div>
                      <div className="text-center p-3 bg-background/50 rounded-xl">
                        <p className="text-xs text-muted-foreground mb-1">Avg/Week</p>
                        <p className="font-bold text-foreground">
                          {totalChange !== null && weightEntries.length > 7 ? 
                            `${(totalChange / (weightEntries.length / 7)).toFixed(1)}` : 
                            '0.0'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Goal Weight Slider */}
                {height && (
                  <div className="space-y-6">
                    <div className="p-5 bg-background/30 rounded-xl border border-border/30">
                      <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        Set Your Goal Weight
                      </h4>
                      
                      <div className="flex flex-col sm:flex-row justify-between text-sm text-muted-foreground space-y-1 sm:space-y-0 mb-4">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-success rounded-full"></div>
                          Healthy Range: {convertWeight(healthyRange.min, 'lbs', weightUnit).toFixed(1)}-{convertWeight(healthyRange.max, 'lbs', weightUnit).toFixed(1)} {weightUnit}
                        </span>
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          BMI Range: 18.5-24.9
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <Slider
                          value={[goalWeight || healthyRange.min]}
                          onValueChange={(value) => handleGoalWeightUpdate(value[0])}
                          max={healthyRange.max}
                          min={healthyRange.min}
                          step={weightUnit === 'kg' ? 0.25 : 0.5}
                          className="w-full"
                        />
                        <div className="text-center">
                          <span className="text-lg font-bold text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                            Target: {goalWeight ? formatWeight(goalWeight) : 'Set your goal'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Animated Progress Bar */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      Progress Tracker
                    </h4>
                    <span className="text-xl font-bold text-primary">{Math.round(progressToGoal)}%</span>
                  </div>
                  
                  <div className="relative space-y-2">
                    <Progress 
                      value={Math.min(progressToGoal, 100)} 
                      className="h-6 bg-muted/50 overflow-hidden animate-scale-in shadow-inner"
                    />
                    {progressToGoal >= 100 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-white drop-shadow-lg animate-bounce">🎉 Goal Achieved!</span>
                      </div>
                    )}
                    
                    {/* Progress milestones */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className={progressToGoal >= 25 ? 'text-success font-medium' : ''}>25%</span>
                      <span className={progressToGoal >= 50 ? 'text-success font-medium' : ''}>50%</span>
                      <span className={progressToGoal >= 75 ? 'text-success font-medium' : ''}>75%</span>
                      <span className={progressToGoal >= 100 ? 'text-success font-medium' : ''}>100%</span>
                    </div>
                  </div>
                </div>

                {/* Motivational Status Message */}
                <div className="p-6 bg-gradient-to-r from-primary/5 to-success/5 rounded-2xl border border-primary/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      {progressToGoal >= 100 ? '🎉' : progressToGoal >= 75 ? '🔥' : progressToGoal >= 50 ? '💪' : progressToGoal >= 25 ? '⭐' : '🚀'}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {currentWeight && goalWeight 
                          ? progressToGoal >= 100
                            ? "Amazing! You've crushed your goal!"
                            : progressToGoal >= 75
                            ? "You're so close to your goal!"
                            : progressToGoal >= 50
                            ? "Halfway there - keep it up!"
                            : progressToGoal >= 25
                            ? "Great progress - stay motivated!"
                            : "Every journey begins with a single step"
                          : height ? '✨ Set your goal weight above to start tracking' : '📏 Set your height first to enable goal setting'
                        }
                      </p>
                      {currentWeight && goalWeight && (
                        <p className="text-sm text-muted-foreground">
                          {progressToGoal < 100 && `Only ${convertWeight(Math.abs(currentWeight - goalWeight), 'lbs', weightUnit).toFixed(1)} ${weightUnit} to go!`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Goal Timeline Estimate */}
                {currentWeight && goalWeight && totalChange !== null && weightEntries.length > 7 && (
                  <div className="p-5 bg-background/30 rounded-xl border border-border/30">
                    <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      Timeline Estimate
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-background/50 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">At Current Pace</p>
                        <p className="text-xl font-bold text-foreground">
                          {Math.abs(totalChange) > 0.1 ? 
                            `${Math.ceil(Math.abs((currentWeight - goalWeight) / (totalChange / (weightEntries.length / 7))))} weeks` : 
                            'Stay consistent!'
                          }
                        </p>
                      </div>
                      <div className="p-4 bg-background/50 rounded-xl">
                        <p className="text-sm text-muted-foreground mb-1">Recommended Pace</p>
                        <p className="text-xl font-bold text-foreground">
                          {Math.ceil(Math.abs((currentWeight - goalWeight) / (weightUnit === 'kg' ? 0.45 : 1)))} weeks
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

          </div>
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