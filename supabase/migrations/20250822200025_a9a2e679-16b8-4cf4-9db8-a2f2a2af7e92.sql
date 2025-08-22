-- Create water intake tracking table
CREATE TABLE public.water_intake (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  glasses_consumed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Enable Row Level Security
ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own water intake" 
ON public.water_intake 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own water intake" 
ON public.water_intake 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water intake" 
ON public.water_intake 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water intake" 
ON public.water_intake 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_water_intake_updated_at
BEFORE UPDATE ON public.water_intake
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();