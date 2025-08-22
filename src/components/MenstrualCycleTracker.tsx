import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Plus, CalendarIcon, Download } from 'lucide-react';
import { format, differenceInDays, addDays, isWithinInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CycleEntry {
  id: string;
  start_date: string;
  end_date: string;
  flow_intensity: 'light' | 'medium' | 'heavy';
  symptoms: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const MenstrualCycleTracker = () => {
  const { user } = useAuth();
  const [cycles, setCycles] = useState<CycleEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date>();
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCycles();
    }
  }, [user]);

  const fetchCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('menstrual_cycles')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_date', { ascending: false })
        .limit(12);

      if (error) throw error;
      setCycles((data as CycleEntry[]) || []);
    } catch (error) {
      console.error('Error fetching cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCycle = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (selectedEndDate < selectedStartDate) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      const { error } = await supabase
        .from('menstrual_cycles')
        .insert({
          user_id: user?.id,
          start_date: format(selectedStartDate, 'yyyy-MM-dd'),
          end_date: format(selectedEndDate, 'yyyy-MM-dd'),
          flow_intensity: flowIntensity
        });

      if (error) throw error;

      toast.success('Cycle recorded successfully');
      setIsDialogOpen(false);
      setSelectedStartDate(undefined);
      setSelectedEndDate(undefined);
      setFlowIntensity('medium');
      fetchCycles();
    } catch (error) {
      console.error('Error adding cycle:', error);
      toast.error('Failed to record cycle');
    }
  };

  const calculateNextPeriod = () => {
    if (cycles.length < 2) return null;
    
    const avgCycleLength = cycles.slice(0, 3).reduce((sum, cycle, index) => {
      if (index === 0) return 0;
      const prevCycle = cycles[index - 1];
      const days = differenceInDays(new Date(cycle.start_date), new Date(prevCycle.start_date));
      return sum + Math.abs(days);
    }, 0) / Math.max(1, cycles.length - 1);

    if (avgCycleLength > 0) {
      return addDays(new Date(cycles[0].start_date), Math.round(avgCycleLength));
    }
    return null;
  };

  const downloadPDF = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      const { data: allCycles } = await supabase
        .from('menstrual_cycles')
        .select('*')
        .eq('user_id', user?.id)
        .order('start_date', { ascending: false });

      const response = await fetch('https://gxwudkbfxuhyjjkdwfgc.supabase.co/functions/v1/generate-cycle-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4d3Vka2JmeHVoeWpqa2R3ZmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODA0OTYsImV4cCI6MjA3MTQ1NjQ5Nn0.IGOR1_ac114Ueja90tjSORf3rf8TViQn-OAS65_3juU`,
        },
        body: JSON.stringify({
          userEmail: profile?.email || user?.email || 'Not provided',
          cycles: allCycles || []
        })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menstrual-cycle-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const nextPeriod = calculateNextPeriod();
  const daysUntilNext = nextPeriod ? differenceInDays(nextPeriod, new Date()) : null;

  if (loading) {
    return (
      <Card className="p-4 md:p-6 bg-gradient-card shadow-medium border-0">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6 bg-gradient-card shadow-medium border-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Menstrual Cycle</h3>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Log Period
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Record Menstrual Cycle</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedStartDate ? format(selectedStartDate, "PPP") : <span>Pick start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedStartDate}
                        onSelect={setSelectedStartDate}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedEndDate ? format(selectedEndDate, "PPP") : <span>Pick end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedEndDate}
                        onSelect={setSelectedEndDate}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (selectedStartDate && date < selectedStartDate) return true;
                          return false;
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label>Flow Intensity</Label>
                  <Select value={flowIntensity} onValueChange={(value: 'light' | 'medium' | 'heavy') => setFlowIntensity(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="heavy">Heavy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={addCycle} className="w-full">
                  Record Cycle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {/* Next Period Prediction */}
        {nextPeriod && (
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-sm font-medium text-foreground">Next Period Expected</p>
            <p className="text-lg font-semibold text-primary">
              {format(nextPeriod, 'MMM dd, yyyy')}
              {daysUntilNext !== null && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({daysUntilNext > 0 ? `in ${daysUntilNext} days` : daysUntilNext === 0 ? 'today' : `${Math.abs(daysUntilNext)} days ago`})
                </span>
              )}
            </p>
          </div>
        )}

        {/* Recent Cycles */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Cycles</h4>
          {cycles.length > 0 ? (
            <div className="space-y-2">
              {cycles.slice(0, 3).map((cycle) => (
                <div key={cycle.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(cycle.start_date), 'MMM dd')} - {format(new Date(cycle.end_date), 'MMM dd')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {differenceInDays(new Date(cycle.end_date), new Date(cycle.start_date)) + 1} days
                    </p>
                  </div>
                  <Badge variant={
                    cycle.flow_intensity === 'heavy' ? 'destructive' : 
                    cycle.flow_intensity === 'medium' ? 'default' : 'secondary'
                  }>
                    {cycle.flow_intensity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No cycles recorded yet</p>
          )}
        </div>
      </div>
    </Card>
  );
};