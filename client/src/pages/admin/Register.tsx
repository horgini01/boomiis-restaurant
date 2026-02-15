import { useState, FormEvent } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, UserPlus, Eye, EyeOff, Key } from 'lucide-react';

export default function AdminRegister() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  
  const registerMutation = trpc.auth.registerAdmin.useMutation({
    onSuccess: () => {
      toast.success('Registration successful! You can now log in.');
      setLocation('/admin/login');
    },
    onError: (error) => {
      toast.error(error.message || 'Registration failed');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName || !email || !password || !secret) {
      toast.error('Please fill in all fields');
      return;
    }

    registerMutation.mutate({ firstName, lastName, email, password, secret });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Admin Registration</CardTitle>
          <p className="text-muted-foreground mt-2">
            Create your admin account to manage the restaurant
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={registerMutation.isPending}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={registerMutation.isPending}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@boomiis.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={registerMutation.isPending}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters, 1 uppercase, 1 lowercase, 1 number"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={registerMutation.isPending}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secret" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Registration Secret
              </Label>
              <div className="relative">
                <Input
                  id="secret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Enter the admin registration secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  disabled={registerMutation.isPending}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Contact your system administrator for the registration secret
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Admin Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/admin/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-6">
            Registration requires a valid secret key provided by your system administrator
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
