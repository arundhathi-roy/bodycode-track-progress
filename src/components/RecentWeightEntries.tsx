import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface WeightEntry {
  id: string;
  weight: number;
  entry_date: string;
  notes?: string;
  created_at: string;
  original_unit: string;
}

interface RecentWeightEntriesProps {
  weightUnit?: 'lbs' | 'kg';
}

const RecentWeightEntries = ({ weightUnit = 'lbs' }: RecentWeightEntriesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Weight conversion utilities
  const convertWeight = (weight: number, fromUnit: 'lbs' | 'kg', toUnit: 'lbs' | 'kg') => {
    if (fromUnit === toUnit) return weight;
    return fromUnit === 'lbs' ? weight / 2.20462 : weight * 2.20462;
  };

  const formatWeight = (weight: number) => {
    const convertedWeight = convertWeight(weight, 'lbs', weightUnit);
    return `${convertedWeight.toFixed(1)} ${weightUnit}`;
  };

  useEffect(() => {
    const fetchRecentEntries = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('weight_entries')
          .select('id, weight, entry_date, notes, created_at, original_unit')
          .eq('user_id', user.id)
          .order('entry_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        setEntries(data || []);
      } catch (error) {
        console.error('Error fetching recent entries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentEntries();
  }, [user]);

  const handleDelete = async (entryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weight_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      toast({
        title: "Entry deleted",
        description: "Weight entry has been removed successfully.",
      });

      // Trigger a page refresh to update dashboard stats
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error deleting entry",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-2">No weight entries yet</p>
        <p className="text-sm text-muted-foreground">Click "Log today's weight" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div 
          key={entry.id}
          className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border hover:bg-background/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{formatWeight(entry.weight)}</span>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(entry.entry_date)}
                </div>
                <span className="text-xs px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground">
                  entered as {entry.original_unit}
                </span>
              </div>
              {entry.notes && (
                <p className="text-sm text-muted-foreground mt-1 truncate max-w-48">
                  {entry.notes}
                </p>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(entry.id)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      {entries.length >= 5 && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          Showing recent 5 entries
        </p>
      )}
    </div>
  );
};

export { RecentWeightEntries };