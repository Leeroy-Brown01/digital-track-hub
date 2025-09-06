import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FileText, Clock, CheckCircle, XCircle, Eye, MessageSquare, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables, Enums } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ApplicationDetailsModal from '@/components/applications/ApplicationDetailsModal';

type Application = Tables<'applications'> & {
  profiles?: { full_name: string } | null;
};

export default function ReviewerDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('total');
  const { user } = useAuth();
  const { toast } = useToast();

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
    if (!selectedApplication || !commentText.trim()) return;

    try {
      const { error } = await supabase
        .from('application_comments')
        .insert({
          application_id: selectedApplication.id,
          commenter_id: user?.id || '',
          comment: commentText.trim()
        });

      if (error) throw error;

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user?.id,
          action: 'comment_added',
          resource_type: 'application',
          resource_id: selectedApplication.id,
          details: { comment_preview: commentText.slice(0, 100) }
        });

      setCommentText('');
      setShowCommentModal(false);
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
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
        {/* Clickable Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'total' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('total')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'pending' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'under_review' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('under_review')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Under Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.under_review}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'approved' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'rejected' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              {activeTab === 'total' ? 'All Assigned Applications' : 
               `${activeTab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Applications`} 
              ({activeTab === 'total' ? stats.total : stats[activeTab as keyof typeof stats]})
            </h3>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Applications Assigned</h3>
                <p className="text-muted-foreground">
                  You don't have any applications assigned for review yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
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

                        <Dialog open={showCommentModal && selectedApplication?.id === application.id} onOpenChange={setShowCommentModal}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedApplication(application)}
                              className="flex items-center gap-2"
                            >
                              <MessageSquare className="h-4 w-4" />
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
                                  placeholder="Enter your feedback or comments..."
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowCommentModal(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={submitComment} disabled={!commentText.trim()}>
                                  Add Comment
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
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
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
          )}
        </div>
      </div>

      <ApplicationDetailsModal
        application={selectedApplication}
        open={!!selectedApplication && !showCommentModal}
        onOpenChange={() => setSelectedApplication(null)}
      />
    </DashboardLayout>
  );
}