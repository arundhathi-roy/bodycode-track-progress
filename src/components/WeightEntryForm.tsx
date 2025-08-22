import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Scale, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WeightEntryForm = () => {
  const { toast } = useToast();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!weight) {
      toast({
        title: "Weight required",
        description: "Please enter your weight to continue.",
        variant: "destructive"
      });
      return;
    }

    // Here would be the actual submission logic
    toast({
      title: "Weight logged successfully!",
      description: `${weight} lbs recorded for ${new Date(date).toLocaleDateString()}`,
    });

    // Reset form
    setWeight("");
    setNotes("");
    setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight" className="flex items-center gap-2 text-sm font-medium">
            <Scale className="h-4 w-4 text-primary" />
            Weight (lbs)
          </Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="165.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="bg-background/50 border-border focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-background/50 border-border focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2 text-sm font-medium">
            <StickyNote className="h-4 w-4 text-primary" />
            Notes (optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Diet, exercise, mood..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background/50 border-border focus:ring-primary min-h-[80px]"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 shadow-soft"
      >
        Log Weight
      </Button>
    </form>
  );
};

export { WeightEntryForm };