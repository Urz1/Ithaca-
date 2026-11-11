"use client";

import { Suspense, useState, useEffect } from "react";
import { Globe, Loader2, Eye, EyeOff, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background flex min-h-screen items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SignInContent />
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

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/explore";
  const { data: session, isPending } = useSession();

  const [mode, setMode] = useState<"oauth" | "email">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "orcid" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(callbackUrl);
    }
  }, [session, isPending, router, callbackUrl]);

  if (isPending || session?.user) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleEmailSignIn = async (
    event?: React.FormEvent,
    overrideEmail?: string,
    overridePass?: string,
  ) => {
    if (event) event.preventDefault();
    setIsLoading(true);
    setError(null);

    const targetEmail = (overrideEmail ?? email).trim();
    const targetPassword = (overridePass ?? password).trim();

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: targetEmail,
        password: targetPassword,
        callbackURL: callbackUrl,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
          : "Failed to sign in with Google. Please try again.";
      setError(
        msg.includes("not enabled") || msg.includes("not found")
          ? "Google OAuth is not configured on this instance. Please use email or ORCID."
          : msg,
      );
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleOrcidSignIn = async () => {
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
          : "Failed to sign in with ORCID. Please try again.";
      setError(
        msg.includes("not enabled") || msg.includes("not found")
          ? "ORCID authentication is not configured on this instance. Please use email or Google."
          : msg,
      );
      setIsLoading(false);
      setLoadingProvider(null);
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
          <h1 className="mb-2 text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to access your research workspace
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-card border-border rounded-xl border p-6 shadow-lg">
          <div className="mb-6 flex gap-2">
            <Button
              variant={mode === "email" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("email")}
            >
              Email & Password
            </Button>
            <Button
              variant={mode === "oauth" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("oauth")}
            >
              Google & ORCID
            </Button>
          </div>

          {mode === "oauth" ? (
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="relative h-12 w-full justify-center transition-all hover:bg-accent"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                {loadingProvider === "google" ? (
                  <Loader2 className="absolute left-4 h-5 w-5 animate-spin" />
                ) : (
                  <GoogleIcon className="absolute left-4 h-5 w-5" />
                )}
                <span className="font-semibold">Sign in with Google</span>
              </Button>

              <Button
                variant="outline"
                className="relative h-12 w-full justify-center border-border transition-all hover:border-[#A6CE39]/50 hover:bg-[#A6CE39]/5"
                onClick={handleOrcidSignIn}
                disabled={isLoading}
              >
                {loadingProvider === "orcid" ? (
                  <Loader2 className="absolute left-4 h-5 w-5 animate-spin text-[#A6CE39]" />
                ) : (
                  <OrcidIcon className="absolute left-4 h-5 w-5" />
                )}
                <span className="font-semibold">Sign in with ORCID</span>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold uppercase">
                  Email Address
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

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground text-xs font-semibold uppercase">
                    Password
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-primary text-xs hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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

              <Button
                type="submit"
                className="h-11 font-bold tracking-wide"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}

          {/* Quick Demo Access Buttons */}
          <div className="border-border mt-6 border-t pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                ⚡ Demo Quick Sign-In
              </span>
              <span className="text-muted-foreground text-[11px]">
                Click to auto-fill & login
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setEmail("pilot-owner@ithaca.test");
                  setPassword("PilotPass123!");
                  handleEmailSignIn(
                    undefined,
                    "pilot-owner@ithaca.test",
                    "PilotPass123!",
                  );
                }}
                className="border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/50 flex cursor-pointer flex-col items-start rounded-lg border p-2.5 text-left transition disabled:opacity-50"
              >
                <span className="text-foreground text-xs font-semibold">
                  👑 Pilot Owner
                </span>
                <span className="text-muted-foreground text-[10px]">
                  PI / Full Lab Admin
                </span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setEmail("pilot-viewer@ithaca.test");
                  setPassword("PilotPass123!");
                  handleEmailSignIn(
                    undefined,
                    "pilot-viewer@ithaca.test",
                    "PilotPass123!",
                  );
                }}
                className="border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/50 flex cursor-pointer flex-col items-start rounded-lg border p-2.5 text-left transition disabled:opacity-50"
              >
                <span className="text-foreground text-xs font-semibold">
                  👁️ Pilot Viewer
                </span>
                <span className="text-muted-foreground text-[10px]">
                  Read-Only Researcher
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href={`/signup${callbackUrl !== "/explore" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
