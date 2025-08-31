import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Use service role for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily nutrition reset...');
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Option 1: Archive old meal data (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Delete meal entries older than 30 days
    const { data: deletedMeals, error: deleteError } = await supabase
      .from('meals')
      .delete()
      .lt('meal_date', thirtyDaysAgo);
    
    if (deleteError) {
      console.error('Error deleting old meals:', deleteError);
      throw deleteError;
    }
    
    // Get count of users for logging
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Reset any daily tracking counters (if you have them)
    // This could include resetting daily goals, streaks, etc.
    
    const summary = {
      date: today,
      deletedMealsOlderThan: thirtyDaysAgo,
      totalUsers: userCount || 0,
      resetComplete: true
    };
    
    console.log('Daily nutrition reset completed:', summary);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Daily nutrition reset completed successfully',
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in daily-nutrition-reset function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
