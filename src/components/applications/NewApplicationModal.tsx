import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

interface NewApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function NewApplicationModal({ open, onOpenChange, onSuccess }: NewApplicationModalProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    
    try {
      console.log('Starting application submission...');
      const formData = new FormData(e.currentTarget);
      const title = formData.get('title') as string;
      const description = formData.get('description') as string;
      
      console.log('Form data:', { title, description, fileCount: files.length });

      // Create application
      console.log('Creating application...');
      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .insert({
          title,
          description,
          applicant_id: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (applicationError) {
        console.error('Application creation error:', applicationError);
        throw applicationError;
      }

      console.log('Application created:', application);

      // Upload files if any
      for (const file of files) {
        console.log('Uploading file:', file.name);
        const fileName = `${user.id}/${Date.now()}-${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, file);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw uploadError;
        }

        console.log('File uploaded:', uploadData);

        // Save document record
        console.log('Saving document record...');
        const { error: documentError } = await supabase
          .from('documents')
          .insert({
            application_id: application.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: fileName,
            uploaded_by: user.id
          });

        if (documentError) {
          console.error('Document record error:', documentError);
          throw documentError;
        }
      }

      // Log activity
      console.log('Logging activity...');
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'application_created',
          resource_type: 'application',
          resource_id: application.id,
          details: { title, description, file_count: files.length }
        });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFiles([]);
      const form = e.currentTarget;
      form.reset();
      
    } catch (error) {
      console.error('Error creating application:', error);
      toast({
        title: "Error",
        description: "Failed to create application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit New Application</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Application Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter application title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Provide detailed description of your application"
              rows={4}
              required
            />
          </div>

          <div className="space-y-4">
            <Label>Supporting Documents</Label>
            
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Upload supporting documents (PDF, DOC, DOCX, Images)
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload"
                ref={(input) => {
                  if (input) {
                    input.onclick = () => {
                      input.value = '';
                    };
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Choose Files
              </Button>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files:</Label>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}