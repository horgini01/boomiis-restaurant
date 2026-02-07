import { useState, useEffect, FormEvent } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success('Login successful!');
      // Reload to update auth state
      window.location.href = '/admin/dashboard';
    },
    onError: (error) => {
      toast.error(error.message || 'Login failed');
    },
  });

  // If already logged in, redirect to dashboard (RoleGuard will handle route-level access control)
  useEffect(() => {
    if (!loading && user) {
      setLocation('/admin/dashboard');
    }
  }, [loading, user, setLocation]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    loginMutation.mutate({ email, password });
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@boomiis.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
                required
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground text-center font-medium mb-2">
              Default Admin Credentials
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Email: <span className="font-mono">admin@boomiis.uk</span>
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Password: <span className="font-mono">admin123</span>
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            Only authorized administrators can access this area
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
