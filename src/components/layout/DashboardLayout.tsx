import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

// Interface defining the props for the DashboardLayout component
interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

// Main component function providing dashboard layout
export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();

  // Function to determine the badge variant based on user role
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'reviewer':
        return 'secondary';
      case 'applicant':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Render the dashboard layout with header and main content
  return (
    <div className="min-h-screen bg-background">
      {/* Header section with branding and user controls */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Application branding */}
            <div>
              <h1 className="text-2xl font-bold text-foreground">SmartCoreConnect</h1>
              <p className="text-sm text-muted-foreground">Digital Application System</p>
            </div>

            {/* User information and controls */}
            <div className="flex items-center gap-4">
              {/* User profile display */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{profile?.full_name}</span>
                <Badge variant={getRoleBadgeVariant(profile?.role || '')}>
                  {profile?.role}
                </Badge>
              </div>

              {/* Notification bell component */}
              <NotificationBell />

              {/* Sign out button */}
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground">{title}</h2>
        </div>
        {children}
      </main>
    </div>
  );
}