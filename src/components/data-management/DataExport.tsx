import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DataExportProps {
  weightUnit: 'lbs' | 'kg';
}

export const DataExport = ({ weightUnit }: DataExportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | '1y'>('all');

  const getDateFilter = () => {
    if (dateRange === 'all') return null;
    
    const now = new Date();
    const daysMap = { '30d': 30, '90d': 90, '1y': 365 };
    const days = daysMap[dateRange as keyof typeof daysMap];
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return cutoff.toISOString().split('T')[0];
  };

  const convertWeight = (weight: number) => {
    return weightUnit === 'kg' ? (weight / 2.20462).toFixed(1) : weight.toFixed(1);
  };

  const exportToCSV = (data: any[]) => {
    const headers = ['Date', `Weight (${weightUnit})`, 'Original Unit', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.entry_date,
        convertWeight(row.weight),
        row.original_unit || 'lbs',
        `"${(row.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `weight-data-${dateRange}.csv`;
    link.click();
  };

  const exportToJSON = (data: any[]) => {
    const exportData = {
      exported_at: new Date().toISOString(),
      date_range: dateRange,
      weight_unit: weightUnit,
      entries: data.map(row => ({
        date: row.entry_date,
        weight: parseFloat(convertWeight(row.weight)),
        original_unit: row.original_unit || 'lbs',
        notes: row.notes || ''
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `weight-data-${dateRange}.json`;
    link.click();
  };

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      let query = supabase
        .from('weight_entries')
        .select('entry_date, weight, original_unit, notes')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: true });

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('entry_date', dateFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No data to export",
          description: "No weight entries found for the selected date range.",
          variant: "destructive",
        });
        return;
      }

      if (exportFormat === 'csv') {
        exportToCSV(data);
      } else {
        exportToJSON(data);
      }

      toast({
        title: "Export successful",
        description: `${data.length} entries exported as ${exportFormat.toUpperCase()}`,
      });

    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Export Weight Data</h3>
          <p className="text-sm text-muted-foreground">
            Download your weight tracking data for backup or analysis
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <Select value={exportFormat} onValueChange={(value: 'csv' | 'json') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV (Excel)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    JSON
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date Range</label>
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
        </Button>
      </div>
    </Card>
  );
};