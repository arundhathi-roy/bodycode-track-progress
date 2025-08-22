import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HeightSetupProps {
  onHeightSet: (heightInInches: number) => void;
  currentHeight?: number;
}

const HeightSetup = ({ onHeightSet, currentHeight }: HeightSetupProps) => {
  const { toast } = useToast();
  const [feet, setFeet] = useState(currentHeight ? Math.floor(currentHeight / 12).toString() : "");
  const [inches, setInches] = useState(currentHeight ? (currentHeight % 12).toString() : "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const feetNum = parseInt(feet);
    const inchesNum = parseInt(inches);
    
    if (!feetNum || feetNum < 3 || feetNum > 8) {
      toast({
        title: "Invalid height",
        description: "Please enter a valid height between 3-8 feet.",
        variant: "destructive"
      });
      return;
    }

    if (inchesNum < 0 || inchesNum > 11) {
      toast({
        title: "Invalid inches",
        description: "Inches must be between 0-11.",
        variant: "destructive"
      });
      return;
    }

    const totalInches = feetNum * 12 + inchesNum;
    onHeightSet(totalInches);
    
    toast({
      title: "Height saved!",
      description: `Height set to ${feet}'${inches}"`,
    });
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-medium border-0">
      <div className="flex items-center gap-2 mb-4">
        <Ruler className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          {currentHeight ? "Update Height" : "Set Your Height"}
        </h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="feet" className="text-sm font-medium">Feet</Label>
            <Input
              id="feet"
              type="number"
              min="3"
              max="8"
              placeholder="5"
              value={feet}
              onChange={(e) => setFeet(e.target.value)}
              className="bg-background/50 border-border focus:ring-primary"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="inches" className="text-sm font-medium">Inches</Label>
            <Input
              id="inches"
              type="number"
              min="0"
              max="11"
              placeholder="8"
              value={inches}
              onChange={(e) => setInches(e.target.value)}
              className="bg-background/50 border-border focus:ring-primary"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-soft"
        >
          {currentHeight ? "Update Height" : "Save Height"}
        </Button>
      </form>
    </Card>
  );
};

export { HeightSetup };