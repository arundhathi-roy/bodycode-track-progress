-- Create menstrual cycles table
CREATE TABLE public.menstrual_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  flow_intensity VARCHAR(10) NOT NULL CHECK (flow_intensity IN ('light', 'medium', 'heavy')),
  symptoms TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.menstrual_cycles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own menstrual cycles" 
ON public.menstrual_cycles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own menstrual cycles" 
ON public.menstrual_cycles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menstrual cycles" 
ON public.menstrual_cycles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menstrual cycles" 
ON public.menstrual_cycles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_menstrual_cycles_updated_at
BEFORE UPDATE ON public.menstrual_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();