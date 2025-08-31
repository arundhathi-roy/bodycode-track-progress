-- Create nutrition reference table
CREATE TABLE public.nutrition_reference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kcal_per_100 NUMERIC NOT NULL,
  protein_per_100 NUMERIC NOT NULL,
  carbs_per_100 NUMERIC NOT NULL,
  fat_per_100 NUMERIC NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_reference ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (nutrition data should be publicly readable)
CREATE POLICY "Anyone can view nutrition reference" 
ON public.nutrition_reference 
FOR SELECT 
USING (true);

-- Insert reference nutrition data
INSERT INTO public.nutrition_reference (name, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, aliases) VALUES
  ('rice, cooked', 130, 2.7, 28, 0.3, ARRAY['rice', 'cooked rice', 'white rice', 'steamed rice']),
  ('chicken breast, cooked', 165, 31, 0, 3.6, ARRAY['chicken breast', 'grilled chicken', 'cooked chicken', 'chicken']),
  ('chicken curry', 210, 18, 6, 13, ARRAY['chicken curry', 'curry chicken', 'butter chicken']),
  ('mixed salad (lettuce, cucumber, tomato)', 20, 1.2, 3.6, 0.2, ARRAY['salad', 'mixed salad', 'green salad', 'lettuce', 'vegetables']),
  ('dal (lentil stew)', 116, 9.0, 20, 0.4, ARRAY['dal', 'lentils', 'lentil curry', 'daal']),
  ('pasta, cooked', 157, 5.8, 30, 0.9, ARRAY['pasta', 'spaghetti', 'noodles', 'cooked pasta']),
  ('bread, white', 265, 9, 49, 3.2, ARRAY['bread', 'white bread', 'toast', 'sliced bread']);

-- Create trigger for updated_at
CREATE TRIGGER update_nutrition_reference_updated_at
BEFORE UPDATE ON public.nutrition_reference
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();