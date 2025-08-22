-- Add unique constraint to ensure one water intake record per user per day
ALTER TABLE public.water_intake 
ADD CONSTRAINT unique_user_date_water_intake 
UNIQUE (user_id, entry_date);

-- Add an index for better performance on queries by user_id and entry_date
CREATE INDEX IF NOT EXISTS idx_water_intake_user_date 
ON public.water_intake (user_id, entry_date DESC);