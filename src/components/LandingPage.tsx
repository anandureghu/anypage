
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Bookmark, Download, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const LandingPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      toast({
        title: "Error",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmailSignIn = () => {
    window.location.href = '/auth';
  };

  if (user) {
    window.location.href = '/dashboard';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-primary mb-4">Rempd</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your personal smart PDF reader. Resume where you left off, save bookmarks, and access your documents anywhere.
          </p>
        </header>

        {/* Call to Action */}
        <div className="text-center mb-20">
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              onClick={handleGoogleSignIn}
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
            >
              Sign In with Google
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              onClick={handleEmailSignIn}
              variant="outline" 
              size="lg"
              className="px-8 py-6 text-lg"
            >
              Upload a PDF
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Start reading smarter today. No credit card required.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-8 rounded-lg bg-card border shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Resume Reading</h3>
            <p className="text-muted-foreground">
              Never lose your place. Rempd automatically remembers the last page you read in every document.
            </p>
          </div>

          <div className="text-center p-8 rounded-lg bg-card border shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bookmark className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Smart Bookmarks</h3>
            <p className="text-muted-foreground">
              Save important pages with custom notes. Find key information instantly with our intelligent bookmark system.
            </p>
          </div>

          <div className="text-center p-8 rounded-lg bg-card border shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Download className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Offline Access</h3>
            <p className="text-muted-foreground">
              Read anywhere, anytime. Your documents are available offline as a Progressive Web App.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-20 text-muted-foreground">
          <p>&copy; 2024 Rempd. Built for readers who value their time.</p>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
