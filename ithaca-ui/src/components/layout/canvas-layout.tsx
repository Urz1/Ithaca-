"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Search,
  FolderOpen,
  Settings,
  Menu,
  ChevronLeft,
  LayoutDashboard,
  Shield,
  Orbit,
  Keyboard,
  Compass,
} from "lucide-react";
import { useState, useEffect } from "react";
import { UserButton } from "@/components/auth/user-button";
import { OrganizationSwitcher } from "@/components/organization/organization-switcher";
import { SupportContact } from "@/components/organization/support-contact";
import { CommandBar } from "@/components/command/command-bar";
import { KeyboardShortcutsHelp } from "@/components/canvas/keyboard-shortcuts-help";
import { getSavedGraphs, type SavedGraphData } from "@/app/(app)/dashboard/actions";
import { getOrganizationSummaries } from "@/app/(app)/admin/actions";
import { LabQuickstart } from "@/components/navigation/lab-quickstart";

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
        className={`border-border bg-muted/10 relative flex flex-col border-r transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="border-border flex h-14 items-center gap-2 border-b px-3">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <img src="/logo.svg" alt="Ithaca" className="size-8 shrink-0" />
            {!collapsed && (
              <span className="truncate text-lg font-bold tracking-tight">Ithaca</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground shrink-0"
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
              <p className="text-muted-foreground/70 mb-1.5 px-2 text-[10px] font-bold tracking-wider uppercase">
                Research Workspace
              </p>
            )}
            <Link href="/dashboard">
              <Button
                variant={isDashboard ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2.5 ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Research Hub" : undefined}
              >
                <Compass className="text-primary h-4 w-4 shrink-0" />
                {!collapsed && <span className="font-medium">Research Hub</span>}
              </Button>
            </Link>
            <Link href="/explore">
              <Button
                variant={isExplore ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2.5 ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Dialectic Canvas" : undefined}
              >
                <Orbit className="h-4 w-4 shrink-0 text-violet-500" />
                {!collapsed && <span className="font-medium">Dialectic Canvas</span>}
              </Button>
            </Link>
            <Link href="/projects">
              <Button
                variant={isProjects ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2.5 ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Projects & Library" : undefined}
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                {!collapsed && <span className="font-medium">Projects & Library</span>}
              </Button>
            </Link>
          </div>

          {/* Recent Debate Maps */}
          {!collapsed && recentGraphs.length > 0 && (
            <div className="pt-2">
              <div className="mb-1.5 flex items-center justify-between px-2">
                <span className="text-muted-foreground/70 text-[10px] font-bold tracking-wider uppercase">
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
                    <div className="hover:bg-muted/70 text-muted-foreground hover:text-foreground group flex items-center justify-between rounded-md p-1.5 text-xs transition-colors">
                      <span className="group-hover:text-primary max-w-[145px] truncate font-medium transition-colors">
                        {graph.title}
                      </span>
                      <span className="bg-muted/80 text-muted-foreground border-border/50 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]">
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
              <p className="text-muted-foreground/70 mb-1.5 px-2 text-[10px] font-bold tracking-wider uppercase">
                {canAdminister ? "Lab Management" : "Preferences"}
              </p>
            )}
            {canAdminister && (
              <Link href="/admin">
                <Button
                  variant={isAdmin ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-2.5 ${collapsed ? "justify-center px-2" : ""}`}
                  title={collapsed ? "Lab Administration" : undefined}
                >
                  <Shield className="h-4 w-4 shrink-0 text-emerald-500" />
                  {!collapsed && <span className="font-medium">Lab Administration</span>}
                </Button>
              </Link>
            )}
            <Link href="/dashboard?tab=settings">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-2.5 ${collapsed ? "justify-center px-2" : ""}`}
                title={collapsed ? "Settings & Privacy" : undefined}
              >
                <Settings className="text-muted-foreground h-4 w-4 shrink-0" />
                {!collapsed && <span className="font-medium">Settings & Privacy</span>}
              </Button>
            </Link>
          </div>

          {/* First-Run Milestone Guide */}
          <LabQuickstart collapsed={collapsed} />
        </div>

        {/* Footer Actions */}
        <div className="border-border space-y-1 border-t p-2">
          <Button
            variant="ghost"
            onClick={() => window.dispatchEvent(new Event("open-shortcuts-help"))}
            className={`text-muted-foreground hover:text-foreground w-full justify-start gap-2.5 ${
              collapsed ? "justify-center px-2" : ""
            }`}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-xs">Shortcuts & Help</span>}
          </Button>
          <SupportContact collapsed={collapsed} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="border-border/80 bg-background/85 flex h-14 items-center justify-between border-b px-4 backdrop-blur-md transition-colors">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {/* Contextual Station Breadcrumb */}
            {isExplore ? (
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Orbit className="h-4 w-4 text-violet-500" />
                  Dialectic Canvas
                </span>
                <span className="text-muted-foreground/40">/</span>
                <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                  Active Station
                </span>
              </div>
            ) : isDashboard ? (
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Compass className="h-4 w-4 text-primary" />
                  Research Hub
                </span>
                <span className="text-muted-foreground/40">/</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                  Workspace
                </span>
              </div>
            ) : isProjects ? (
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                  Projects & Library
                </span>
              </div>
            ) : isAdmin ? (
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Lab Administration
                </span>
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
              className="border-input/70 bg-muted/30 hover:bg-muted/60 hover:border-border text-muted-foreground group flex h-9 max-w-xs flex-1 items-center justify-between rounded-lg border px-3 text-xs transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="text-muted-foreground/70 group-hover:text-foreground h-3.5 w-3.5 transition-colors shrink-0" />
                <span className="truncate font-normal">Search or jump to...</span>
              </div>
              <kbd className="border-border/80 bg-background/80 text-muted-foreground group-hover:text-foreground inline-flex h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium transition-colors shrink-0">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <div className="bg-border h-5 w-px" />
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
