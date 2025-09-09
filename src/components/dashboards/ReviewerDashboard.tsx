import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { FileText, Clock, CheckCircle, XCircle, Eye, MessageSquare, Search, Trash2, ChevronDown, ChevronRight, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables, Enums } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ApplicationDetailsModal from '@/components/applications/ApplicationDetailsModal';
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload';

type Application = Tables<'applications'> & {
  profiles?: { full_name: string } | null;
};

export default function ReviewerDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('total');
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(new Set());
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

  const fetchAssignedApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          profiles:applicant_id (full_name)
        `)
        .eq('assigned_reviewer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as any);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load assigned applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchAssignedApplications();
  }, [user]);

  const updateApplicationStatus = async (applicationId: string, status: Enums<'application_status'>) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user?.id,
          action: 'status_updated',
          resource_type: 'application',
          resource_id: applicationId,
          details: { new_status: status }
        });

      await fetchAssignedApplications();
      toast({
        title: "Success",
        description: "Application status updated successfully"
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const deleteApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      await fetchAssignedApplications();
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

  const submitComment = async () => {
    if (!selectedApplication || !commentText.trim() || !user?.id) {
      toast({
        title: "Error",
        description: "Missing required information to submit comment",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('application_comments')
        .insert({
          application_id: selectedApplication.id,
          commenter_id: user.id,
          comment: commentText.trim()
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'comment_added',
          resource_type: 'application',
          resource_id: selectedApplication.id,
          details: { comment_preview: commentText.slice(0, 100) }
        });

      setCommentText('');
      setShowCommentModal(false);
      toast({
        title: "Success",
        description: "Comment added successfully. The applicant has been notified."
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: `Failed to add comment: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

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
      case 'pending': return 'secondary';
      case 'under_review': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const handleAvatarUpdate = (newAvatarUrl: string | null) => {
    setUserProfile((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
  };

  const toggleStatusExpansion = (status: string) => {
    const newExpanded = new Set(expandedStatuses);
    if (newExpanded.has(status)) {
      newExpanded.delete(status);
    } else {
      newExpanded.add(status);
    }
    setExpandedStatuses(newExpanded);
  };

  const getFilteredApplications = () => {
    let filtered = applications;
    
    // Filter by active tab
    if (activeTab !== 'total') {
      filtered = applications.filter(app => app.status === activeTab);
    }
    
    // Apply search and status filters
    return filtered.filter(app => {
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchesSearch = app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  };

  const filteredApplications = getFilteredApplications();

  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    under_review: applications.filter(app => app.status === 'under_review').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length
  };

  if (loading) {
    return (
      <DashboardLayout title="Reviewer Dashboard">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Reviewer Dashboard">
      <div className="space-y-6">
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="bg-deep-forest border-bronze/30">
            <TabsTrigger value="applications" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <FileText className="h-4 w-4" />
              My Reviews
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <User className="h-4 w-4" />
              Profile Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-6">
            {/* Clickable Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md bg-white border ${expandedStatuses.has('total') ? 'ring-2 ring-primary' : ''}`}
                onClick={() => toggleStatusExpansion('total')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Total Applications
                    {expandedStatuses.has('total') ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Click to view all</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md bg-green-500 text-white border-green-500 ${expandedStatuses.has('approved') ? 'ring-2 ring-white' : ''}`}
                onClick={() => toggleStatusExpansion('approved')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between text-white">
                    Approved
                    {expandedStatuses.has('approved') ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.approved}</div>
                  <p className="text-xs text-green-100">Click to view approved</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md bg-red-500 text-white border-red-500 ${expandedStatuses.has('rejected') ? 'ring-2 ring-white' : ''}`}
                onClick={() => toggleStatusExpansion('rejected')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between text-white">
                    Rejected
                    {expandedStatuses.has('rejected') ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.rejected}</div>
                  <p className="text-xs text-red-100">Click to view rejected</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md bg-orange-500 text-white border-orange-500 ${expandedStatuses.has('under_review') ? 'ring-2 ring-white' : ''}`}
                onClick={() => toggleStatusExpansion('under_review')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between text-white">
                    Under Review
                    {expandedStatuses.has('under_review') ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats.under_review}</div>
                  <p className="text-xs text-orange-100">Click to view under review</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md bg-white border ${expandedStatuses.has('pending') ? 'ring-2 ring-primary' : ''}`}
                onClick={() => toggleStatusExpansion('pending')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Pending
                    {expandedStatuses.has('pending') ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">Click to view pending</p>
                </CardContent>
              </Card>
            </div>

            {/* Applications List */}
            {(expandedStatuses.has('total') || expandedStatuses.has('approved') || expandedStatuses.has('rejected') || expandedStatuses.has('under_review') || expandedStatuses.has('pending')) && (
              <div className="space-y-4">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {(() => {
                  let filteredApps = applications;
                  
                  // Filter based on expanded status
                  if (expandedStatuses.has('approved')) {
                    filteredApps = applications.filter(app => app.status === 'approved');
                  } else if (expandedStatuses.has('rejected')) {
                    filteredApps = applications.filter(app => app.status === 'rejected');
                  } else if (expandedStatuses.has('under_review')) {
                    filteredApps = applications.filter(app => app.status === 'under_review');
                  } else if (expandedStatuses.has('pending')) {
                    filteredApps = applications.filter(app => app.status === 'pending');
                  }
                  
                  // Apply search filter
                  if (searchTerm) {
                    filteredApps = filteredApps.filter(app => 
                      app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      app.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  }

                  return filteredApps.length === 0 ? (
                    <Card className="p-6">
                      <div className="text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <h3 className="text-lg font-medium mb-1">No applications found</h3>
                        <p className="text-sm">
                          {applications.length === 0 
                            ? "You don't have any applications assigned for review yet."
                            : "No applications match your current filter criteria."
                          }
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredApps.map((application) => (
                      <Card key={application.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{application.title}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                By: {application.profiles?.full_name} • 
                                Submitted: {new Date(application.created_at).toLocaleDateString()}
                              </p>
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
                          <div className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <Select
                                value={application.status}
                                onValueChange={(value) => updateApplicationStatus(application.id, value as Enums<'application_status'>)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="under_review">Under Review</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setSelectedApplication(application)}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Add Comment
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Comment</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="comment">Comment</Label>
                                      <Textarea
                                        id="comment"
                                        placeholder="Enter your review comments here..."
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        rows={4}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setShowCommentModal(false)}>
                                        Cancel
                                      </Button>
                                      <Button onClick={submitComment}>
                                        Submit Comment
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
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
                  );
                })()}
              </div>
            )}
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

      <ApplicationDetailsModal
        application={selectedApplication}
        open={!!selectedApplication}
        onOpenChange={() => setSelectedApplication(null)}
      />
    </DashboardLayout>
  );
}