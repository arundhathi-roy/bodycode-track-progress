-- Create daily flow tracking table
CREATE TABLE public.daily_flow_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  flow_date DATE NOT NULL,
  flow_intensity VARCHAR(10) NOT NULL CHECK (flow_intensity IN ('light', 'medium', 'heavy')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, flow_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_flow_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own daily flow entries" 
ON public.daily_flow_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily flow entries" 
ON public.daily_flow_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily flow entries" 
ON public.daily_flow_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily flow entries" 
ON public.daily_flow_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_flow_entries_updated_at
BEFORE UPDATE ON public.daily_flow_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();