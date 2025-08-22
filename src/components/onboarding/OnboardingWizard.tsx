import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    height_inches: '',
    current_weight: '',
    goal_weight: '',
    weight_unit: 'lbs' as 'lbs' | 'kg',
    gender: '',
    activity_level: 'moderate',
    goal_type: 'lose_weight'
  });

  const steps = [
    {
      title: 'Personal Information',
      description: 'Tell us about yourself'
    },
    {
      title: 'Physical Information',
      description: 'Let\'s get your measurements'
    },
    {
      title: 'Set Your Goal',
      description: 'What would you like to achieve?'
    },
    {
      title: 'Activity Level',
      description: 'This helps us provide better recommendations'
    }
  ];

  const calculateBMI = (weight: number, heightInches: number) => {
    return (weight / (heightInches * heightInches)) * 703;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal weight', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const getHealthyWeightRange = (heightInches: number, unit: 'lbs' | 'kg') => {
    const minBMI = 18.5;
    const maxBMI = 24.9;
    
    const minWeight = (minBMI * heightInches * heightInches) / 703;
    const maxWeight = (maxBMI * heightInches * heightInches) / 703;
    
    if (unit === 'kg') {
      return {
        min: (minWeight / 2.20462).toFixed(1),
        max: (maxWeight / 2.20462).toFixed(1)
      };
    }
    
    return {
      min: minWeight.toFixed(1),
      max: maxWeight.toFixed(1)
    };
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const heightInches = parseInt(formData.height_inches);
      const currentWeight = parseFloat(formData.current_weight);
      const goalWeight = parseFloat(formData.goal_weight);

      // Convert to pounds for storage if needed
      const weightInLbs = formData.weight_unit === 'kg' ? currentWeight * 2.20462 : currentWeight;
      const goalInLbs = formData.weight_unit === 'kg' ? goalWeight * 2.20462 : goalWeight;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          height_inches: heightInches,
          current_weight: weightInLbs,
          goal_weight: goalInLbs,
          gender: formData.gender
        });

      if (profileError) throw profileError;

      // Add initial weight entry
      const { error: entryError } = await supabase
        .from('weight_entries')
        .insert({
          user_id: user.id,
          weight: weightInLbs,
          entry_date: new Date().toISOString().split('T')[0],
          original_unit: formData.weight_unit,
          notes: 'Initial weight entry'
        });

      if (entryError) throw entryError;

      // Save unit preference
      localStorage.setItem('weightUnit', formData.weight_unit);

      toast({
        title: "Welcome aboard!",
        description: "Your profile has been set up successfully.",
      });

      onComplete();
    } catch (error) {
      toast({
        title: "Setup failed",
        description: "There was an error setting up your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.gender;
      case 1:
        return formData.height_inches && formData.current_weight;
      case 2:
        return formData.goal_weight && formData.goal_type;
      case 3:
        return formData.activity_level;
      default:
        return false;
    }
  };

  const currentBMI = formData.height_inches && formData.current_weight ? 
    calculateBMI(parseFloat(formData.current_weight), parseInt(formData.height_inches)) : null;
  
  const bmiInfo = currentBMI ? getBMICategory(currentBMI) : null;
  const healthyRange = formData.height_inches ? 
    getHealthyWeightRange(parseInt(formData.height_inches), formData.weight_unit) : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 animate-slide-up">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Welcome to Weight Tracker</h2>
          <p className="text-muted-foreground">{steps[currentStep].description}</p>
          <Progress value={(currentStep + 1) / steps.length * 100} className="mt-4" />
        </div>

        <form className="space-y-4">
          {currentStep === 0 && (
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Please select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This helps us provide more accurate health calculations and recommendations.
              </p>
            </div>
          )}

          {currentStep === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight_unit">Unit</Label>
                  <Select value={formData.weight_unit} onValueChange={(value: 'lbs' | 'kg') => 
                    setFormData(prev => ({ ...prev, weight_unit: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="height">Height (inches)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height_inches}
                    onChange={(e) => setFormData(prev => ({ ...prev, height_inches: e.target.value }))}
                    placeholder="e.g., 70"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="current_weight">Current Weight ({formData.weight_unit})</Label>
                <Input
                  id="current_weight"
                  type="number"
                  step="0.1"
                  value={formData.current_weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_weight: e.target.value }))}
                  placeholder={`e.g., ${formData.weight_unit === 'lbs' ? '150' : '68'}`}
                />
              </div>

              {currentBMI && bmiInfo && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>BMI is a measure of body fat based on height and weight</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-sm font-medium">Your BMI: {currentBMI.toFixed(1)}</span>
                  </div>
                  <p className={`text-sm ${bmiInfo.color}`}>{bmiInfo.category}</p>
                  {healthyRange && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Healthy range: {healthyRange.min} - {healthyRange.max} {formData.weight_unit}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              <div>
                <Label htmlFor="goal_type">What's your goal?</Label>
                <Select value={formData.goal_type} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, goal_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_weight">Lose Weight</SelectItem>
                    <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                    <SelectItem value="gain_weight">Gain Weight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="goal_weight">Goal Weight ({formData.weight_unit})</Label>
                <Input
                  id="goal_weight"
                  type="number"
                  step="0.1"
                  value={formData.goal_weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal_weight: e.target.value }))}
                  placeholder={`e.g., ${formData.weight_unit === 'lbs' ? '140' : '63'}`}
                />
              </div>

              {healthyRange && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Recommended goal range:</p>
                  <p className="text-sm text-muted-foreground">
                    {healthyRange.min} - {healthyRange.max} {formData.weight_unit}
                  </p>
                </div>
              )}
            </>
          )}

          {currentStep === 3 && (
            <div>
              <Label htmlFor="activity_level">Activity Level</Label>
              <Select value={formData.activity_level} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, activity_level: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little/no exercise)</SelectItem>
                  <SelectItem value="light">Lightly active (light exercise 1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderately active (moderate exercise 3-5 days/week)</SelectItem>
                  <SelectItem value="active">Very active (hard exercise 6-7 days/week)</SelectItem>
                  <SelectItem value="extra_active">Extra active (very hard exercise, physical job)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
          >
            {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </Card>
    </div>
  );
};