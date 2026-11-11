import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
      {/* Illustration */}
      <div className="relative mb-8 flex h-48 w-64 items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/20">
        {/* Ocean waves */}
        <div className="absolute bottom-0 h-16 w-full bg-gradient-to-t from-blue-300 to-transparent dark:from-blue-600" />
        {/* Simple ship icon */}
        <div className="relative z-10 mb-4">
          <svg
            className="h-24 w-24 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 17h18M5 17l2-7h10l2 7M9 10V5l3-2 3 2v5"
            />
          </svg>
        </div>
      </div>

      {/* Text Content */}
      <h1 className="text-primary mb-4 text-6xl font-bold">404</h1>
      <h2 className="text-foreground mb-2 text-2xl font-bold">
        This page seems lost at sea.
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        Like Odysseus on his journey, you've drifted off course. The coordinates
        for this argument graph couldn't be found.
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Head back to Ithaca
          </Button>
        </Link>
        <Button variant="outline" className="gap-2">
          <AlertCircle className="h-4 w-4" />
          Report an issue
        </Button>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-center">
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <Link
            href="/docs"
            className="hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/status"
            className="hover:text-foreground transition-colors"
          >
            Status
          </Link>
        </div>
        <p className="text-muted-foreground mt-4 text-xs">
          © 2026 Ithaca Science. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
