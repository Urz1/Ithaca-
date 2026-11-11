"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, resetPassword } from "@/lib/auth-client";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await requestPasswordReset({
        email,
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || "Unable to send reset email.");
        return;
      }

      setSuccess(
        "If an account exists for that email, we sent password reset instructions.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send reset email.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: resetError } = await resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(resetError.message || "Unable to reset password.");
        return;
      }

      router.push("/signin?reset=success");
    } catch (resetRequestError) {
      setError(
        resetRequestError instanceof Error
          ? resetRequestError.message
          : "Unable to reset password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <img src="/logo.svg" alt="Ithaca" className="size-10" />
            <span className="text-2xl font-bold">Ithaca</span>
          </Link>
          <h1 className="mb-2 text-3xl font-bold">
            {token ? "Choose a new password" : "Reset your password"}
          </h1>
          <p className="text-muted-foreground">
            {token
              ? "Enter a new password for your account."
              : "We will email you a secure reset link."}
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="border-primary/20 bg-primary/10 text-primary mb-4 rounded-lg border p-3 text-sm">
            {success}
          </div>
        )}

        <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
          {token ? (
            <form
              onSubmit={handleResetPassword}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  New password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  Confirm password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="h-11 font-bold tracking-wide"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="researcher@university.edu"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="h-11 font-bold tracking-wide"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/signin" className="text-primary text-sm hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
