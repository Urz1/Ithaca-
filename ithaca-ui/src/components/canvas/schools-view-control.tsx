"use client";

import React from "react";
import { Network, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvas-store";

interface SchoolsViewControlProps {
  className?: string;
  schoolCount?: number;
}

/**
 * SchoolsViewControl — Toolbar toggle switching between detailed paper constellation
 * and high-level "Schools of Thought" macro-clusters.
 */
export function SchoolsViewControl({
  className,
  schoolCount = 0,
}: SchoolsViewControlProps) {
  const clusterViewMode = useCanvasStore((s) => s.clusterViewMode);
  const setClusterViewMode = useCanvasStore((s) => s.setClusterViewMode);

  return (
    <div
      className={cn(
        "bg-muted/40 dark:bg-zinc-900/40 border border-black/[0.06] dark:border-white/[0.08] inline-flex items-center gap-0.5 rounded-full p-0.5 shadow-2xs backdrop-blur-md",
        className,
      )}
    >
      <button
        onClick={() => setClusterViewMode("papers")}
        title="View individual paper constellation"
        className={cn(
          "relative flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-200",
          clusterViewMode === "papers"
            ? "bg-white dark:bg-zinc-800 text-foreground font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-black/[0.04] dark:border-white/[0.06]"
            : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent",
        )}
      >
        <Network className="h-3.5 w-3.5" />
        <span>Papers</span>
      </button>

      <button
        onClick={() => setClusterViewMode("schools")}
        title="Group papers into high-level Schools of Thought macro-clusters"
        className={cn(
          "relative flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-200",
          clusterViewMode === "schools"
            ? "bg-white dark:bg-zinc-800 text-foreground font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-black/[0.04] dark:border-white/[0.06]"
            : "text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent",
        )}
      >
        <Orbit className="h-3.5 w-3.5 text-indigo-500" />
        <span>Schools</span>
        {schoolCount > 0 && (
          <span
            className={cn(
              "py-0.2 ml-0.5 rounded-full px-1.5 text-[10px] leading-none font-bold",
              clusterViewMode === "schools"
                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                : "bg-black/[0.05] dark:bg-white/[0.06] text-muted-foreground",
            )}
          >
            {schoolCount}
          </span>
        )}
      </button>
    </div>
  );
}
