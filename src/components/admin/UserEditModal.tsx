// React imports for component creation and state management
import React, { useState } from 'react';
// UI components for the modal dialog structure
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// Button component for form actions
import { Button } from '@/components/ui/button';
// Input component for text fields
import { Input } from '@/components/ui/input';
// Label component for form field labels
import { Label } from '@/components/ui/label';
// Select components for role dropdown
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Supabase client for database operations
import { supabase } from '@/integrations/supabase/client';
// Toast hook for user notifications
import { useToast } from '@/hooks/use-toast';
// TypeScript types for database tables and enums
import { Tables, Enums } from '@/integrations/supabase/types';

// Type alias for the profiles table structure
type Profile = Tables<'profiles'>;

// Props interface defining the component's expected properties
interface UserEditModalProps {
  user: Profile | null; // The user profile to edit, can be null
  open: boolean; // Controls modal visibility
  onOpenChange: (open: boolean) => void; // Callback to handle modal open/close
  onSuccess: () => void; // Callback triggered on successful update
}

// Main component function for editing user details
export default function UserEditModal({ user, open, onOpenChange, onSuccess }: UserEditModalProps) {
  // State to track loading status during form submission
  const [loading, setLoading] = useState(false);
  // Hook to display toast notifications
  const { toast } = useToast();

  // Function to handle form submission and update user data
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    e.preventDefault();
    // Early return if no user is provided
    if (!user) return;

    // Set loading state to true to disable form during submission
    setLoading(true);

    try {
      // Extract form data from the submitted form
      const formData = new FormData(e.currentTarget);
      const full_name = formData.get('full_name') as string;
      const email = formData.get('email') as string;
      const role = formData.get('role') as Enums<'app_role'>;

      // Update user profile in Supabase database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name,
          email,
          role,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id);

      // Throw error if database update fails
      if (error) throw error;

      // Call success callback to refresh parent component
      onSuccess();
      // Close the modal
      onOpenChange(false);

      // Show success toast notification
      toast({
        title: "Success",
        description: "User updated successfully"
      });
    } catch (error) {
      // Log error to console for debugging
      console.error('Error updating user:', error);
      // Show error toast notification
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive"
      });
    } finally {
      // Reset loading state regardless of success or failure
      setLoading(false);
    }
  };

  // Early return if no user is provided to prevent rendering
  if (!user) return null;

  // Render the modal dialog with form for editing user details
  return (
    // Main dialog container controlled by open state
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        {/* Form for editing user information */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name input field */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={user.full_name}
              required
            />
          </div>

          {/* Email input field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              required
            />
          </div>

          {/* Role selection dropdown */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="applicant">Applicant</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons for form submission or cancellation */}
          <div className="flex justify-end space-x-2 pt-4">
            {/* Cancel button to close modal without saving */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            {/* Submit button to update user data */}
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}