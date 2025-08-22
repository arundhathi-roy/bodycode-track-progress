-- Create weight_entries table to track weight history
CREATE TABLE public.weight_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  entry_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own weight entries" 
ON public.weight_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weight entries" 
ON public.weight_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight entries" 
ON public.weight_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight entries" 
ON public.weight_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_weight_entries_updated_at
BEFORE UPDATE ON public.weight_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update current_weight in profiles when new weight is logged
CREATE OR REPLACE FUNCTION public.update_current_weight()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the current_weight in profiles table with the latest weight entry
  UPDATE public.profiles 
  SET current_weight = NEW.weight, updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update current weight when new weight entry is added
CREATE TRIGGER update_current_weight_on_new_entry
AFTER INSERT ON public.weight_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_current_weight();