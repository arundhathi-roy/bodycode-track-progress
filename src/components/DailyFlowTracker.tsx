import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Plus, Download, Edit2, Trash2 } from 'lucide-react';
import { format, differenceInDays, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DailyFlowEntry {
  id: string;
  flow_date: string;
  flow_intensity: 'light' | 'medium' | 'heavy';
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export const MenstrualCycleTracker = () => {
  const { user } = useAuth();
  const [dailyEntries, setDailyEntries] = useState<DailyFlowEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [flowIntensity, setFlowIntensity] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<DailyFlowEntry | null>(null);

  useEffect(() => {
    if (user) {
      fetchDailyEntries();
    }
  }, [user]);

  const fetchDailyEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_flow_entries')
        .select('*')
        .eq('user_id', user?.id)
        .order('flow_date', { ascending: false });

      if (error) throw error;
      setDailyEntries((data as DailyFlowEntry[]) || []);
    } catch (error) {
      console.error('Error fetching daily entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const addOrUpdateEntry = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const entryData = {
        user_id: user?.id,
        flow_date: format(selectedDate, 'yyyy-MM-dd'),
        flow_intensity: flowIntensity,
        notes: notes.trim() || null
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('daily_flow_entries')
          .update(entryData)
          .eq('id', editingEntry.id);

        if (error) throw error;
        toast.success('Flow entry updated successfully');
      } else {
        const { error } = await supabase
          .from('daily_flow_entries')
          .upsert(entryData, { 
            onConflict: 'user_id,flow_date' 
          });

        if (error) throw error;
        toast.success('Flow entry recorded successfully');
      }

      setIsDialogOpen(false);
      setSelectedDate(undefined);
      setFlowIntensity('medium');
      setNotes('');
      setEditingEntry(null);
      fetchDailyEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Failed to save flow entry');
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('daily_flow_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      toast.success('Flow entry deleted successfully');
      fetchDailyEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete flow entry');
    }
  };

  const openEditDialog = (entry: DailyFlowEntry) => {
    setEditingEntry(entry);
    setSelectedDate(new Date(entry.flow_date));
    setFlowIntensity(entry.flow_intensity);
    setNotes(entry.notes || '');
    setIsDialogOpen(true);
  };

  const openNewEntryDialog = () => {
    setEditingEntry(null);
    setSelectedDate(undefined);
    setFlowIntensity('medium');
    setNotes('');
    setIsDialogOpen(true);
  };

  const getEntryForDate = (date: Date) => {
    return dailyEntries.find(entry => 
      isSameDay(new Date(entry.flow_date), date)
    );
  };

  const downloadPDF = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id)
        .single();

      const response = await supabase.functions.invoke('generate-daily-flow-pdf', {
        body: {
          userEmail: profile?.email || user?.email || 'Not provided',
          dailyEntries: dailyEntries
        }
      });

      if (response.error) throw response.error;

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-flow-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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

  // Group entries by month for display
  const entriesByMonth = dailyEntries.reduce((acc: Record<string, DailyFlowEntry[]>, entry) => {
    const monthKey = format(new Date(entry.flow_date), 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(entry);
    return acc;
  }, {});

  const sortedMonths = Object.keys(entriesByMonth).sort().reverse().slice(0, 3);

  const modifiers = {
    flowDay: (date: Date) => !!getEntryForDate(date),
  };

  const modifiersStyles = {
    flowDay: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      borderRadius: '50%'
    }
  };

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

  // Calculate cycle statistics
  const calculateCycleStats = () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentMonthEntries = dailyEntries.filter(entry => 
      format(new Date(entry.flow_date), 'yyyy-MM') === currentMonth
    );
    
    const averageCycleLength = calculateAverageCycleLength();
    const totalCycles = Object.keys(entriesByMonth).length;
    
    return {
      currentMonthDays: currentMonthEntries.length,
      totalCycles,
      averageCycleLength,
      heavyDaysThisMonth: currentMonthEntries.filter(e => e.flow_intensity === 'heavy').length,
      lightDaysThisMonth: currentMonthEntries.filter(e => e.flow_intensity === 'light').length,
      mediumDaysThisMonth: currentMonthEntries.filter(e => e.flow_intensity === 'medium').length
    };
  };

  const calculateAverageCycleLength = () => {
    const months = Object.keys(entriesByMonth).sort();
    if (months.length < 2) return 0;
    
    const cycleLengths = [];
    for (let i = 1; i < months.length; i++) {
      const prevMonth = new Date(months[i-1] + '-01');
      const currentMonth = new Date(months[i] + '-01');
      const daysBetween = differenceInDays(currentMonth, prevMonth);
      cycleLengths.push(daysBetween);
    }
    
    return cycleLengths.length > 0 
      ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
      : 0;
  };

  const stats = calculateCycleStats();

  return (
    <Card className="p-4 md:p-6 bg-gradient-card shadow-medium border-0 col-span-1 lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Menstruation Tracking</h3>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNewEntryDialog} className="gap-2 bg-primary/90 hover:bg-primary">
                <Plus className="h-4 w-4" />
                Add Flow Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-fit w-auto p-4">
              <DialogHeader className="pb-2">
                <DialogTitle>
                  {editingEntry ? 'Edit Flow Entry' : 'Add Flow Entry'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date > new Date()}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                    className={cn("border rounded-md pointer-events-auto w-fit mx-auto")}
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                      day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                  />
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

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes about this day..."
                    rows={3}
                  />
                </div>
                
                <Button onClick={addOrUpdateEntry} className="w-full">
                  {editingEntry ? 'Update Entry' : 'Add Entry'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-primary">{dailyEntries.length}</p>
            <p className="text-sm text-muted-foreground">Total Days Tracked</p>
          </div>
          <div className="bg-success/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {dailyEntries.filter(e => e.flow_intensity === 'light').length}
            </p>
            <p className="text-sm text-muted-foreground">Light Days</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {dailyEntries.filter(e => e.flow_intensity === 'heavy').length}
            </p>
            <p className="text-sm text-muted-foreground">Heavy Days</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {dailyEntries.filter(e => e.flow_intensity === 'medium').length}
            </p>
            <p className="text-sm text-muted-foreground">Medium Days</p>
          </div>
        </div>

        {/* Cycle Insights */}
        <div className="bg-muted/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-foreground mb-3">Cycle Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">{stats.totalCycles}</p>
              <p className="text-sm text-muted-foreground">Total Cycles</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">
                {stats.averageCycleLength > 0 ? `${stats.averageCycleLength} days` : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">Avg Cycle Length</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-primary">{stats.currentMonthDays}</p>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-muted/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-foreground mb-3">Current Month Breakdown</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-success/10 rounded-lg p-3">
              <p className="text-lg font-semibold text-success">{stats.lightDaysThisMonth}</p>
              <p className="text-xs text-muted-foreground">Light Days</p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-lg font-semibold text-foreground">{stats.mediumDaysThisMonth}</p>
              <p className="text-xs text-muted-foreground">Medium Days</p>
            </div>
            <div className="text-center bg-warning/10 rounded-lg p-3">
              <p className="text-lg font-semibold text-warning">{stats.heavyDaysThisMonth}</p>
              <p className="text-xs text-muted-foreground">Heavy Days</p>
            </div>
          </div>
        </div>

        {/* Recent Entries by Month */}
        <div className="bg-muted/20 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-foreground mb-4">Recent Months</h4>
          {sortedMonths.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {sortedMonths.map((month) => {
                const monthEntries = entriesByMonth[month];
                const monthName = format(new Date(month + '-01'), 'MMMM yyyy');
                const monthStats = {
                  light: monthEntries.filter(e => e.flow_intensity === 'light').length,
                  medium: monthEntries.filter(e => e.flow_intensity === 'medium').length,
                  heavy: monthEntries.filter(e => e.flow_intensity === 'heavy').length
                };
                
                return (
                  <div key={month} className="bg-background rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-foreground">{monthName}</h5>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {monthEntries.length} days
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Month stats */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center bg-success/10 rounded p-2">
                        <p className="text-sm font-semibold text-success">{monthStats.light}</p>
                        <p className="text-xs text-muted-foreground">Light</p>
                      </div>
                      <div className="text-center bg-muted/30 rounded p-2">
                        <p className="text-sm font-semibold text-foreground">{monthStats.medium}</p>
                        <p className="text-xs text-muted-foreground">Medium</p>
                      </div>
                      <div className="text-center bg-warning/10 rounded p-2">
                        <p className="text-sm font-semibold text-warning">{monthStats.heavy}</p>
                        <p className="text-xs text-muted-foreground">Heavy</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {monthEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {format(new Date(entry.flow_date), 'MMM dd, yyyy')}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              entry.flow_intensity === 'heavy' ? 'destructive' : 
                              entry.flow_intensity === 'medium' ? 'default' : 'secondary'
                            } className="text-xs">
                              {entry.flow_intensity}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(entry)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteEntry(entry.id)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {monthEntries.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          and {monthEntries.length - 5} more entries...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-muted-foreground mb-1">No flow entries recorded yet</p>
              <p className="text-sm text-muted-foreground">Start tracking your cycle by adding your first flow entry</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};