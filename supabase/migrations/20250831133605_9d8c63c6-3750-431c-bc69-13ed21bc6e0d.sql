-- Create meals table to track user's daily food intake
CREATE TABLE public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  grams NUMERIC NOT NULL DEFAULT 0,
  kcal NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Create policies for meals
CREATE POLICY "Users can view their own meals" 
ON public.meals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meals" 
ON public.meals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meals" 
ON public.meals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meals" 
ON public.meals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_meals_updated_at
BEFORE UPDATE ON public.meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add fiber column to nutrition reference table
ALTER TABLE public.nutrition_reference 
ADD COLUMN fiber_per_100 NUMERIC NOT NULL DEFAULT 0;

-- Update existing nutrition data with fiber values
UPDATE public.nutrition_reference 
SET fiber_per_100 = CASE 
  WHEN name = 'rice, cooked' THEN 0.4
  WHEN name = 'chicken breast, cooked' THEN 0
  WHEN name = 'chicken curry' THEN 1.2
  WHEN name = 'mixed salad (lettuce, cucumber, tomato)' THEN 1.5
  WHEN name = 'dal (lentil stew)' THEN 7.9
  WHEN name = 'pasta, cooked' THEN 1.8
  WHEN name = 'bread, white' THEN 2.7
  ELSE 0
END;