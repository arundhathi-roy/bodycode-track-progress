import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Copy, Undo, Upload, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface QuickWeightActionsProps {
  currentWeight: number | null;
  weightUnit: 'lbs' | 'kg';
  onWeightUpdate: () => void;
  recentEntries: Array<{ id: string; weight: number; entry_date: string }>;
}

export const QuickWeightActions = ({ 
  currentWeight, 
  weightUnit, 
  onWeightUpdate,
  recentEntries 
}: QuickWeightActionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const adjustWeight = async (adjustment: number) => {
    if (!user || !currentWeight) return;

    setIsLoading(true);
    setLoadingAction('adjust');
    const newWeight = currentWeight + adjustment;

    try {
      const { error } = await supabase
        .from('weight_entries')
        .insert({
          user_id: user.id,
          weight: newWeight,
          entry_date: new Date().toISOString().split('T')[0],
          original_unit: weightUnit
        });

      if (error) throw error;

      toast({
        title: "Weight adjusted",
        description: `${adjustment > 0 ? '+' : ''}${adjustment} ${weightUnit} added`,
      });

      onWeightUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust weight",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const copyYesterdayWeight = async () => {
    if (!user || recentEntries.length === 0) return;

    setIsLoading(true);
    setLoadingAction('copy');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEntry = recentEntries.find(entry => {
      const entryDate = new Date(entry.entry_date);
      return entryDate.toDateString() === yesterday.toDateString();
    });

    if (!yesterdayEntry) {
      toast({
        title: "No data found",
        description: "No weight entry found for yesterday",
        variant: "destructive",
      });
      setIsLoading(false);
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('weight_entries')
        .insert({
          user_id: user.id,
          weight: yesterdayEntry.weight,
          entry_date: new Date().toISOString().split('T')[0],
          original_unit: weightUnit
        });

      if (error) throw error;

      toast({
        title: "Weight copied",
        description: `Yesterday's weight (${yesterdayEntry.weight} ${weightUnit}) copied to today`,
      });

      onWeightUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy yesterday's weight",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const undoLastEntry = async () => {
    if (!user || recentEntries.length === 0) return;

    const lastEntry = recentEntries[0];
    setIsLoading(true);
    setLoadingAction('undo');

    try {
      const { error } = await supabase
        .from('weight_entries')
        .delete()
        .eq('id', lastEntry.id);

      if (error) throw error;

      toast({
        title: "Entry removed",
        description: "Last weight entry has been undone",
      });

      onWeightUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to undo last entry",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleBulkImport = async () => {
    if (!user || !bulkData.trim()) return;

    setIsLoading(true);
    setLoadingAction('import');
    
    const lines = bulkData.trim().split('\n');
    const entries = [];

    for (const line of lines) {
      const parts = line.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        const date = parts[0];
        const weight = parseFloat(parts[1]);
        const notes = parts[2] || '';

        if (!isNaN(weight) && date) {
          entries.push({
            user_id: user.id,
            entry_date: date,
            weight,
            notes,
            original_unit: weightUnit
          });
        }
      }
    }

    if (entries.length === 0) {
      toast({
        title: "Invalid format",
        description: "Please use format: YYYY-MM-DD, weight, notes (optional)",
        variant: "destructive",
      });
      setIsLoading(false);
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('weight_entries')
        .insert(entries);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `${entries.length} entries imported successfully`,
      });

      setBulkData('');
      onWeightUpdate();
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import weight entries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <Card className="p-4 md:p-6 bg-gradient-card shadow-soft border-0">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </h3>
          {currentWeight && (
            <Badge variant="secondary" className="text-xs">
              Current: {currentWeight} {weightUnit}
            </Badge>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {/* +/- Adjustment Buttons */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustWeight(weightUnit === 'kg' ? 0.1 : 0.2)}
            disabled={isLoading || !currentWeight}
            className="h-10 flex-col gap-1 hover-scale transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs">+{weightUnit === 'kg' ? '0.1' : '0.2'}</span>
            {loadingAction === 'adjust' && <div className="animate-spin h-3 w-3 border border-primary rounded-full border-t-transparent" />}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustWeight(weightUnit === 'kg' ? -0.1 : -0.2)}
            disabled={isLoading || !currentWeight}
            className="h-10 flex-col gap-1 hover-scale transition-all"
          >
            <Minus className="h-4 w-4" />
            <span className="text-xs">-{weightUnit === 'kg' ? '0.1' : '0.2'}</span>
            {loadingAction === 'adjust' && <div className="animate-spin h-3 w-3 border border-primary rounded-full border-t-transparent" />}
          </Button>
          
          {/* Copy Yesterday Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={copyYesterdayWeight}
            disabled={isLoading}
            className="h-10 flex-col gap-1 hover-scale transition-all"
          >
            <Copy className="h-4 w-4" />
            <span className="text-xs">Copy Yesterday</span>
            {loadingAction === 'copy' && <div className="animate-spin h-3 w-3 border border-primary rounded-full border-t-transparent" />}
          </Button>
          
          {/* Undo Last Entry Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={undoLastEntry}
            disabled={isLoading || recentEntries.length === 0}
            className="h-10 flex-col gap-1 hover-scale transition-all"
          >
            <Undo className="h-4 w-4" />
            <span className="text-xs">Undo Last</span>
            {loadingAction === 'undo' && <div className="animate-spin h-3 w-3 border border-primary rounded-full border-t-transparent" />}
          </Button>
        </div>

        {/* Bulk Import - Full Width */}
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="secondary" 
              className="w-full h-10 hover-scale transition-all"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import Historical Data
              {loadingAction === 'import' && <div className="animate-spin h-3 w-3 border border-primary rounded-full border-t-transparent ml-2" />}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Import Weight Data</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulk-data" className="text-sm font-medium">
                  Import Data (Format: YYYY-MM-DD, weight, notes)
                </Label>
                <Textarea
                  id="bulk-data"
                  placeholder="2024-01-01, 150.5, Starting weight&#10;2024-01-02, 150.2&#10;2024-01-03, 149.8, Feeling good"
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Each line: Date, Weight, Notes (optional). Use YYYY-MM-DD format for dates.
                </p>
              </div>
              <Button 
                onClick={handleBulkImport} 
                disabled={isLoading || !bulkData.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border border-white rounded-full border-t-transparent mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Import {bulkData.trim() ? bulkData.trim().split('\n').length : 0} Entries
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Tips */}
        {!currentWeight && (
          <div className="text-center text-sm text-muted-foreground">
            Log your first weight entry to enable quick actions
          </div>
        )}
      </div>
    </Card>
  );
};