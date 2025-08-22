-- Add gender column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.gender IS 'User gender selection for health calculations';