-- Fix the ambiguous column reference in notify_comment_events function
CREATE OR REPLACE FUNCTION public.notify_comment_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  commenter_name TEXT;
  application_title TEXT;
  app_applicant_id UUID;
  app_reviewer_id UUID;
BEGIN
  -- Get commenter name
  SELECT full_name INTO commenter_name 
  FROM profiles 
  WHERE user_id = NEW.commenter_id;
  
  -- Get application details with fully qualified column names
  SELECT a.title, a.applicant_id, a.assigned_reviewer_id 
  INTO application_title, app_applicant_id, app_reviewer_id
  FROM applications a
  WHERE a.id = NEW.application_id;
  
  -- Notify applicant if comment is not from them
  IF app_applicant_id != NEW.commenter_id THEN
    PERFORM create_notification(
      app_applicant_id,
      'New Comment on Application',
      commenter_name || ' commented on your application: "' || application_title || '"',
      'comment',
      NEW.application_id,
      'application'
    );
  END IF;
  
  -- Notify reviewer if comment is not from them and they are assigned
  IF app_reviewer_id IS NOT NULL AND app_reviewer_id != NEW.commenter_id THEN
    PERFORM create_notification(
      app_reviewer_id,
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
$function$;