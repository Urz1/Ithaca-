"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  acceptOrganizationInvitation,
  getInvitationByToken,
} from "@/app/(app)/admin/actions";
import { useSession } from "@/lib/auth-client";

export default function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [token, setToken] = useState<string>("");
  const [invitation, setInvitation] = useState<Awaited<
    ReturnType<typeof getInvitationByToken>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingAccept, startTransition] = useTransition();

  useEffect(() => {
    void params.then(({ token: inviteToken }) => {
      setToken(inviteToken);
      void getInvitationByToken(inviteToken)
        .then(setInvitation)
        .catch(() => setInvitation(null))
        .finally(() => setIsLoading(false));
    });
  }, [params]);

  const callbackUrl = `/invite/${token}`;

  if (isLoading || isPending) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">Invitation unavailable</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            This invitation is invalid, expired, or has already been accepted.
          </p>
          <Button asChild>
            <Link href="/signin">Go to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="bg-card border-border w-full max-w-lg rounded-xl border p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              Organization invitation
            </p>
            <h1 className="text-2xl font-bold">
              {invitation.organizationName}
            </h1>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Invited email</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Role</span>
            <Badge>{invitation.role}</Badge>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Expires</span>
            <span>{new Date(invitation.expiresAt).toLocaleString()}</span>
          </div>
        </div>

        {error && <p className="text-destructive mt-4 text-sm">{error}</p>}

        <div className="mt-8 flex flex-col gap-3">
          {!session?.user ? (
            <>
              <Button asChild>
                <Link
                  href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                >
                  Sign in to accept
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link
                  href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                >
                  Create an account
                </Link>
              </Button>
            </>
          ) : (
            <Button
              disabled={isPendingAccept}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await acceptOrganizationInvitation(token);
                    router.push("/explore");
                  } catch (acceptError) {
                    setError(
                      acceptError instanceof Error
                        ? acceptError.message
                        : "Unable to accept invitation",
                    );
                  }
                })
              }
            >
              {isPendingAccept ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Accept invitation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
