-- Add unit field to weight_entries table to track original unit used
ALTER TABLE public.weight_entries 
ADD COLUMN original_unit VARCHAR(3) DEFAULT 'lbs' NOT NULL;