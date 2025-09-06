import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Clock, CheckCircle, XCircle, Eye, Trash2, ChevronDown, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import NewApplicationModal from '@/components/applications/NewApplicationModal';
import ApplicationDetailsModal from '@/components/applications/ApplicationDetailsModal';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';

type Application = Tables<'applications'>;

export default function ApplicantDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [openStatusCards, setOpenStatusCards] = useState<{ [key: string]: boolean }>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchApplications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchApplications();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'under_review':
        return <Eye className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'under_review':
        return 'default';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleApplicationCreated = () => {
    setShowNewModal(false);
    fetchApplications();
    toast({
      title: "Success",
      description: "Application submitted successfully"
    });
  };

  const deleteApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      await fetchApplications();
      toast({
        title: "Success",
        description: "Application deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: "Failed to delete application",
        variant: "destructive"
      });
    }
  };

  const statusCategories = [
    { status: 'pending', label: 'Pending', icon: Clock },
    { status: 'under_review', label: 'Under Review', icon: Eye },
    { status: 'approved', label: 'Approved', icon: CheckCircle },
    { status: 'rejected', label: 'Rejected', icon: XCircle },
  ];

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  const handleAvatarUpdate = (newAvatarUrl: string | null) => {
    setUserProfile((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
  };

  const toggleStatusCard = (status: string) => {
    setOpenStatusCards(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  if (loading) {
    return (
      <DashboardLayout title="My Applications">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Dashboard">
      <div className="space-y-6">
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="bg-deep-forest border-bronze/30">
            <TabsTrigger value="applications" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <FileText className="h-4 w-4" />
              My Applications
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <User className="h-4 w-4" />
              Profile Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-muted-foreground">
                  Submit and track your applications
                </p>
              </div>
              <Button onClick={() => setShowNewModal(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Application
              </Button>
            </div>

            <div className="grid gap-6">
              {applications.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by submitting your first application
                    </p>
                    <Button onClick={() => setShowNewModal(true)}>
                      Create Application
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                statusCategories.map((category) => {
                  const statusApplications = getApplicationsByStatus(category.status);
                  const IconComponent = category.icon;
                  
                  if (statusApplications.length === 0) return null;
                  
                  return (
                    <Collapsible
                      key={category.status}
                      open={openStatusCards[category.status]}
                      onOpenChange={() => toggleStatusCard(category.status)}
                    >
                      <CollapsibleTrigger asChild>
                        <Card className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <IconComponent className="h-6 w-6 text-primary" />
                                <div>
                                  <CardTitle className="text-lg">{category.label}</CardTitle>
                                  <p className="text-sm text-muted-foreground">
                                    {statusApplications.length} application{statusApplications.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              <ChevronDown 
                                className={`h-5 w-5 transition-transform duration-200 ${
                                  openStatusCards[category.status] ? 'rotate-180' : ''
                                }`} 
                              />
                            </div>
                          </CardHeader>
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-4 mt-4">
                          {statusApplications.map((application) => (
                            <Card key={application.id} className="hover:shadow-md transition-shadow ml-4">
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div>
                                    <CardTitle className="text-lg">{application.title}</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {application.description}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant={getStatusVariant(application.status)}
                                    className="flex items-center gap-1"
                                  >
                                    {getStatusIcon(application.status)}
                                    {application.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-muted-foreground">
                                    Submitted: {new Date(application.created_at).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setSelectedApplication(application)}
                                    >
                                      View Details
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => deleteApplication(application.id)}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-deep-forest mb-6">Profile Settings</h2>
              
              {userProfile && (
                <ProfilePictureUpload
                  currentAvatarUrl={userProfile.avatar_url}
                  userFullName={userProfile.full_name}
                  userId={userProfile.user_id}
                  onAvatarUpdate={handleAvatarUpdate}
                />
              )}
              
              <Card className="mt-6 bg-alabaster border-bronze/20">
                <CardHeader>
                  <CardTitle className="text-deep-forest">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userProfile && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-deep-forest">Full Name</label>
                        <p className="text-deep-forest/80">{userProfile.full_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-deep-forest">Email</label>
                        <p className="text-deep-forest/80">{userProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-deep-forest">Role</label>
                        <p className="text-deep-forest/80 capitalize">{userProfile.role}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-deep-forest">Member Since</label>
                        <p className="text-deep-forest/80">{new Date(userProfile.created_at).toLocaleDateString()}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <NewApplicationModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={handleApplicationCreated}
      />

      <ApplicationDetailsModal
        application={selectedApplication}
        open={!!selectedApplication}
        onOpenChange={() => setSelectedApplication(null)}
      />
    </DashboardLayout>
  );
}