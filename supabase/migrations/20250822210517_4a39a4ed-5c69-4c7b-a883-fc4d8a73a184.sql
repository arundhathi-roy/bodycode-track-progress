-- Deduplicate any existing daily flow entries by user and date (keep the most recent)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, flow_date ORDER BY updated_at DESC, created_at DESC) AS rn
  FROM public.daily_flow_entries
)
DELETE FROM public.daily_flow_entries d
USING ranked r
WHERE d.id = r.id AND r.rn > 1;

-- Add a unique constraint so one entry per user per date is enforced
ALTER TABLE public.daily_flow_entries
ADD CONSTRAINT daily_flow_entries_user_date_unique UNIQUE (user_id, flow_date);
