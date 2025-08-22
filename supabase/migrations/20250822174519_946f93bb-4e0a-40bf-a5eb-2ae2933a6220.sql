-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_current_weight_on_new_entry ON public.weight_entries;
DROP FUNCTION IF EXISTS public.update_current_weight();

-- Create improved function that only updates current_weight for the most recent entry
CREATE OR REPLACE FUNCTION public.update_current_weight()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after insert or update
CREATE TRIGGER update_current_weight_on_new_entry
AFTER INSERT OR UPDATE ON public.weight_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_current_weight();

-- Also create a trigger for when entries are deleted
CREATE OR REPLACE FUNCTION public.update_current_weight_on_delete()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_current_weight_on_delete_entry
AFTER DELETE ON public.weight_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_current_weight_on_delete();