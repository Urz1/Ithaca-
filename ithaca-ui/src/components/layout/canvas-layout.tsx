"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Search,
  FolderOpen,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Shield,
  Orbit,
  Keyboard,
  Compass,
} from "lucide-react";
import { UserButton } from "@/components/auth/user-button";
import { OrganizationSwitcher } from "@/components/organization/organization-switcher";
import { SupportContact } from "@/components/organization/support-contact";
import { CommandBar } from "@/components/command/command-bar";
import { KeyboardShortcutsHelp } from "@/components/canvas/keyboard-shortcuts-help";
import { getSavedGraphs, type SavedGraphData } from "@/app/(app)/dashboard/actions";
import { getOrganizationSummaries } from "@/app/(app)/admin/actions";
import { LabQuickstart } from "@/components/navigation/lab-quickstart";

function ExploreBreadcrumbContent() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("query") || searchParams.get("target") || "";
  const topic = rawQuery.startsWith("topic-")
    ? rawQuery.replace("topic-", "")
    : rawQuery;

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0 max-w-sm">
      <div className="flex items-center gap-1.5 font-semibold text-foreground shrink-0 bg-muted/40 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <Orbit className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span>Dialectic Canvas</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      {topic ? (
        <span
          className="truncate max-w-[200px] font-medium text-foreground bg-muted/60 dark:bg-zinc-900/80 px-2.5 py-1 rounded-full border border-black/[0.06] dark:border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          title={topic}
        >
          {topic}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          Active Station
        </span>
      )}
    </div>
  );
}

interface CanvasLayoutProps {
  children: React.ReactNode;
}

