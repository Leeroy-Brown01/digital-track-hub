import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import ReviewerDashboard from '@/components/dashboards/ReviewerDashboard';
import ApplicantDashboard from '@/components/dashboards/ApplicantDashboard';

export default function Dashboard() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'reviewer':
      return <ReviewerDashboard />;
    case 'applicant':
      return <ApplicantDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground">Your account role is not recognized.</p>
          </div>
        </div>
      );
  }
}