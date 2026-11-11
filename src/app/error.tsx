"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
      {/* Red glow illustration */}
      <div className="relative mb-8 h-48 w-48">
        <div className="bg-gradient-radial absolute inset-0 rounded-full from-red-500/30 via-red-500/10 to-transparent blur-2xl" />
        <div className="bg-gradient-radial absolute inset-8 rounded-full from-red-400/40 via-red-400/20 to-transparent blur-xl" />
      </div>

      {/* Text Content */}
      <h1 className="text-foreground mb-2 text-center text-3xl font-bold">
        Our servers are drifting we're on it.
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        An unexpected storm has thrown our argument graph off course. We're
        working to regain scientific stability.
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => reset()}
          className="gap-2 bg-red-600 hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          Reload
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </Link>
      </div>

      {/* Error ID */}
      {error.digest && (
        <p className="text-muted-foreground mt-8 font-mono text-xs">
          REPORT ID: {error.digest}
        </p>
      )}

      {/* Footer */}
      <footer className="absolute bottom-8 text-center">
        <p className="text-muted-foreground text-xs">
          © Ithaca Scientific Graphing
        </p>
      </footer>
    </div>
  );
}
