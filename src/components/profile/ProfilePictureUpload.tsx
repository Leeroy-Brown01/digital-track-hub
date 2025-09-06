import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null;
  userFullName: string;
  userId: string;
  onAvatarUpdate: (newAvatarUrl: string | null) => void;
}

export default function ProfilePictureUpload({
  currentAvatarUrl,
  userFullName,
  userId,
  onAvatarUpdate
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      setUploading(true);

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Delete existing avatar if it exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload the new file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(avatarUrl);
      setPreviewUrl(null);

      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      if (!currentAvatarUrl) return;

      setUploading(true);

      // Delete from storage
      const oldPath = currentAvatarUrl.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('avatars')
          .remove([`${userId}/${oldPath}`]);
      }

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(null);

      toast({
        title: "Success",
        description: "Profile picture removed successfully"
      });

    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Remove failed",
        description: error.message || "Failed to remove profile picture",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-alabaster border border-bronze/20 rounded-lg">
      <div className="relative">
        <Avatar className="h-24 w-24 border-4 border-bronze/30">
          <AvatarImage 
            src={previewUrl || currentAvatarUrl || undefined} 
            alt={userFullName}
            className="object-cover"
          />
          <AvatarFallback className="bg-deep-forest text-alabaster text-lg font-semibold">
            {getInitials(userFullName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="absolute bottom-0 right-0">
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="bg-bronze text-deep-forest p-2 rounded-full hover:bg-bronze/80 transition-colors shadow-lg">
              <Camera className="h-4 w-4" />
            </div>
          </Label>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-deep-forest">{userFullName}</h3>
        <p className="text-sm text-deep-forest/60">Click the camera icon to update your profile picture</p>
      </div>

      <Input
        id="avatar-upload"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />

      <div className="flex gap-2">
        <Label htmlFor="avatar-upload">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={uploading}
            className="border-bronze text-bronze hover:bg-bronze hover:text-deep-forest"
            asChild
          >
            <span className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </span>
          </Button>
        </Label>

        {currentAvatarUrl && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRemoveAvatar}
            disabled={uploading}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <div className="text-xs text-deep-forest/50 text-center">
        <p>Supported formats: JPG, PNG, GIF</p>
        <p>Maximum size: 5MB</p>
      </div>
    </div>
  );
}