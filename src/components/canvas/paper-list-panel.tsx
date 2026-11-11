"use client";

import { useEffect, useState, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import {
  X,
  Search,
  ArrowUpDown,
  Calendar,
  Quote,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PaperData } from "@/components/inspector/paper-inspector";

interface PaperListPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  papers: PaperData[];
  hoveredNode: string | null;
  onHoverNode: (nodeId: string | null) => void;
  onSelectNode: (nodeId: string) => void;
  className?: string; // For adding responsive classes
}

type SortField = "citation" | "year" | "title";
type SortOrder = "asc" | "desc";

export const PaperListPanel = memo(function PaperListPanel({
  open,
  onOpenChange,
  papers,
  hoveredNode,
  onHoverNode,
  onSelectNode,
  className,
}: PaperListPanelProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("citation");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Reset search when closed to be clean? Optionally.

  // Filter and Sort
  const filteredAndSortedPapers = useMemo(() => {
    let result = [...papers];

    // Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors.toLowerCase().includes(q) ||
          p.year.toString().includes(q),
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a.citations;
      let valB: any = b.citations;

      if (sortField === "year") {
        valA = a.year;
        valB = b.year;
      } else if (sortField === "title") {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [papers, search, sortField, sortOrder]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="bg-background/80 animate-in fade-in fixed inset-0 z-40 backdrop-blur-sm md:hidden"
        onClick={() => onOpenChange(false)}
      />

      <div
        className={cn(
          "bg-card fixed top-0 right-0 z-50 h-full w-full border-l shadow-2xl transition-transform duration-300 ease-in-out md:w-[400px]",
          !open && "translate-x-full",
          "flex flex-col",
          className,
        )}
      >
        {/* Header */}
        <div className="bg-muted/40 space-y-4 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Papers</h2>
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0.5 text-xs"
              >
                {filteredAndSortedPapers.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search title, author, year..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background pl-9"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sort by:</span>
            <div className="bg-background flex gap-1 rounded-md border p-1">
              <SortButton
                active={sortField === "citation"}
                onClick={() => {
                  if (sortField === "citation")
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else {
                    setSortField("citation");
                    setSortOrder("desc");
                  }
                }}
                label="Cites"
                icon={<Quote className="mr-1 h-3 w-3" />}
              />
              <SortButton
                active={sortField === "year"}
                onClick={() => {
                  if (sortField === "year")
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else {
                    setSortField("year");
                    setSortOrder("desc");
                  }
                }}
                label="Year"
                icon={<Calendar className="mr-1 h-3 w-3" />}
              />
              <SortButton
                active={sortField === "title"}
                onClick={() => {
                  if (sortField === "title")
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  else {
                    setSortField("title");
                    setSortOrder("asc");
                  }
                }}
                label="Name"
                icon={<FileText className="mr-1 h-3 w-3" />}
              />
            </div>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredAndSortedPapers.length === 0 ? (
              <div className="text-muted-foreground py-10 text-center">
                <p>No papers found matching "{search}"</p>
              </div>
            ) : (
              filteredAndSortedPapers.map((paper) => (
                <div
                  key={paper.id}
                  className={cn(
                    "group flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-3 transition-all",
                    hoveredNode === paper.id
                      ? "bg-primary/10 border-primary/20 shadow-sm"
                      : "hover:bg-muted/50 border-border/40",
                  )}
                  onMouseEnter={() => onHoverNode(paper.id)}
                  onMouseLeave={() => onHoverNode(null)}
                  onClick={() => {
                    onSelectNode(paper.id);
                    // On mobile, close list after selection?
                    // Maybe. But let's leave it open on desktop.
                    if (window.innerWidth < 768) onOpenChange(false);
                  }}
                >
                  <div
                    className={cn(
                      "w-1 self-stretch rounded-full transition-colors",
                      hoveredNode === paper.id
                        ? "bg-primary"
                        : "group-hover:bg-muted-foreground/30 bg-transparent",
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={cn(
                          "line-clamp-2 text-sm leading-tight font-medium",
                          hoveredNode === paper.id
                            ? "text-primary"
                            : "text-foreground",
                        )}
                      >
                        {paper.title}
                      </h3>
                      {paper.id.startsWith("topic-") && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[10px]"
                        >
                          Topic
                        </Badge>
                      )}
                    </div>

                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span className="max-w-[120px] truncate">
                        {paper.authors.split(",")[0]} et al.
                      </span>
                      <span>•</span>
                      <span>{paper.year}</span>
                      <span className="text-primary/80 bg-primary/5 ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]">
                        {paper.citations} cites
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={cn(
                      "text-muted-foreground h-4 w-4 -translate-x-2 opacity-0 transition-all",
                      hoveredNode === paper.id
                        ? "translate-x-0 opacity-100"
                        : "group-hover:translate-x-0 group-hover:opacity-50",
                    )}
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
});

function SortButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded px-2 py-1 text-[10px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
