"use client";

import React from "react";
import { Swords, Landmark, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore, type CanvasPerspective } from "@/stores/canvas-store";

interface PerspectiveControlProps {
  className?: string;
  disputeCount?: number;
  upstreamCount?: number;
}

const PERSPECTIVES: {
  value: CanvasPerspective;
  label: string;
  shortLabel: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}[] = [
  {
    value: "battlefield",
    label: "Battlefield",
    shortLabel: "Battlefield",
    tooltip:
      "The Crucible: Pure debate (refutations, confirmations, extensions). Prunes upstream bibliography noise.",
    icon: Swords,
    accentColor: "text-rose-500 dark:text-rose-400",
  },
  {
    value: "foundations",
    label: "Lineage",
    shortLabel: "Lineage",
    tooltip:
      "Foundational Roots: Seminal literature, prior axioms, and datasets the author built upon.",
    icon: Landmark,
    accentColor: "text-amber-500 dark:text-amber-400",
  },
  {
    value: "synthesis",
    label: "360° Synthesis",
    shortLabel: "360°",
    tooltip:
      "Full Ecosystem: Tri-Hemispheric River layout with West = Roots and East = Debates.",
    icon: Globe,
    accentColor: "text-indigo-500 dark:text-indigo-400",
  },
];

/**
 * PerspectiveControl — First-class perspective switcher.
 * Allows scholars to transition between the controversy crucible,
 * foundational lineage, and the full 360° synthesis.
 */
export function PerspectiveControl({
  className,
  disputeCount = 0,
  upstreamCount = 0,
}: PerspectiveControlProps) {
  const perspective = useCanvasStore((s) => s.perspective);
  const setPerspective = useCanvasStore((s) => s.setPerspective);

  return (
    <div
      className={cn(
        "bg-muted/40 dark:bg-zinc-900/60 border-border/60 inline-flex items-center gap-0.5 rounded-full border p-0.5 shadow-xs backdrop-blur-md",
        className,
      )}
    >
      {PERSPECTIVES.map((item) => {
        const isActive = perspective === item.value;
        const Icon = item.icon;

        return (
          <button
            key={item.value}
            onClick={() => setPerspective(item.value)}
            title={item.tooltip}
            className={cn(
              "relative flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-200",
              isActive
                ? "bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] border border-border/70 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                isActive ? item.accentColor : "text-muted-foreground/70",
                isActive && "scale-105",
              )}
            />
            <span>{item.shortLabel}</span>

            {/* Badges */}
            {item.value === "battlefield" && disputeCount > 0 && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] leading-none font-bold font-mono",
                  isActive
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {disputeCount}
              </span>
            )}

            {item.value === "foundations" && upstreamCount > 0 && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] leading-none font-bold font-mono",
                  isActive
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {upstreamCount}
              </span>
            )}

            {/* Micro active dot for active battlefield */}
            {isActive && item.value === "battlefield" && (
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse ml-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
