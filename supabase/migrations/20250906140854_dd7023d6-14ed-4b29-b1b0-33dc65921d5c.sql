-- Storage policies for application-documents bucket
CREATE POLICY "Users can upload application documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Reviewers and admins can view all application documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'application-documents' AND 
  (
    public.get_user_role(auth.uid()) = 'admin' OR 
    public.get_user_role(auth.uid()) = 'reviewer'
  )
);

-- Allow users to delete their own applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete their own applications" 
ON applications 
FOR DELETE 
TO authenticated
USING (applicant_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin');

-- Allow admin to delete users (but protect against deleting themselves)
CREATE POLICY "Admins can delete other users" 
ON profiles 
FOR DELETE 
TO authenticated
USING (
  public.get_user_role(auth.uid()) = 'admin' AND 
  user_id != auth.uid()
);