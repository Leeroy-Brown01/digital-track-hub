import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, BarChart3, Settings, Search, Filter, Eye, UserCheck, Edit, Trash2, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
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

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reviewers, setReviewers] = useState<Profile[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('total');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
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
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${activeTab === 'users' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium">
                {activeTab === 'total' ? 'All Applications' : 
                 activeTab === 'users' ? 'User Management' :
                 `${activeTab.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Applications`} 
                ({activeTab === 'users' ? stats.users : activeTab === 'total' ? stats.total : stats[activeTab as keyof typeof stats]})
              </h3>
            </div>
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search applications or applicants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
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
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <Card key={application.id}>
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Applications Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="pending" stackId="a" fill="#eab308" />
                      <Bar dataKey="under_review" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="approved" stackId="a" fill="#10b981" />
                      <Bar dataKey="rejected" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">User Management</h2>
              <p className="text-sm text-muted-foreground">Manage user roles and permissions. Admin users are hidden for security.</p>
            </div>

            {/* User Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => toggleRoleExpansion('reviewer')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      Reviewers
                    </div>
                    {expandedRoles.has('reviewer') ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {users.filter(u => u.role === 'reviewer').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Click to view active reviewers</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => toggleRoleExpansion('applicant')}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-500" />
                      Applicants
                    </div>
                    {expandedRoles.has('applicant') ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.role === 'applicant').length}
                  </div>
                  <p className="text-sm text-muted-foreground">Click to view registered applicants</p>
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
                    <div className={`p-2 rounded-lg ${role === 'reviewer' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                      {role === 'reviewer' ? 
                        <UserCheck className={`h-5 w-5 ${role === 'reviewer' ? 'text-blue-600' : 'text-green-600'}`} /> :
                        <FileText className={`h-5 w-5 ${role === 'reviewer' ? 'text-blue-600' : 'text-green-600'}`} />
                      }
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold capitalize">{role}s</h3>
                      <p className="text-sm text-muted-foreground">{roleUsers.length} {role}{roleUsers.length !== 1 ? 's' : ''} in total</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {roleUsers.map((user) => (
                      <Card key={user.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${role === 'reviewer' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                                <Users className={`h-4 w-4 ${role === 'reviewer' ? 'text-blue-600' : 'text-green-600'}`} />
                              </div>
                              <div>
                                <CardTitle className="text-base">{user.full_name}</CardTitle>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
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