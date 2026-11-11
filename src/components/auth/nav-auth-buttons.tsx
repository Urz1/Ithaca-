"use client";

import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export function NavAuthButtons() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-muted h-9 w-20 animate-pulse rounded-md" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <UserMenu variant="minimal" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Link href="/signin">Sign In</Link>
      </Button>
      <Button
        asChild
        size="sm"
        className="gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background shadow-xs transition-all hover:bg-foreground/90 active:scale-95"
      >
        <Link href="/signup">
          <span>Get Started</span>
          <span className="text-[10px] opacity-70">→</span>
        </Link>
      </Button>
    </div>
  );
}