export default function CanvasLayout({ children }: CanvasLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [recentGraphs, setRecentGraphs] = useState<SavedGraphData[]>([]);
  const [canAdminister, setCanAdminister] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    void getSavedGraphs()
      .then((graphs) => setRecentGraphs(graphs))
      .catch(() => {});
    void getOrganizationSummaries()
      .then((orgs) => {
        const activeOrg = orgs.find((o) => o.isActive) ?? orgs[0];
        setCanAdminister(
          activeOrg?.role === "OWNER" || activeOrg?.role === "ADMIN",
        );
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handleOpenShortcuts = () => setShortcutsOpen(true);
    window.addEventListener("open-shortcuts-help", handleOpenShortcuts);
    return () => window.removeEventListener("open-shortcuts-help", handleOpenShortcuts);
  }, []);

  const isExplore = pathname?.startsWith("/explore");
  const isDashboard = pathname === "/dashboard";
  const isProjects = pathname?.startsWith("/projects");
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <div className="bg-background flex h-screen w-full overflow-hidden">
      {/* Global Command Bar fallback on non-explore routes */}
      {!isExplore && <CommandBar hideTrigger />}

      {/* Global Keyboard Shortcuts Modal */}
      <KeyboardShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Sidebar */}
      <aside
        className={`relative flex flex-col border-r border-black/[0.06] dark:border-white/[0.07] bg-[#fafafa]/95 dark:bg-[#0c0d0e]/95 backdrop-blur-2xl transition-[width] duration-300 ease-in-out z-30 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="border-b border-black/[0.06] dark:border-white/[0.07] flex h-14 items-center gap-2 px-3.5">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <img src="/logo.svg" alt="Ithaca" className="size-7 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
            {!collapsed && (
              <span className="truncate text-base font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                Ithaca
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05] shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Workspace / Organization Context */}
        <OrganizationSwitcher collapsed={collapsed} />

        {/* Scrollable Navigation Area */}
        <div className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
          {/* Main Workspaces */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="text-muted-foreground/60 mb-1.5 px-2 text-[10px] font-semibold tracking-wider uppercase">
                Research Workspace
              </p>
            )}
            <Link
              href="/dashboard"
              className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isDashboard
                  ? "bg-white dark:bg-zinc-800/90 text-foreground font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-black/[0.04] dark:border-white/[0.06]"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent"
              } ${collapsed ? "justify-center px-2" : "w-full"}`}
              title={collapsed ? "Research Hub" : undefined}
            >
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                  isDashboard
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground group-hover:text-foreground group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05]"
                }`}
              >
                <Compass className="h-4 w-4" />
              </div>
              {!collapsed && <span className="truncate">Research Hub</span>}
            </Link>

            <Link
              href="/explore"
              className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isExplore
                  ? "bg-white dark:bg-zinc-800/90 text-foreground font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-black/[0.04] dark:border-white/[0.06]"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent"
              } ${collapsed ? "justify-center px-2" : "w-full"}`}
              title={collapsed ? "Dialectic Canvas" : undefined}
            >
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                  isExplore
                    ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                    : "text-muted-foreground group-hover:text-foreground group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05]"
                }`}
              >
                <Orbit className="h-4 w-4" />
              </div>
              {!collapsed && <span className="truncate">Dialectic Canvas</span>}
            </Link>

            <Link
              href="/projects"
              className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isProjects
                  ? "bg-white dark:bg-zinc-800/90 text-foreground font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-black/[0.04] dark:border-white/[0.06]"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent"
              } ${collapsed ? "justify-center px-2" : "w-full"}`}
              title={collapsed ? "Projects & Library" : undefined}
            >
              <div
                className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                  isProjects
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground group-hover:text-foreground group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05]"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
              </div>
              {!collapsed && <span className="truncate">Projects & Library</span>}
            </Link>
          </div>

          {/* Recent Debate Maps */}
          {!collapsed && recentGraphs.length > 0 && (
            <div className="pt-2">
              <div className="mb-1.5 flex items-center justify-between px-2">
                <span className="text-muted-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                  Recent Debate Maps
                </span>
                <Link
                  href="/dashboard?tab=graphs"
                  className="text-primary text-[10px] font-medium hover:underline"
                >
                  All
                </Link>
              </div>
              <div className="space-y-1">
                {recentGraphs.slice(0, 4).map((graph) => (
                  <Link key={graph.id} href={`/explore?graph=${graph.id}`}>
                    <div className="hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground group flex items-center justify-between rounded-lg p-1.5 text-xs transition-colors">
                      <span className="group-hover:text-foreground max-w-[145px] truncate font-medium transition-colors">
                        {graph.title}
                      </span>
                      <span className="bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground border border-black/[0.04] dark:border-white/[0.06] shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
                        {graph.nodeCount}n
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Lab Governance & Preferences */}
          <div className="space-y-1 pt-2">
            {!collapsed && (
              <p className="text-muted-foreground/60 mb-1.5 px-2 text-[10px] font-semibold tracking-wider uppercase">
                {canAdminister ? "Lab Management" : "Preferences"}
              </p>
            )}
            {canAdminister && (
              <Link
                href="/admin"
                className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  isAdmin
                    ? "bg-white dark:bg-zinc-800/90 text-foreground font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-black/[0.04] dark:border-white/[0.06]"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent"
                } ${collapsed ? "justify-center px-2" : "w-full"}`}
                title={collapsed ? "Lab Administration" : undefined}
              >
                <div
                  className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                    isAdmin
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground group-hover:text-foreground group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05]"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                </div>
                {!collapsed && <span className="truncate">Lab Administration</span>}
              </Link>
            )}
            <Link
              href="/dashboard?tab=settings"
              className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent ${
                collapsed ? "justify-center px-2" : "w-full"
              }`}
              title={collapsed ? "Settings & Privacy" : undefined}
            >
              <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05]">
                <Settings className="h-4 w-4" />
              </div>
              {!collapsed && <span className="truncate">Settings & Privacy</span>}
            </Link>
          </div>

          {/* First-Run Milestone Guide */}
          <LabQuickstart collapsed={collapsed} />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.07] space-y-1 p-2">
          <button
            onClick={() => window.dispatchEvent(new Event("open-shortcuts-help"))}
            className={`w-full group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors ${
              collapsed ? "justify-center px-2" : ""
            }`}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4 shrink-0 text-muted-foreground/70 group-hover:text-foreground" />
            {!collapsed && <span className="text-xs">Shortcuts & Help</span>}
          </button>
          <SupportContact collapsed={collapsed} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="border-b border-black/[0.06] dark:border-white/[0.07] bg-background/80 dark:bg-[#0c0d0e]/80 flex h-14 items-center justify-between px-4 backdrop-blur-2xl transition-colors">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {isExplore ? (
              <Suspense
                fallback={
                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground shrink-0 bg-muted/40 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1 rounded-full">
                      <Orbit className="h-3.5 w-3.5 text-violet-500" />
                      <span>Dialectic Canvas</span>
                    </div>
                  </div>
                }
              >
                <ExploreBreadcrumbContent />
              </Suspense>
            ) : isDashboard ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5 font-semibold text-foreground shrink-0 bg-muted/40 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Compass className="h-3.5 w-3.5 text-blue-500" />
                  <span>Research Hub</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  Workspace
                </span>
              </div>
            ) : isProjects ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5 font-semibold text-foreground shrink-0 bg-muted/40 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                  <span>Projects & Library</span>
                </div>
              </div>
            ) : isAdmin ? (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5 font-semibold text-foreground shrink-0 bg-muted/40 dark:bg-zinc-900/60 border border-black/[0.06] dark:border-white/[0.08] px-2.5 py-1 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Lab Administration</span>
                </div>
              </div>
            ) : null}

            {/* Global Search / Command Bar Trigger */}
            <div
              data-tour="search"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  window.dispatchEvent(new Event("open-command-bar"));
                }
              }}
              onClick={() =>
                window.dispatchEvent(new Event("open-command-bar"))
              }
              className="border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-zinc-900/40 hover:bg-black/[0.04] dark:hover:bg-zinc-900/70 hover:border-black/[0.12] dark:hover:border-white/[0.12] text-muted-foreground group flex h-9 max-w-xs flex-1 items-center justify-between rounded-full px-3 text-xs transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="text-muted-foreground/70 group-hover:text-foreground h-3.5 w-3.5 transition-colors shrink-0" />
                <span className="truncate font-normal">Search or jump to...</span>
              </div>
              <kbd className="border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-zinc-800 text-muted-foreground group-hover:text-foreground inline-flex h-5 items-center gap-0.5 rounded-md px-1.5 font-mono text-[10px] font-medium transition-colors shadow-2xs shrink-0">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <div className="bg-border/60 h-5 w-px" />
            <UserButton />
          </div>
        </header>

        {/* Viewport */}
        <main
          className={`bg-muted/5 relative flex-1 ${
            isExplore ? "overflow-hidden" : "overflow-auto"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
