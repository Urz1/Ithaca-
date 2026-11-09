"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  FileText,
  Search,
  History,
  Zap,
  Network,
  Download,
  Settings,
  Keyboard,
  Filter,
  Moon,
  Sun,
  Loader2,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import { graphAPI, SearchResult } from "@/lib/api/graph-api";
import { useCanvasStore } from "@/stores/canvas-store";
import { CheckCircle, XCircle, ArrowRightCircle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RelationshipFocusType } from "@/components/canvas/relationship-focus-control";

interface CommandBarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelectPaper?: (paperId: string) => void;
  onAction?: (action: string) => void;
  hideTrigger?: boolean;
}

export function CommandBar({
  open: controlledOpen,
  onOpenChange,
  onSelectPaper,
  onAction,
  hideTrigger = false,
}: CommandBarProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [topicResults, setTopicResults] = useState<SearchResult[]>([]);
  const [recentPapers, setRecentPapers] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { theme, setTheme } = useTheme();
  const relationshipFocus = useCanvasStore((s) => s.relationshipFocus);
  const setRelationshipFocus = useCanvasStore((s) => s.setRelationshipFocus);

  const focusOptions: {
    value: RelationshipFocusType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    activeColor: string;
    desc: string;
  }[] = [
    {
      value: "all",
      label: "All",
      icon: Layers,
      color: "text-muted-foreground",
      activeColor: "bg-primary text-primary-foreground border-primary",
      desc: "Every relationship",
    },
    {
      value: "supports",
      label: "Supports",
      icon: CheckCircle,
      color: "text-emerald-500",
      activeColor: "bg-emerald-600 text-white border-emerald-600",
      desc: "Papers that agree",
    },
    {
      value: "contradicts",
      label: "Refutes",
      icon: XCircle,
      color: "text-red-500",
      activeColor: "bg-red-600 text-white border-red-600",
      desc: "Papers that disagree",
    },
    {
      value: "extends",
      label: "Extends",
      icon: ArrowRightCircle,
      color: "text-blue-500",
      activeColor: "bg-blue-600 text-white border-blue-600",
      desc: "Papers that build on",
    },
  ];

  // Listen for keyboard shortcut and external open events
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    const openEvent = () => setOpen(true);
    const closeEvent = () => setOpen(false);

    document.addEventListener("keydown", down);
    window.addEventListener("open-command-bar", openEvent);
    window.addEventListener("close-command-bar", closeEvent);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener("open-command-bar", openEvent);
      window.removeEventListener("close-command-bar", closeEvent);
    };
  }, [open, setOpen]);

  // Load recent papers on mount
  useEffect(() => {
    async function loadRecent() {
      try {
        const results = await graphAPI.searchPapers("");
        setRecentPapers(results.slice(0, 3));
      } catch {
        // Recent papers are non-critical
      }
    }
    loadRecent();
  }, []);

  // Search papers when query changes
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      setTopicResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Fetch papers and topics in parallel
        const [papers, topics] = await Promise.all([
          graphAPI.searchPapers(search),
          graphAPI.searchTopics(search),
        ]);
        setSearchResults(papers);
        setTopicResults(topics);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
        setTopicResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(searchTimeout);
  }, [search]);

  const handleSelectPaper = useCallback(
    (paperId: string) => {
      if (onSelectPaper) {
        onSelectPaper(paperId);
      } else {
        router.push(`/explore?paper=${encodeURIComponent(paperId)}`);
      }
      setOpen(false);
      setSearch("");
    },
    [onSelectPaper, router, setOpen],
  );

  const handleAction = useCallback(
    (action: string) => {
      if (onAction) {
        onAction(action);
      } else {
        if (action === "shortcuts") {
          window.dispatchEvent(new Event("open-shortcuts-help"));
        } else if (action === "settings") {
          router.push("/dashboard?tab=settings");
        } else if (
          action === "reset-view" ||
          action === "open-filters" ||
          action === "export" ||
          action === "toggle-physics"
        ) {
          router.push("/explore");
        }
      }
      setOpen(false);
    },
    [onAction, router, setOpen],
  );

  return (
    <>
      {/* Trigger Button */}
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="bg-background/95 border-border/50 hover:bg-muted/80 group fixed top-4 left-1/2 z-40 flex w-full max-w-sm -translate-x-1/2 items-center justify-between gap-2 rounded-full border px-4 py-2.5 shadow-lg backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-95 md:w-auto md:justify-start"
        >
          <div className="flex items-center gap-2">
            <Search className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors" />
            <span className="text-muted-foreground group-hover:text-foreground text-sm transition-colors">
              Search papers, actions...
            </span>
          </div>
          <kbd className="border-border bg-muted/50 text-muted-foreground hidden h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      )}

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* Relationship Focus Selector — pick intent before searching */}
        <div className="border-border border-b px-3 pt-3 pb-2">
          <p className="text-muted-foreground mb-2 text-[10px] font-bold tracking-wider uppercase">
            What are you looking for?
          </p>
          <div className="flex gap-1.5">
            {focusOptions.map((opt) => {
              const isActive = relationshipFocus === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setRelationshipFocus(opt.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? opt.activeColor
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <CommandInput
          placeholder={
            relationshipFocus === "all"
              ? "Search papers, authors, or topics..."
              : `Search for papers that ${relationshipFocus === "supports" ? "support" : relationshipFocus === "contradicts" ? "refute" : "extend"} others...`
          }
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? (
              <div className="py-6 text-center">
                <Loader2 className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">Searching...</p>
              </div>
            ) : (
              <div className="py-6 text-center">
                <Search className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  No results found.
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Try searching for a paper title or author
                </p>
              </div>
            )}
          </CommandEmpty>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <CommandGroup heading="Search Results">
              {searchResults.map((paper) => (
                <CommandItem
                  key={paper.id}
                  value={paper.title}
                  onSelect={() => handleSelectPaper(paper.id)}
                  className="cursor-pointer py-3"
                >
                  <FileText className="text-muted-foreground/70 mr-3 h-5 w-5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="heading-text text-sm font-medium">
                      {paper.title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {paper.authors} • {paper.year}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Topic Results */}
          {topicResults.length > 0 && (
            <CommandGroup heading="Topics">
              {topicResults.map((topic) => (
                <CommandItem
                  key={topic.id}
                  value={`topic:${topic.title}`}
                  onSelect={() => handleSelectPaper(topic.id)}
                  className="cursor-pointer py-3"
                >
                  <BookOpen className="mr-3 h-5 w-5 text-violet-500/70" />
                  <div className="flex flex-col gap-0.5">
                    <span className="heading-text text-sm font-medium">
                      {topic.title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {topic.authors}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Recent Papers (when no search) */}
          {!search && recentPapers.length > 0 && (
            <CommandGroup heading="Recent Papers">
              {recentPapers.map((paper) => (
                <CommandItem
                  key={paper.id}
                  value={paper.title}
                  onSelect={() => handleSelectPaper(paper.id)}
                  className="cursor-pointer py-3"
                >
                  <History className="text-muted-foreground/70 mr-3 h-5 w-5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="heading-text text-sm font-medium">
                      {paper.title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {paper.authors} • {paper.year}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions" className="pt-2">
            <CommandItem
              onSelect={() => handleAction("tour")}
              className="py-2.5"
            >
              <Sparkles className="text-primary mr-2 h-4 w-4" />
              <span>Take Guided Tour</span>
              <CommandShortcut>Tour</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => handleAction("toggle-physics")}
              className="py-2.5"
            >
              <Zap className="mr-2 h-4 w-4 text-yellow-500/80" />
              <span>Toggle Physics Simulation</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("reset-view")}>
              <Network className="mr-2 h-4 w-4" />
              <span>Reset Graph View</span>
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("open-filters")}>
              <Filter className="mr-2 h-4 w-4" />
              <span>Open Filters</span>
              <CommandShortcut>⌘F</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("export")}>
              <Download className="mr-2 h-4 w-4" />
              <span>Export Graph</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Settings */}
          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => {
                setTheme(theme === "dark" ? "light" : "dark");
                setOpen(false);
              }}
            >
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              <span>Toggle Theme</span>
              <CommandShortcut>⌘T</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("shortcuts")}>
              <Keyboard className="mr-2 h-4 w-4" />
              <span>Keyboard Shortcuts</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleAction("settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
