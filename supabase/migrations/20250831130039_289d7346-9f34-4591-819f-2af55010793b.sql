-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('achievement', 'reminder', 'milestone', 'tip')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for system to insert notifications (we'll need this for automated notifications)
CREATE POLICY "System can create notifications for users" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample notifications for the current user
INSERT INTO public.notifications (user_id, type, title, message) VALUES
('2ca8460d-7767-4818-8c90-8344e1cf2cd7', 'achievement', 'Weight Loss Milestone!', 'Congratulations! You''ve lost 2 lbs this week. Keep up the great work!'),
('2ca8460d-7767-4818-8c90-8344e1cf2cd7', 'tip', 'Hydration Reminder', 'Did you know drinking water before meals can help with weight management? Stay hydrated!'),
('2ca8460d-7767-4818-8c90-8344e1cf2cd7', 'milestone', 'Tracking Streak', 'Amazing! You''ve been consistently tracking your weight for 7 days straight.');