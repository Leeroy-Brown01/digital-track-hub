import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, FileText, BarChart3, Settings, Search, Filter, Eye, UserCheck, Edit, Trash2, TrendingUp, ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, FolderOpen, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, Enums } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ApplicationDetailsModal from '@/components/applications/ApplicationDetailsModal';
import UserEditModal from '@/components/admin/UserEditModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

type Application = Tables<'applications'> & {
  profiles?: { full_name: string } | null;
  assigned_reviewer?: { full_name: string } | null;
};

type Profile = Tables<'profiles'>;

type Document = Tables<'documents'> & {
  applications: {
    title: string;
    applicant_id: string;
    profiles: {
      full_name: string;
    };
  };
  uploader: {
    full_name: string;
  };
};

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reviewers, setReviewers] = useState<Profile[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [documentSearchTerm, setDocumentSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('total');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [expandedStatuses, setExpandedStatuses] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          profiles:applicant_id (full_name),
          assigned_reviewer:assigned_reviewer_id (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as any);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive"
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Filter out admin users from the main users list for user management
      const allUsers = data || [];
      const nonAdminUsers = allUsers.filter(user => user.role !== 'admin');
      setUsers(nonAdminUsers);
      setReviewers(allUsers.filter(user => user.role === 'reviewer') || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          applications!inner(
            title,
            applicant_id,
            profiles!applications_applicant_id_fkey(
              full_name
            )
          ),
          uploader:profiles!documents_uploaded_by_fkey(
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error",
          description: "Failed to fetch documents",
          variant: "destructive",
        });
        return;
      }

      setDocuments(data as Document[]);
    } catch (error) {
      console.error('Error in fetchDocuments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('created_at, status')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process data for monthly analytics
      const monthlyStats = data?.reduce((acc: any, app: any) => {
        const month = new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!acc[month]) {
          acc[month] = { month, total: 0, pending: 0, under_review: 0, approved: 0, rejected: 0 };
        }
        acc[month].total++;
        acc[month][app.status]++;
        return acc;
      }, {});

      setMonthlyData(Object.values(monthlyStats || {}));
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchUsers();
    fetchDocuments();
    fetchAnalyticsData();
  }, []);

  const updateApplicationStatus = async (applicationId: string, status: Enums<'application_status'>) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (error) throw error;

      await fetchApplications();
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

  const downloadDocument = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('application-documents')
        .download(document.storage_path);

      if (error) throw error;

      // Create a blob URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Document downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      });
    }
  };

  const assignReviewer = async (applicationId: string, reviewerId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ 
          assigned_reviewer_id: reviewerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      if (error) throw error;

      await fetchApplications();
      toast({
        title: "Success",
        description: "Reviewer assigned successfully"
      });
    } catch (error) {
      console.error('Error assigning reviewer:', error);
      toast({
        title: "Error",
        description: "Failed to assign reviewer",
        variant: "destructive"
      });
    }
  };

  const updateUserRole = async (userId: string, role: Enums<'app_role'>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;

      await fetchUsers();
      toast({
        title: "Success",
        description: "User role updated successfully"
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      await fetchUsers();
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'under_review': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'reviewer': return 'secondary';
      case 'applicant': return 'default';
      default: return 'outline';
    }
  };

  const toggleRoleExpansion = (role: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(role)) {
      newExpanded.delete(role);
    } else {
      newExpanded.add(role);
    }
    setExpandedRoles(newExpanded);
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
    if (activeTab !== 'total' && activeTab !== 'users') {
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
    rejected: applications.filter(app => app.status === 'rejected').length,
    users: users.length,
    reviewers: reviewers.length
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Clickable Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-deep-forest text-alabaster border-bronze/30 ${expandedStatuses.has('total') ? 'ring-2 ring-bronze' : ''}`}
            onClick={() => toggleStatusExpansion('total')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between text-alabaster">
                Total Applications
                {expandedStatuses.has('total') ? 
                  <ChevronDown className="h-3 w-3 text-bronze" /> : 
                  <ChevronRight className="h-3 w-3 text-bronze" />
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-alabaster">{stats.total}</div>
              <p className="text-xs text-alabaster/70">Click to view all</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-bronze text-deep-forest border-deep-forest/20 ${expandedStatuses.has('pending') ? 'ring-2 ring-deep-forest' : ''}`}
            onClick={() => toggleStatusExpansion('pending')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between text-deep-forest">
                Pending
                {expandedStatuses.has('pending') ? 
                  <ChevronDown className="h-3 w-3 text-deep-forest" /> : 
                  <ChevronRight className="h-3 w-3 text-deep-forest" />
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-deep-forest">{stats.pending}</div>
              <p className="text-xs text-deep-forest/70">Click to view pending</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-alabaster text-deep-forest border-bronze/20 ${expandedStatuses.has('under_review') ? 'ring-2 ring-bronze' : ''}`}
            onClick={() => toggleStatusExpansion('under_review')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between text-deep-forest">
                Under Review
                {expandedStatuses.has('under_review') ? 
                  <ChevronDown className="h-3 w-3 text-bronze" /> : 
                  <ChevronRight className="h-3 w-3 text-bronze" />
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-bronze">{stats.under_review}</div>
              <p className="text-xs text-deep-forest/60">Click to view reviewing</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-deep-forest text-alabaster border-bronze/30 ${expandedStatuses.has('approved') ? 'ring-2 ring-bronze' : ''}`}
            onClick={() => toggleStatusExpansion('approved')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between text-alabaster">
                Approved
                {expandedStatuses.has('approved') ? 
                  <ChevronDown className="h-3 w-3 text-bronze" /> : 
                  <ChevronRight className="h-3 w-3 text-bronze" />
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-bronze">{stats.approved}</div>
              <p className="text-xs text-alabaster/70">Click to view approved</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-bronze text-deep-forest border-deep-forest/20 ${expandedStatuses.has('rejected') ? 'ring-2 ring-deep-forest' : ''}`}
            onClick={() => toggleStatusExpansion('rejected')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between text-deep-forest">
                Rejected
                {expandedStatuses.has('rejected') ? 
                  <ChevronDown className="h-3 w-3 text-deep-forest" /> : 
                  <ChevronRight className="h-3 w-3 text-deep-forest" />
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-deep-forest">{stats.rejected}</div>
              <p className="text-xs text-deep-forest/70">Click to view rejected</p>
            </CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-alabaster text-deep-forest border-bronze/20 ${activeTab === 'users' ? 'ring-2 ring-bronze' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-deep-forest">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-bronze">{stats.users}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList className="bg-deep-forest border-bronze/30">
            <TabsTrigger value="applications" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <FolderOpen className="h-4 w-4" />
              Document Management
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 text-alabaster data-[state=active]:bg-bronze data-[state=active]:text-deep-forest">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            {/* Applications by Status - Only show when expanded */}
            {['total', 'pending', 'under_review', 'approved', 'rejected'].map((status) => {
              const isExpanded = expandedStatuses.has(status);
              if (!isExpanded) return null;
              
              const statusApplications = status === 'total' ? applications : applications.filter(app => app.status === status);
              const filteredApps = statusApplications.filter(app => {
                const matchesSearch = app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     app.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
              });
              
              return (
                <div key={status} className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${
                      status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                      status === 'under_review' ? 'bg-blue-100 dark:bg-blue-900/20' :
                      status === 'approved' ? 'bg-green-100 dark:bg-green-900/20' :
                      status === 'rejected' ? 'bg-red-100 dark:bg-red-900/20' :
                      'bg-gray-100 dark:bg-gray-900/20'
                    }`}>
                      {status === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}
                      {status === 'under_review' && <Eye className="h-5 w-5 text-blue-600" />}
                      {status === 'approved' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {status === 'rejected' && <XCircle className="h-5 w-5 text-red-600" />}
                      {status === 'total' && <FileText className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold capitalize">
                        {status === 'total' ? 'All Applications' : status.replace('_', ' ')} Applications
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {filteredApps.length} application{filteredApps.length !== 1 ? 's' : ''} 
                        {searchTerm && ` matching "${searchTerm}"`}
                      </p>
                    </div>
                  </div>

                  {/* Search for this status */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        placeholder="Search in this category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Applications List */}
                  {filteredApps.length === 0 ? (
                    <Card className="p-6">
                      <div className="text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <h3 className="text-lg font-medium mb-1">
                          No {status === 'total' ? '' : status.replace('_', ' ')} applications
                        </h3>
                        <p className="text-sm">
                          {searchTerm ? `No applications match "${searchTerm}"` : 'No applications in this category yet.'}
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredApps.map((application) => (
                        <Card key={application.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-terracotta bg-cream/50">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{application.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  By: {application.profiles?.full_name} • 
                                  Submitted: {new Date(application.created_at).toLocaleDateString()}
                                </p>
                                {application.assigned_reviewer && (
                                  <p className="text-sm text-muted-foreground">
                                    Assigned to: {application.assigned_reviewer.full_name}
                                  </p>
                                )}
                              </div>
                              <Badge variant={getStatusVariant(application.status)}>
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

                                <Select
                                  value={application.assigned_reviewer_id || ''}
                                  onValueChange={(value) => assignReviewer(application.id, value)}
                                >
                                  <SelectTrigger className="w-48">
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Assign Reviewer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {reviewers.map((reviewer) => (
                                      <SelectItem key={reviewer.user_id} value={reviewer.user_id}>
                                        {reviewer.full_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedApplication(application)}
                                  className="flex items-center gap-2 border-bronze text-bronze hover:bg-bronze hover:text-alabaster transition-all duration-300"
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteApplication(application.id)}
                                  className="text-destructive hover:text-destructive border-red-300 hover:bg-red-50"
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
              );
            })}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-deep-forest text-alabaster border-bronze/30">
                <CardHeader>
                  <CardTitle className="text-alabaster">Applications Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" stroke="#F5F5F5" />
                      <YAxis stroke="#F5F5F5" />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#CD7F32" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-alabaster border-bronze/20">
                <CardHeader>
                  <CardTitle className="text-deep-forest">Status Distribution by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" stroke="#102B2D" />
                      <YAxis stroke="#102B2D" />
                      <Tooltip />
                      <Bar dataKey="pending" stackId="a" fill="#CD7F32" />
                      <Bar dataKey="under_review" stackId="a" fill="#102B2D" />
                      <Bar dataKey="approved" stackId="a" fill="#10b981" />
                      <Bar dataKey="rejected" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="bg-deep-forest/50 border-bronze/30">
              <CardHeader>
                <CardTitle className="text-alabaster flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-bronze" />
                  Document Management & Tracking
                </CardTitle>
                <p className="text-alabaster/70 text-sm">
                  Manage and track all documents uploaded across all applications
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Documents */}
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="Search documents by name, application, or uploader..."
                      value={documentSearchTerm}
                      onChange={(e) => setDocumentSearchTerm(e.target.value)}
                      className="pl-9 bg-background/50 border-bronze/30 text-alabaster placeholder:text-alabaster/50"
                    />
                  </div>
                </div>

                {/* Documents Table */}
                <div className="rounded-md border border-bronze/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-bronze/30 hover:bg-bronze/10">
                        <TableHead className="text-alabaster">File Name</TableHead>
                        <TableHead className="text-alabaster">Application</TableHead>
                        <TableHead className="text-alabaster">Applicant</TableHead>
                        <TableHead className="text-alabaster">File Type</TableHead>
                        <TableHead className="text-alabaster">Size</TableHead>
                        <TableHead className="text-alabaster">Uploaded Date</TableHead>
                        <TableHead className="text-alabaster">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents
                        .filter(doc => {
                          const searchLower = documentSearchTerm.toLowerCase();
                          return (
                            doc.file_name.toLowerCase().includes(searchLower) ||
                            doc.applications.title.toLowerCase().includes(searchLower) ||
                            doc.applications.profiles.full_name.toLowerCase().includes(searchLower) ||
                            doc.file_type.toLowerCase().includes(searchLower)
                          );
                        })
                        .map((document) => (
                          <TableRow key={document.id} className="border-bronze/30 hover:bg-bronze/5">
                            <TableCell className="text-alabaster font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-bronze" />
                                {document.file_name}
                              </div>
                            </TableCell>
                            <TableCell className="text-alabaster">
                              {document.applications.title}
                            </TableCell>
                            <TableCell className="text-alabaster">
                              {document.applications.profiles.full_name}
                            </TableCell>
                            <TableCell className="text-alabaster">
                              <Badge variant="outline" className="border-bronze/50 text-bronze">
                                {document.file_type.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-alabaster">
                              {(document.file_size / 1024 / 1024).toFixed(2)} MB
                            </TableCell>
                            <TableCell className="text-alabaster">
                              {new Date(document.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-bronze/50 text-bronze hover:bg-bronze hover:text-deep-forest"
                                onClick={() => downloadDocument(document)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {documents.filter(doc => {
                        const searchLower = documentSearchTerm.toLowerCase();
                        return (
                          doc.file_name.toLowerCase().includes(searchLower) ||
                          doc.applications.title.toLowerCase().includes(searchLower) ||
                          doc.applications.profiles.full_name.toLowerCase().includes(searchLower) ||
                          doc.file_type.toLowerCase().includes(searchLower)
                        );
                      }).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-alabaster/70 py-8">
                            {documentSearchTerm ? 'No documents found matching your search.' : 'No documents uploaded yet.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Document Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Card className="bg-bronze/10 border-bronze/30">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-bronze">{documents.length}</div>
                      <p className="text-sm text-alabaster/70">Total Documents</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-bronze/10 border-bronze/30">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-bronze">
                        {(documents.reduce((acc, doc) => acc + doc.file_size, 0) / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <p className="text-sm text-alabaster/70">Total Storage Used</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-bronze/10 border-bronze/30">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-bronze">
                        {new Set(documents.map(doc => doc.file_type)).size}
                      </div>
                      <p className="text-sm text-alabaster/70">File Types</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">User Management</h2>
              <p className="text-sm text-muted-foreground">Manage user roles and permissions. Admin users are hidden for security.</p>
            </div>

            {/* User Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all bg-deep-forest text-alabaster border-bronze/30"
                onClick={() => toggleRoleExpansion('reviewer')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between text-alabaster">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-bronze" />
                      Reviewers
                    </div>
                    {expandedRoles.has('reviewer') ? 
                      <ChevronDown className="h-4 w-4 text-bronze" /> : 
                      <ChevronRight className="h-4 w-4 text-bronze" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-bronze">
                    {users.filter(u => u.role === 'reviewer').length}
                  </div>
                  <p className="text-sm text-alabaster/70">Click to view active reviewers</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-lg hover:scale-105 transition-all bg-bronze text-deep-forest border-deep-forest/20"
                onClick={() => toggleRoleExpansion('applicant')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between text-deep-forest">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-deep-forest" />
                      Applicants
                    </div>
                    {expandedRoles.has('applicant') ? 
                      <ChevronDown className="h-4 w-4 text-deep-forest" /> : 
                      <ChevronRight className="h-4 w-4 text-deep-forest" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-deep-forest">
                    {users.filter(u => u.role === 'applicant').length}
                  </div>
                  <p className="text-sm text-deep-forest/70">Click to view registered applicants</p>
                </CardContent>
              </Card>
            </div>

            {/* Users by Role - Only show when expanded */}
            {['reviewer', 'applicant'].map((role) => {
              const roleUsers = users.filter(user => user.role === role);
              const isExpanded = expandedRoles.has(role);
              
              if (!isExpanded) return null;
              
              if (roleUsers.length === 0) return (
                <Card key={role} className="p-6">
                  <div className="text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <h3 className="text-lg font-medium capitalize mb-1">No {role}s</h3>
                    <p className="text-sm">No {role}s have been registered yet.</p>
                  </div>
                </Card>
              );
              
              return (
                <div key={role} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${role === 'reviewer' ? 'bg-deep-forest' : 'bg-bronze'}`}>
                      {role === 'reviewer' ? 
                        <UserCheck className={`h-5 w-5 ${role === 'reviewer' ? 'text-alabaster' : 'text-deep-forest'}`} /> :
                        <FileText className={`h-5 w-5 ${role === 'reviewer' ? 'text-alabaster' : 'text-deep-forest'}`} />
                      }
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{role}s</h3>
                      <p className="text-sm text-muted-foreground">{roleUsers.length} {role}{roleUsers.length !== 1 ? 's' : ''} in total</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {roleUsers.map((user) => (
                      <Card key={user.id} className="hover:shadow-lg hover:scale-105 transition-all bg-alabaster border-bronze/20">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${role === 'reviewer' ? 'bg-deep-forest' : 'bg-bronze'}`}>
                                <Users className={`h-4 w-4 ${role === 'reviewer' ? 'text-alabaster' : 'text-deep-forest'}`} />
                              </div>
                              <div>
                                <CardTitle className="text-base text-deep-forest">{user.full_name}</CardTitle>
                                <p className="text-sm text-deep-forest/60">{user.email}</p>
                              </div>
                            </div>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="ml-2">
                              {user.role}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="text-xs text-muted-foreground">
                              Joined: {new Date(user.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            
                            <div className="flex items-center justify-between gap-2">
                              <Select
                                value={user.role}
                                onValueChange={(value) => updateUserRole(user.user_id, value as Enums<'app_role'>)}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="applicant">Applicant</SelectItem>
                                  <SelectItem value="reviewer">Reviewer</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedUser(user)}
                                  className="h-8 px-2 text-xs"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteUser(user.user_id)}
                                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <ApplicationDetailsModal
        application={selectedApplication}
        open={!!selectedApplication}
        onOpenChange={() => setSelectedApplication(null)}
      />
      
      <UserEditModal
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={() => setSelectedUser(null)}
        onSuccess={fetchUsers}
      />
    </DashboardLayout>
  );
}
