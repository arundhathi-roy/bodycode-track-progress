-- Fix the search path security issue for the functions
DROP FUNCTION IF EXISTS public.update_current_weight();
DROP FUNCTION IF EXISTS public.update_current_weight_on_delete();

-- Recreate the functions with proper search path
CREATE OR REPLACE FUNCTION public.update_current_weight()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Only update current_weight if this is the most recent entry for this user
  UPDATE public.profiles 
  SET current_weight = (
    SELECT weight 
    FROM public.weight_entries 
    WHERE user_id = NEW.user_id 
    ORDER BY entry_date DESC, created_at DESC 
    LIMIT 1
  ), updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_current_weight_on_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Update current_weight to the most recent remaining entry for this user
  UPDATE public.profiles 
  SET current_weight = (
    SELECT weight 
    FROM public.weight_entries 
    WHERE user_id = OLD.user_id 
    ORDER BY entry_date DESC, created_at DESC 
    LIMIT 1
  ), updated_at = now()
  WHERE user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$;