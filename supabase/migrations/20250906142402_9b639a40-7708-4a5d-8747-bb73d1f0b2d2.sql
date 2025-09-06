-- Fix storage policies for application-documents bucket
-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Reviewers and admins can view all documents" ON storage.objects;

-- Create comprehensive storage policies for application-documents bucket
CREATE POLICY "Enable upload for authenticated users" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'application-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Enable view for document owners and reviewers" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'application-documents' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('reviewer', 'admin')
    )
  )
);

CREATE POLICY "Enable delete for document owners and admins" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'application-documents' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);