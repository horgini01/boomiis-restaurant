import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { getLoginUrl } from '@/const';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [loggingIn, setLoggingIn] = useState(false);

  // If already logged in as admin, redirect to dashboard
  if (!loading && user?.role === 'admin') {
    setLocation('/admin/dashboard');
    return null;
  }

  const handleLogin = () => {
    setLoggingIn(true);
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Admin Login</CardTitle>
          <p className="text-muted-foreground mt-2">
            Sign in to manage your restaurant
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleLogin}
            size="lg"
            className="w-full"
            disabled={loggingIn}
          >
            {loggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              'Sign in with Manus'
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-6">
            Only authorized administrators can access this area
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
