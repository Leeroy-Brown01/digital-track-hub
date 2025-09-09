-- First check if the notify_comment_events trigger exists and add it if missing
DO $$
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_notify_comment_events'
    ) THEN
        -- Create trigger for comment notifications
        CREATE TRIGGER trigger_notify_comment_events
            AFTER INSERT ON public.application_comments
            FOR EACH ROW
            EXECUTE FUNCTION public.notify_comment_events();
    END IF;
END $$;

-- Also ensure realtime is enabled for application_comments table
ALTER TABLE public.application_comments REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'application_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.application_comments;
    END IF;
END $$;