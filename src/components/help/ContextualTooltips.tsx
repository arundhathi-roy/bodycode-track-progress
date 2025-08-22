import { Info, HelpCircle, Target, TrendingDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TooltipHelpProps {
  type: 'bmi' | 'goal' | 'trend' | 'streak' | 'healthy-range';
  children: React.ReactNode;
}

export const TooltipHelp = ({ type, children }: TooltipHelpProps) => {
  const getTooltipContent = () => {
    switch (type) {
      case 'bmi':
        return (
          <div className="max-w-xs">
            <h4 className="font-semibold mb-2">Body Mass Index (BMI)</h4>
            <p className="text-sm mb-2">BMI is calculated using your height and weight:</p>
            <ul className="text-sm space-y-1">
              <li>• Underweight: Below 18.5</li>
              <li>• Normal: 18.5 - 24.9</li>
              <li>• Overweight: 25 - 29.9</li>
              <li>• Obese: 30 and above</li>
            </ul>
            <p className="text-xs mt-2 text-muted-foreground">
              BMI is a screening tool and doesn't account for muscle mass or body composition.
            </p>
          </div>
        );
      
      case 'goal':
        return (
          <div className="max-w-xs">
            <h4 className="font-semibold mb-2">Setting Realistic Goals</h4>
            <p className="text-sm mb-2">For sustainable weight loss:</p>
            <ul className="text-sm space-y-1">
              <li>• Aim for 1-2 lbs per week</li>
              <li>• Set goals within healthy BMI range</li>
              <li>• Focus on gradual, consistent progress</li>
              <li>• Consult healthcare providers for major changes</li>
            </ul>
          </div>
        );
      
      case 'trend':
        return (
          <div className="max-w-xs">
            <h4 className="font-semibold mb-2">Understanding Weight Trends</h4>
            <p className="text-sm mb-2">Daily weight can fluctuate due to:</p>
            <ul className="text-sm space-y-1">
              <li>• Water retention</li>
              <li>• Time of day</li>
              <li>• Food intake</li>
              <li>• Hormonal changes</li>
            </ul>
            <p className="text-xs mt-2 text-muted-foreground">
              Focus on weekly trends rather than daily changes.
            </p>
          </div>
        );
      
      case 'streak':
        return (
          <div className="max-w-xs">
            <h4 className="font-semibold mb-2">Logging Streaks</h4>
            <p className="text-sm mb-2">Consistent tracking helps with:</p>
            <ul className="text-sm space-y-1">
              <li>• Better awareness of patterns</li>
              <li>• More accurate progress tracking</li>
              <li>• Building healthy habits</li>
              <li>• Identifying what works</li>
            </ul>
          </div>
        );
      
      case 'healthy-range':
        return (
          <div className="max-w-xs">
            <h4 className="font-semibold mb-2">Healthy Weight Range</h4>
            <p className="text-sm mb-2">
              Based on your height, a healthy weight range is calculated using BMI 18.5-24.9.
            </p>
            <p className="text-sm">
              This range provides a general guideline, but individual factors like muscle mass, 
              bone density, and overall health should also be considered.
            </p>
          </div>
        );
      
      default:
        return <p className="text-sm">Helpful information</p>;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">
            {children}
            <HelpCircle className="h-3 w-3 ml-1 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};