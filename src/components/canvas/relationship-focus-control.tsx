"use client";

import {
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  Layers,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useCanvasStore } from "@/stores/canvas-store";

export type RelationshipFocusType =
  "all" | "supports" | "contradicts" | "extends" | "cites";

interface RelationshipFocusControlProps {
  value: RelationshipFocusType;
  onChange: (value: RelationshipFocusType) => void;
  className?: string;
  extra?: React.ReactNode;
  counts?: {
    all: number;
    supports: number;
    contradicts: number;
    extends: number;
    cites: number;
  };
}

const OPTIONS: {
  value: RelationshipFocusType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  dotColor: string;
}[] = [
  {
    value: "all",
    label: "All Types",
    shortLabel: "All",
    icon: Layers,
    dotColor: "bg-foreground/70",
  },
  {
    value: "supports",
    label: "Supports Only",
    shortLabel: "Supports",
    icon: CheckCircle,
    dotColor: "bg-emerald-500",
  },
  {
    value: "contradicts",
    label: "Refutes Only",
    shortLabel: "Refutes",
    icon: XCircle,
    dotColor: "bg-rose-500",
  },
  {
    value: "extends",
    label: "Extends Only",
    shortLabel: "Extends",
    icon: ArrowRightCircle,
    dotColor: "bg-blue-500",
  },
  {
    value: "cites",
    label: "Cites Only",
    shortLabel: "Cites",
    icon: Link2,
    dotColor: "bg-zinc-400",
  },
];

/**
 * RelationshipFocusControl — tab-style mode switcher.
 * Positioned at bottom-center like a proper navigation control.
 */
export function RelationshipFocusControl({
  value,
  onChange,
  className,
  extra,
  counts: propCounts,
}: RelationshipFocusControlProps) {
  const storeCounts = useCanvasStore((s) => s.dialecticCounts);
  const totalEdges = useCanvasStore((s) => s.graphStats.edgeCount);
  const counts = propCounts || {
    all: totalEdges,
    ...storeCounts,
  };

  return (
    <div
      className={cn(
        "bg-muted/40 dark:bg-zinc-900/60 border-border/60 inline-flex items-center gap-0.5 rounded-full border p-0.5 shadow-xs backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-center gap-0.5">
        {OPTIONS.map((opt) => {
          const isActive = value === opt.value;
          const Icon = opt.icon;
          const count = counts?.[opt.value];
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              title={opt.label}
              className={cn(
                "relative flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-border/70 font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", opt.dotColor)} />
              <span>{opt.shortLabel}</span>
              {typeof count === "number" && counts.all > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums font-bold",
                    isActive
                      ? "bg-muted text-foreground"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {extra && (
        <>
          <div className="bg-border/60 mx-1 h-4 w-px" />
          {extra}
        </>
      )}
    </div>
  );
}
