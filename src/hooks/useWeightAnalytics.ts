import { useMemo } from 'react';

interface WeightEntry {
  weight: number;
  entry_date: string;
}

export const useWeightAnalytics = (entries: WeightEntry[]) => {
  return useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        weeklyAverage: 0,
        monthlyAverage: 0,
        trend: 'stable' as const,
        streak: 0,
        bestDay: null,
        worstDay: null,
        averageWeeklyChange: 0,
        timeToGoal: null
      };
    }

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    // Calculate weekly average change
    const weeklyChanges: number[] = [];
    for (let i = 7; i < sortedEntries.length; i += 7) {
      const weekStart = sortedEntries[i - 7].weight;
      const weekEnd = sortedEntries[i].weight;
      weeklyChanges.push(weekEnd - weekStart);
    }
    
    const averageWeeklyChange = weeklyChanges.length > 0 
      ? weeklyChanges.reduce((sum, change) => sum + change, 0) / weeklyChanges.length
      : 0;

    // Calculate trend
    const recentEntries = sortedEntries.slice(-5);
    const oldestRecent = recentEntries[0]?.weight || 0;
    const newestRecent = recentEntries[recentEntries.length - 1]?.weight || 0;
    const weightDiff = newestRecent - oldestRecent;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(weightDiff) > 1) {
      trend = weightDiff > 0 ? 'increasing' : 'decreasing';
    }

    // Calculate logging streak
    let streak = 0;
    const today = new Date();
    for (let i = sortedEntries.length - 1; i >= 0; i--) {
      const entryDate = new Date(sortedEntries[i].entry_date);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    // Find best/worst days of week
    const dayStats: { [key: number]: { total: number; count: number; changes: number[] } } = {};
    
    sortedEntries.forEach((entry, index) => {
      const date = new Date(entry.entry_date);
      const dayOfWeek = date.getDay();
      
      if (!dayStats[dayOfWeek]) {
        dayStats[dayOfWeek] = { total: 0, count: 0, changes: [] };
      }
      
      dayStats[dayOfWeek].total += entry.weight;
      dayStats[dayOfWeek].count++;
      
      if (index > 0) {
        const change = entry.weight - sortedEntries[index - 1].weight;
        dayStats[dayOfWeek].changes.push(change);
      }
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let bestDay = null;
    let worstDay = null;
    let bestChange = Infinity;
    let worstChange = -Infinity;

    Object.entries(dayStats).forEach(([day, stats]) => {
      if (stats.changes.length > 0) {
        const avgChange = stats.changes.reduce((sum, change) => sum + change, 0) / stats.changes.length;
        
        if (avgChange < bestChange) {
          bestChange = avgChange;
          bestDay = dayNames[parseInt(day)];
        }
        
        if (avgChange > worstChange) {
          worstChange = avgChange;
          worstDay = dayNames[parseInt(day)];
        }
      }
    });

    return {
      weeklyAverage: Math.abs(averageWeeklyChange),
      monthlyAverage: Math.abs(averageWeeklyChange) * 4,
      trend,
      streak,
      bestDay,
      worstDay,
      averageWeeklyChange,
      timeToGoal: null // Will be calculated elsewhere with goal weight
    };
  }, [entries]);
};