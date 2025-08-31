-- Fix overpermissive notification creation policy
-- Drop the current overpermissive policy
DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;

-- Create a more restrictive policy that only allows users to create notifications for themselves
-- or system-level operations (which would use service role key, bypassing RLS)
CREATE POLICY "Users can create notifications for themselves" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- If you need system-generated notifications, they should be created via Edge Functions
-- using the service role key, which bypasses RLS policies entirely