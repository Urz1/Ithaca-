"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOrganizationSummaries,
  setActiveOrganization,
  type OrganizationSummary,
} from "@/app/(app)/admin/actions";

interface OrganizationSwitcherProps {
  collapsed?: boolean;
}

export function OrganizationSwitcher({ collapsed = false }: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void getOrganizationSummaries()
      .then(setOrganizations)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        {!collapsed && <span className="text-muted-foreground text-xs">Loading workspace...</span>}
      </div>
    );
  }

  const activeOrganization =
    organizations.find((organization) => organization.isActive) ??
    organizations[0] ?? {
      id: "default",
      name: "Pilot Lab",
      role: "OWNER" as const,
      isActive: true,
    };

  const canAdminister =
    activeOrganization.role === "OWNER" || activeOrganization.role === "ADMIN";
  const orgHref = canAdminister ? "/admin" : "/dashboard";

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-2">
        <Link href={orgHref} title={activeOrganization.name}>
          <div className="bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-purple-500/10 border border-violet-500/30 text-violet-600 dark:text-violet-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_1px_2px_rgba(0,0,0,0.06)] hover:border-violet-500/50 flex size-9 items-center justify-center rounded-xl font-mono text-xs font-bold transition-all hover:scale-105">
            {activeOrganization.name.slice(0, 2).toUpperCase()}
          </div>
        </Link>
      </div>
    );
  }

  if (organizations.length <= 1) {
    return (
      <div className="px-3 py-1.5">
        <Link
          href={orgHref}
          className="group relative flex items-center justify-between rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-card/60 dark:bg-zinc-900/40 hover:bg-card hover:dark:bg-zinc-900/80 p-2 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-sm"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-purple-500/10 text-violet-600 dark:text-violet-300 font-mono text-xs font-bold shadow-xs transition-transform group-hover:scale-105">
              {activeOrganization.name.slice(0, 2).toUpperCase()}
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="min-w-0 text-left">
              <div className="text-foreground truncate text-xs font-semibold leading-snug">
                {activeOrganization.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                <span className="text-muted-foreground/80 font-medium capitalize">
                  {activeOrganization.role.toLowerCase()}
                </span>
                <span className="text-muted-foreground/30 font-mono">·</span>
                <span className="rounded bg-muted px-1 py-0.2 font-mono text-[9px] font-semibold text-muted-foreground">
                  Lab
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5">
      <Select
        value={activeOrganization.id}
        disabled={isPending}
        onValueChange={(organizationId) =>
          startTransition(async () => {
            await setActiveOrganization(organizationId);
            window.location.reload();
          })
        }
      >
        <SelectTrigger className="bg-card/60 dark:bg-zinc-900/40 border border-black/[0.06] dark:border-white/[0.08] hover:bg-card hover:dark:bg-zinc-900/80 h-12 w-full rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex min-w-0 items-center gap-2.5">
            {isPending ? (
              <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <div className="border-violet-500/30 bg-gradient-to-br from-violet-500/20 via-indigo-500/15 to-purple-500/10 text-violet-600 dark:text-violet-300 flex size-7 shrink-0 items-center justify-center rounded-lg border font-mono text-[10px] font-bold">
                {activeOrganization.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 text-left">
              <div className="truncate text-xs font-semibold leading-tight">{activeOrganization.name}</div>
              <div className="text-muted-foreground text-[10px] capitalize">{activeOrganization.role.toLowerCase()}</div>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          {organizations.map((organization) => (
            <SelectItem key={organization.id} value={organization.id}>
              {organization.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
