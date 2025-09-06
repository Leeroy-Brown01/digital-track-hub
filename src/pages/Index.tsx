import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Users, Shield, Clock } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-foreground mb-6">
              SmartCoreConnect
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Digital Application Submission & Review System for Africa Software Architects
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')}>
                Get Started
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate text-white border-slate/20 hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <FileText className="h-8 w-8 text-cream mb-2" />
              <CardTitle className="text-cream">Digital Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-cream/80">
                Replace physical and email applications with a centralized digital platform
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-terracotta text-white border-terracotta/20 hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <Users className="h-8 w-8 text-cream mb-2" />
              <CardTitle className="text-cream">Efficient Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-cream/80">
                Enable internal teams to review and provide structured feedback efficiently
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-cream text-slate border-cream/20 hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <Shield className="h-8 w-8 text-terracotta mb-2" />
              <CardTitle className="text-slate">Secure & Auditable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate/70">
                Proper document tracking, access control and comprehensive audit trails
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate to-terracotta text-white border-slate/20 hover:scale-105 transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <Clock className="h-8 w-8 text-cream mb-2" />
              <CardTitle className="text-cream">Real-time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-cream/80">
                Live status updates and notifications for all stakeholders throughout the process
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary/5 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join SmartCoreConnect today and transform your application submission and review process
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Create Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
