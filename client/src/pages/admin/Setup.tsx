import { useState, FormEvent } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

type SetupStep = 'email' | 'otp' | 'password' | 'complete';

export default function AdminSetup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<SetupStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'sms'>('email');

  const requestOTPMutation = trpc.auth.requestSetupOTP.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || 'Verification code sent!');
      setStep('otp');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send verification code');
    },
  });

  // No separate verify OTP mutation - verification happens in completeSetup

  const completeSetupMutation = trpc.auth.completeSetup.useMutation({
    onSuccess: () => {
      toast.success('Setup complete! Redirecting to login...');
      setStep('complete');
      setTimeout(() => {
        setLocation('/admin/login');
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message || 'Setup failed');
    },
  });

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    requestOTPMutation.mutate({ email, deliveryMethod });
  };

  const handleOTPSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    // Move to password step
    setStep('password');
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!/[a-z]/.test(password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      toast.error('Password must contain at least one number');
      return;
    }

    completeSetupMutation.mutate({ email, otpCode: otp, password });
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-2">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          step === 'email' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
        }`}>
          1
        </div>
        <div className={`w-12 h-0.5 ${step === 'email' ? 'bg-border' : 'bg-primary'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          step === 'otp' ? 'bg-primary text-primary-foreground' : 
          step === 'password' || step === 'complete' ? 'bg-primary/20 text-primary' : 'bg-border text-muted-foreground'
        }`}>
          2
        </div>
        <div className={`w-12 h-0.5 ${step === 'password' || step === 'complete' ? 'bg-primary' : 'bg-border'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
          step === 'password' ? 'bg-primary text-primary-foreground' :
          step === 'complete' ? 'bg-primary/20 text-primary' : 'bg-border text-muted-foreground'
        }`}>
          3
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            {step === 'complete' ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : step === 'password' ? (
              <Lock className="h-8 w-8 text-primary" />
            ) : (
              <Mail className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-3xl font-bold">Admin Setup</CardTitle>
          <CardDescription>
            {step === 'email' && 'Verify your email to get started'}
            {step === 'otp' && 'Enter the verification code'}
            {step === 'password' && 'Create your password'}
            {step === 'complete' && 'Setup complete!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepIndicator()}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={requestOTPMutation.isPending}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Delivery Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={deliveryMethod === 'email' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setDeliveryMethod('email')}
                    disabled={requestOTPMutation.isPending}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={deliveryMethod === 'sms' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setDeliveryMethod('sms')}
                    disabled={requestOTPMutation.isPending}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    SMS
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {deliveryMethod === 'email' 
                    ? "We'll send a verification code to your email" 
                    : "We'll send a verification code to your phone number"}
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={requestOTPMutation.isPending}
              >
                {requestOTPMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  `Send Code via ${deliveryMethod === 'email' ? 'Email' : 'SMS'}`
                )}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={false}
                  required
                  autoFocus
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to {email}
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={false}
              >
                {false ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setStep('email')}
                disabled={false}
              >
                Change email address
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={completeSetupMutation.isPending}
                    required
                    autoFocus
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={completeSetupMutation.isPending}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs font-medium mb-2">Password requirements:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className={password.length >= 8 ? 'text-green-600' : ''}>
                    ✓ At least 8 characters
                  </li>
                  <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                    ✓ One lowercase letter
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                    ✓ One uppercase letter
                  </li>
                  <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                    ✓ One number
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={completeSetupMutation.isPending}
              >
                {completeSetupMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing setup...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </form>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Setup Complete!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your admin account has been created successfully.
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting to login...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
