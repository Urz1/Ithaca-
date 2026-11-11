"use client";

import { Suspense, useState, useEffect } from "react";
import {
  Mail,
  Globe,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  Check,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Password strength checker
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Strong", color: "bg-green-500" };
  return { score, label: "Very Strong", color: "bg-green-600" };
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function OrcidIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className}>
      <path
        fill="#A6CE39"
        d="M256,128c0,70.7-57.3,128-128,128C57.3,256,0,198.7,0,128C0,57.3,57.3,0,128,0C198.7,0,256,57.3,256,128z"
      />
      <path
        fill="#FFFFFF"
        d="M86.3,186.2H70.9V79.1h15.4V186.2z M78.6,65.6c-5.4,0-9.8-4.4-9.8-9.8c0-5.4,4.4-9.8,9.8-9.8c5.4,0,9.8,4.4,9.8,9.8C88.4,61.2,84,65.6,78.6,65.6z M108.9,79.1h39.7c30.2,0,45.4,19.9,45.4,47.3c0,27.7-16.3,47.4-45.7,47.4h-39.4V79.1z M124.3,160.6h22.6c19.8,0,31.7-12.7,31.7-34.2c0-21.2-11.9-33.8-31.4-33.8h-22.9V160.6z"
      />
    </svg>
  );
}

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/explore";
  const { data: session, isPending } = useSession();

  // Form state
  const [mode, setMode] = useState<"oauth" | "email">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "orcid" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(callbackUrl);
    }
  }, [session, isPending, router, callbackUrl]);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const isFormValid = name && email && password.length >= 8 && passwordsMatch;

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user is logged in, show smooth workspace initialization screen while redirecting
  if (session?.user) {
    return (
      <div className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div className="bg-primary/10 pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full blur-[100px]" />
        <div className="bg-primary/10 pointer-events-none absolute -right-40 -bottom-40 h-96 w-96 rounded-full blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="border-border/80 bg-card/90 relative z-10 w-full max-w-md rounded-2xl border p-8 shadow-2xl backdrop-blur-xl"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-primary/15 text-primary ring-primary/30 flex size-12 items-center justify-center rounded-xl ring-1">
              <Sparkles className="size-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Preparing Your Lab Workspace
              </h2>
              <p className="text-muted-foreground text-xs">
                Welcome{session.user.name ? `, ${session.user.name}` : ""}.
                Initializing epistemic engines.
              </p>
            </div>
          </div>

          <div className="space-y-3.5 py-2">
            <div className="flex items-center gap-3 text-xs">
              <div className="bg-emerald-500/20 text-emerald-500 flex size-5 items-center justify-center rounded-full">
                <Check className="size-3 stroke-[3]" />
              </div>
              <span className="text-foreground font-medium">
                Lab workspace allocated
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="bg-emerald-500/20 text-emerald-500 flex size-5 items-center justify-center rounded-full">
                <Check className="size-3 stroke-[3]" />
              </div>
              <span className="text-foreground font-medium">
                Epistemic calibration engine ready
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="bg-primary/20 text-primary flex size-5 items-center justify-center rounded-full">
                <Loader2 className="size-3 animate-spin" />
              </div>
              <span className="text-foreground font-medium">
                Loading Dialectic Canvas...
              </span>
            </div>
          </div>

          <div className="border-border/50 text-muted-foreground mt-6 flex items-center justify-between border-t pt-4 text-[11px]">
            <span>Entering research station</span>
            <span className="font-mono">Ready</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Email/Password signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);

    try {
      // Better Auth email signup
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: callbackUrl,
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account.");
        return;
      }

      // Automatically establish session and cookies for instant onboarding
      try {
        await authClient.signIn.email({
          email,
          password,
          callbackURL: callbackUrl,
        });
        router.replace(callbackUrl);
        return;
      } catch {
        // If requireEmailVerification is active, show the verification notice
        setSuccess(true);
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create account. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setLoadingProvider("google");
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to sign up with Google. Please try again.";
      setError(
        msg.includes("not enabled") || msg.includes("not found")
          ? "Google OAuth is not configured on this instance. Please use email or ORCID."
          : msg,
      );
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleOrcidSignUp = async () => {
    setIsLoading(true);
    setLoadingProvider("orcid");
    setError(null);
    try {
      await authClient.signIn.oauth2({
        providerId: "orcid",
        callbackURL: callbackUrl,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to sign up with ORCID. Please try again.";
      setError(
        msg.includes("not enabled") || msg.includes("not found")
          ? "ORCID authentication is not configured on this instance. Please use email or Google."
          : msg,
      );
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  if (success) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Mail className="size-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            We&apos;ve sent a verification link to{" "}
            <strong className="text-foreground">{email}</strong>. Click the link
            to verify your account and get started.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                setIsLoading(true);
                try {
                  await authClient.sendVerificationEmail({
                    email,
                    callbackURL: "/verify-email",
                  });
                  setError(null);
                } catch (err) {
                  console.error("Resend verification error:", err);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Resend verification email
            </Button>
            <Link
              href="/signin"
              className="text-primary text-sm hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <img src="/logo.svg" alt="Ithaca" className="size-10" />
            <span className="text-2xl font-bold">Ithaca</span>
          </Link>
          <h1 className="mb-2 text-3xl font-bold">Create your account</h1>
          <p className="text-muted-foreground">
            Join the research community exploring citation networks
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Card */}
        <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
          {/* Mode Toggle */}
          <div className="mb-6 flex gap-2">
            <Button
              variant={mode === "oauth" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("oauth")}
            >
              Google & ORCID
            </Button>
            <Button
              variant={mode === "email" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("email")}
            >
              Email & Password
            </Button>
          </div>

          {mode === "oauth" ? (
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="relative h-12 w-full justify-center transition-all hover:bg-accent"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
              >
                {loadingProvider === "google" ? (
                  <Loader2 className="absolute left-4 h-5 w-5 animate-spin" />
                ) : (
                  <GoogleIcon className="absolute left-4 h-5 w-5" />
                )}
                <span className="font-semibold">Sign up with Google</span>
              </Button>

              <Button
                variant="outline"
                className="relative h-12 w-full justify-center border-border transition-all hover:border-[#A6CE39]/50 hover:bg-[#A6CE39]/5"
                onClick={handleOrcidSignUp}
                disabled={isLoading}
              >
                {loadingProvider === "orcid" ? (
                  <Loader2 className="absolute left-4 h-5 w-5 animate-spin text-[#A6CE39]" />
                ) : (
                  <OrcidIcon className="absolute left-4 h-5 w-5" />
                )}
                <span className="font-semibold">Sign up with ORCID</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  Full Name
                </label>
                <Input
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="researcher@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
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

                {/* Password Strength */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded ${
                            level <= passwordStrength.score
                              ? passwordStrength.color
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Password strength:{" "}
                      <span className="font-medium">
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  Confirm Password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    Passwords do not match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 font-bold tracking-wide"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p className="text-muted-foreground mt-4 text-xs">
            By creating an account, you agree to Ithaca's{" "}
            <Link href="/terms" className="hover:text-foreground underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:text-foreground underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
