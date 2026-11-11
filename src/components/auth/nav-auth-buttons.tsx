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
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href="/signin">Sign In</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/signup">Get Started</Link>
      </Button>
    </div>
  );
}
