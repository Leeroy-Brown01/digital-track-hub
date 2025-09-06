-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Add table to realtime publication
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
  VALUES (p_user_id, p_title, p_message, p_type, p_related_id, p_related_type)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create trigger function for application notifications
CREATE OR REPLACE FUNCTION public.notify_application_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  applicant_name TEXT;
  reviewer_name TEXT;
BEGIN
  -- Get applicant name
  SELECT full_name INTO applicant_name 
  FROM profiles 
  WHERE user_id = COALESCE(NEW.applicant_id, OLD.applicant_id);
  
  -- Get reviewer name if assigned
  IF NEW.assigned_reviewer_id IS NOT NULL THEN
    SELECT full_name INTO reviewer_name 
    FROM profiles 
    WHERE user_id = NEW.assigned_reviewer_id;
  END IF;
  
  -- Handle INSERT (new application)
  IF TG_OP = 'INSERT' THEN
    -- Notify all admins and reviewers
    INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
    SELECT 
      p.user_id,
      'New Application Submitted',
      applicant_name || ' has submitted a new application: "' || NEW.title || '"',
      'application',
      NEW.id,
      'application'
    FROM profiles p
    WHERE p.role IN ('admin', 'reviewer');
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE (status change, assignment)
  IF TG_OP = 'UPDATE' THEN
    -- Status change notification
    IF OLD.status != NEW.status THEN
      -- Notify applicant of status change
      PERFORM create_notification(
        NEW.applicant_id,
        'Application Status Updated',
        'Your application "' || NEW.title || '" status changed to: ' || NEW.status,
        'status',
        NEW.id,
        'application'
      );
      
      -- If approved/rejected, notify reviewer too
      IF NEW.status IN ('approved', 'rejected') AND NEW.assigned_reviewer_id IS NOT NULL THEN
        PERFORM create_notification(
          NEW.assigned_reviewer_id,
          'Application Review Completed',
          'Application "' || NEW.title || '" has been marked as ' || NEW.status,
          'status',
          NEW.id,
          'application'
        );
      END IF;
    END IF;
    
    -- Assignment notification
    IF OLD.assigned_reviewer_id IS DISTINCT FROM NEW.assigned_reviewer_id AND NEW.assigned_reviewer_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.assigned_reviewer_id,
        'New Application Assigned',
        'You have been assigned to review: "' || NEW.title || '"',
        'assignment',
        NEW.id,
        'application'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for application notifications
CREATE TRIGGER trigger_application_notifications
  AFTER INSERT OR UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_events();

-- Create trigger function for comment notifications
CREATE OR REPLACE FUNCTION public.notify_comment_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commenter_name TEXT;
  application_title TEXT;
  applicant_id UUID;
  reviewer_id UUID;
BEGIN
  -- Get commenter name
  SELECT full_name INTO commenter_name 
  FROM profiles 
  WHERE user_id = NEW.commenter_id;
  
  -- Get application details
  SELECT title, applicant_id, assigned_reviewer_id 
  INTO application_title, applicant_id, reviewer_id
  FROM applications 
  WHERE id = NEW.application_id;
  
  -- Notify applicant if comment is not from them
  IF applicant_id != NEW.commenter_id THEN
    PERFORM create_notification(
      applicant_id,
      'New Comment on Application',
      commenter_name || ' commented on your application: "' || application_title || '"',
      'comment',
      NEW.application_id,
      'application'
    );
  END IF;
  
  -- Notify reviewer if comment is not from them and they are assigned
  IF reviewer_id IS NOT NULL AND reviewer_id != NEW.commenter_id THEN
    PERFORM create_notification(
      reviewer_id,
      'New Comment on Application',
      commenter_name || ' commented on application: "' || application_title || '"',
      'comment',
      NEW.application_id,
      'application'
    );
  END IF;
  
  -- Notify admins if comment is not from an admin
  INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
  SELECT 
    p.user_id,
    'New Comment on Application',
    commenter_name || ' commented on application: "' || application_title || '"',
    'comment',
    NEW.application_id,
    'application'
  FROM profiles p
  WHERE p.role = 'admin' AND p.user_id != NEW.commenter_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comment notifications
CREATE TRIGGER trigger_comment_notifications
  AFTER INSERT ON public.application_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment_events();