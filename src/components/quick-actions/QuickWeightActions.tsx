import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Copy, Undo, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

  const adjustWeight = async (adjustment: number) => {
    if (!user || !currentWeight) return;

    setIsLoading(true);
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
    }
  };

  const copyYesterdayWeight = async () => {
    if (!user || recentEntries.length === 0) return;

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
      return;
    }

    setIsLoading(true);
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
    }
  };

  const undoLastEntry = async () => {
    if (!user || recentEntries.length === 0) return;

    const lastEntry = recentEntries[0];
    setIsLoading(true);

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
    }
  };

  const handleBulkImport = async () => {
    if (!user || !bulkData.trim()) return;

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
      return;
    }

    setIsLoading(true);
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
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground">Quick Actions</h3>
        
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustWeight(0.1)}
            disabled={isLoading || !currentWeight}
            className="h-8 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            +0.1
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => adjustWeight(-0.1)}
            disabled={isLoading || !currentWeight}
            className="h-8 px-2"
          >
            <Minus className="h-3 w-3 mr-1" />
            -0.1
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={copyYesterdayWeight}
            disabled={isLoading}
            className="h-8 px-2"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy Yesterday
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={undoLastEntry}
            disabled={isLoading || recentEntries.length === 0}
            className="h-8 px-2"
          >
            <Undo className="h-3 w-3 mr-1" />
            Undo Last
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-2">
                <Upload className="h-3 w-3 mr-1" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Import Weight Data</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bulk-data">
                    Import Data (Format: YYYY-MM-DD, weight, notes)
                  </Label>
                  <Textarea
                    id="bulk-data"
                    placeholder="2024-01-01, 150.5, Starting weight&#10;2024-01-02, 150.2&#10;2024-01-03, 149.8, Feeling good"
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button onClick={handleBulkImport} disabled={isLoading || !bulkData.trim()}>
                  Import {bulkData.trim().split('\n').length} Entries
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
};