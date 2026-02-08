import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export default function ChangePassword() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Password strength validation
  const hasMinLength = newPassword.length >= 8;
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasLowercase && hasUppercase && hasNumber;
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Password does not meet security requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    changePasswordMutation.mutate({
      oldPassword,
      newPassword,
    });
  };

  return (
    
      <AdminLayout>
        <div className="container max-w-4xl py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Change Password</h1>
            <p className="text-muted-foreground mt-2">
              Update your account password to keep your account secure
            </p>
          </div>

          <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Update Password
                </CardTitle>
                <CardDescription>
                  Enter your current password and choose a new secure password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="oldPassword"
                        type={showOldPassword ? "text" : "password"}
                        placeholder="Enter your current password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        disabled={changePasswordMutation.isPending}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={changePasswordMutation.isPending}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    <PasswordStrengthIndicator password={newPassword} />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={changePasswordMutation.isPending}
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
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <X className="h-4 w-4" />
                        Passwords do not match
                      </p>
                    )}
                    {passwordsMatch && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Passwords match
                      </p>
                    )}
                  </div>

                  {/* Security Notice */}
                  <Alert>
                    <AlertDescription>
                      <strong>Security tip:</strong> Use a unique password that you don't use for other accounts. 
                      Consider using a password manager to generate and store strong passwords.
                    </AlertDescription>
                  </Alert>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-4">
                    <Button
                      type="submit"
                      disabled={
                        changePasswordMutation.isPending ||
                        !oldPassword ||
                        !isPasswordValid ||
                        !passwordsMatch
                      }
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Lock className="mr-2 h-4 w-4 animate-pulse" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOldPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      disabled={changePasswordMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
        </div>
      </AdminLayout>
    
  );
}
