import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Target, Calendar } from "lucide-react";
import { WeightChart } from "./WeightChart";
import { WeightEntryForm } from "./WeightEntryForm";
import { BMICard } from "./BMICard";
import { HeightSetup } from "./HeightSetup";
import { BMIChart } from "./BMIChart";
import { useState } from "react";

const Dashboard = () => {
  // Height state (in inches)
  const [height, setHeight] = useState<number | null>(68); // Default 5'8" for demo
  
  // Mock data for demonstration
  const currentWeight = 165.2;
  const yesterdayWeight = 166.1;
  const startWeight = 180.0;
  const goalWeight = 160.0;
  const previousBMI = height ? ((yesterdayWeight / (height * height)) * 703) : null;
  const changeFromYesterday = currentWeight - yesterdayWeight;
  const totalChange = currentWeight - startWeight;
  const progressToGoal = ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/lovable-uploads/18716076-4e90-48b2-8969-fd4bdea3b01f.png" 
            alt="BodyCode Logo" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Track your journey to a healthier you</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
                <p className="text-2xl font-bold text-foreground">{currentWeight} lbs</p>
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
                  <p className={`text-2xl font-bold ${changeFromYesterday < 0 ? 'text-success' : 'text-warning'}`}>
                    {changeFromYesterday > 0 ? '+' : ''}{changeFromYesterday.toFixed(1)} lbs
                  </p>
                  {changeFromYesterday < 0 ? (
                    <TrendingDown className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-warning" />
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card shadow-soft border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Progress</p>
                <p className={`text-2xl font-bold ${totalChange < 0 ? 'text-success' : 'text-warning'}`}>
                  {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} lbs
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
            <HeightSetup onHeightSet={setHeight} />
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
                  <span className="text-muted-foreground">Current: {currentWeight} lbs</span>
                  <span className="text-muted-foreground">Goal: {goalWeight} lbs</span>
                </div>
                <Progress value={Math.min(progressToGoal, 100)} className="h-3" />
                <p className="text-sm text-center text-muted-foreground">
                  {Math.max(0, currentWeight - goalWeight).toFixed(1)} lbs to go
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
              <HeightSetup onHeightSet={setHeight} currentHeight={height} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;