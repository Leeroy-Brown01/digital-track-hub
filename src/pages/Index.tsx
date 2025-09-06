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
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary))_0%,transparent_50%)] opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-6xl lg:text-7xl font-bold text-foreground mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SmartCoreConnect
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Digital Application Submission & Review System for Africa Software Architects
            </p>
            <div className="flex gap-4 justify-center animate-scale-in">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-accent transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-glow"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300 transform hover:scale-105"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform your application process with our comprehensive suite of tools
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-card to-muted/30 hover:from-primary/5 hover:to-accent/5">
            <CardHeader>
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                <FileText className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors duration-300">Digital Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="group-hover:text-foreground/80 transition-colors duration-300">
                Replace physical and email applications with a centralized digital platform
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-card to-muted/30 hover:from-accent/5 hover:to-primary/5">
            <CardHeader>
              <div className="p-3 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 w-fit group-hover:from-accent/20 group-hover:to-accent/10 transition-all duration-300">
                <Users className="h-8 w-8 text-accent group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="group-hover:text-accent transition-colors duration-300">Efficient Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="group-hover:text-foreground/80 transition-colors duration-300">
                Enable internal teams to review and provide structured feedback efficiently
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-card to-muted/30 hover:from-primary/5 hover:to-accent/5">
            <CardHeader>
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                <Shield className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="group-hover:text-primary transition-colors duration-300">Secure & Auditable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="group-hover:text-foreground/80 transition-colors duration-300">
                Proper document tracking, access control and comprehensive audit trails
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br from-card to-muted/30 hover:from-accent/5 hover:to-primary/5">
            <CardHeader>
              <div className="p-3 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 w-fit group-hover:from-accent/20 group-hover:to-accent/10 transition-all duration-300">
                <Clock className="h-8 w-8 text-accent group-hover:scale-110 transition-transform duration-300" />
              </div>
              <CardTitle className="group-hover:text-accent transition-colors duration-300">Real-time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="group-hover:text-foreground/80 transition-colors duration-300">
                Live status updates and notifications for all stakeholders throughout the process
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary))_0%,transparent_50%)] opacity-20"></div>
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Join SmartCoreConnect today and transform your application submission and review process
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/auth')}
            className="bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary transition-all duration-300 transform hover:scale-110 shadow-lg hover:shadow-xl animate-glow px-8 py-6 text-lg"
          >
            Create Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
