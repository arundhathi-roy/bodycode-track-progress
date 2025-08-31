-- Create cron job to run daily nutrition reset every day at midnight UTC
SELECT cron.schedule(
  'daily-nutrition-reset',
  '0 0 * * *', -- Every day at midnight UTC
  $$
  SELECT
    net.http_post(
        url:='https://gxwudkbfxuhyjjkdwfgc.supabase.co/functions/v1/daily-nutrition-reset',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4d3Vka2JmeHVoeWpqa2R3ZmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4ODA0OTYsImV4cCI6MjA3MTQ1NjQ5Nn0.IGOR1_ac114Ueja90tjSORf3rf8TViQn-OAS65_3juU"}'::jsonb,
        body:=concat('{"scheduled_time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);