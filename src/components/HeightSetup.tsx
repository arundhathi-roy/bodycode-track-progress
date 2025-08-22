import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface HeightSetupProps {
  onHeightSet: (heightInInches: number) => void;
  currentHeight?: number;
}

const HeightSetup = ({ onHeightSet, currentHeight }: HeightSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feet, setFeet] = useState(currentHeight ? Math.floor(currentHeight / 12).toString() : "");
  const [inches, setInches] = useState(currentHeight ? (currentHeight % 12).toString() : "");
  const [gender, setGender] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current gender from profile
  useEffect(() => {
    const fetchGender = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('gender')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching gender:', error);
        } else if (data?.gender) {
          setGender(data.gender);
        }
      } catch (error) {
        console.error('Error fetching gender:', error);
      }
    };

    fetchGender();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    
    setIsLoading(true);
    try {
      // Update profile with height and gender
      if (user && gender) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            height_inches: totalInches,
            gender: gender 
          })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      onHeightSet(totalInches);
      
      toast({
        title: "Profile updated!",
        description: `Height set to ${feet}'${inches}" ${gender ? `and gender updated` : ''}`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "There was an error updating your profile.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-medium border-0">
      <div className="flex items-center gap-2 mb-4">
        <Ruler className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          {currentHeight ? "Update Profile" : "Set Your Profile"}
        </h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Gender Selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
          </div>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="bg-background/50 border-border">
              <SelectValue placeholder="Select your gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This helps provide more accurate health calculations.
          </p>
        </div>

        {/* Height Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Height</Label>
          </div>
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
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || !feet || !inches}
          className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-soft"
        >
          {isLoading ? "Updating..." : currentHeight ? "Update Profile" : "Save Profile"}
        </Button>
      </form>
    </Card>
  );
};

export { HeightSetup };