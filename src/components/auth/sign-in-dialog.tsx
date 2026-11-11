"use client";

import * as React from "react";
import { useState } from "react";
import { Globe } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/explore",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            Sign in to your workspace
          </DialogTitle>
          <DialogDescription>
            Access citation graphs, research networks, and collaborative tools.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-4">
          <Button
            variant="outline"
            className="relative h-12 justify-center"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Globe className="absolute left-4 h-5 w-5" />
            <span className="font-semibold">Sign in with Google</span>
          </Button>

          <div className="flex items-center gap-3 py-2">
            <div className="bg-border h-px flex-1" />
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Or use email
            </p>
            <div className="bg-border h-px flex-1" />
          </div>

          <Button asChild className="h-11 font-bold tracking-wide">
            <Link href="/signin">Continue with email and password</Link>
          </Button>

          <div className="bg-muted/50 -mx-6 mt-4 -mb-6 border-t px-6 py-4 text-center">
            <p className="text-muted-foreground text-xs">
              By continuing, you agree to Ithaca&apos;s{" "}
              <a href="/terms" className="hover:text-foreground underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="hover:text-foreground underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
