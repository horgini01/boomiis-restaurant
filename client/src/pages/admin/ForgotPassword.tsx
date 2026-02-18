import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { Loader2, Mail, Lock, KeyRound } from "lucide-react";

type Step = "request" | "verify" | "reset";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requestOTP = trpc.passwordReset.requestPasswordResetOTP.useMutation({
    onSuccess: () => {
      setSuccess("OTP sent! Check your email.");
      setError("");
      setStep("verify");
    },
    onError: (err) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const verifyOTP = trpc.passwordReset.verifyPasswordResetOTP.useMutation({
    onSuccess: () => {
      setSuccess("OTP verified! Enter your new password.");
      setError("");
      setStep("reset");
    },
    onError: (err) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const resetPassword = trpc.passwordReset.resetPasswordWithOTP.useMutation({
    onSuccess: () => {
      setSuccess("Password reset successfully! Redirecting to login...");
      setError("");
      setTimeout(() => {
        window.location.href = "/admin/login";
      }, 2000);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess("");
    },
  });

  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    requestOTP.mutate({ email });
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (otpCode.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    verifyOTP.mutate({ email, code: otpCode });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    resetPassword.mutate({ email, code: otpCode, newPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-600 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-white">
            {step === "request" && "Forgot Password"}
            {step === "verify" && "Verify OTP"}
            {step === "reset" && "Reset Password"}
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            {step === "request" && "Enter your email to receive a 6-digit OTP"}
            {step === "verify" && "Enter the OTP sent to your email"}
            {step === "reset" && "Enter your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-900/20 border-green-900 text-green-400">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {step === "request" && (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                    disabled={requestOTP.isPending}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={requestOTP.isPending}
              >
                {requestOTP.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>

              <div className="text-center text-sm">
                <Link href="/admin/login" className="text-amber-600 hover:text-amber-500">
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-zinc-300">6-Digit OTP</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white text-center text-2xl tracking-widest"
                    disabled={verifyOTP.isPending}
                  />
                </div>
                <p className="text-xs text-zinc-500">Check your email for the OTP code (expires in 15 minutes)</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={verifyOTP.isPending}
              >
                {verifyOTP.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep("request");
                    setOtpCode("");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-amber-600 hover:text-amber-500"
                >
                  Request New OTP
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-zinc-300">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                    disabled={resetPassword.isPending}
                  />
                </div>
                <p className="text-xs text-zinc-500">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                    disabled={resetPassword.isPending}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={resetPassword.isPending}
              >
                {resetPassword.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
