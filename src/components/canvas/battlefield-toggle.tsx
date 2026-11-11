"use client";

import React from "react";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/stores/canvas-store";

interface BattlefieldToggleProps {
  className?: string;
  disputeCount?: number;
}

/**
 * BattlefieldToggle — High-contrast toggle for filtering academic debates
 * down to active intellectual controversies and refutations.
 */
export function BattlefieldToggle({
  className,
  disputeCount = 0,
}: BattlefieldToggleProps) {
  const battlefieldMode = useCanvasStore((s) => s.battlefieldMode);
  const toggleBattlefieldMode = useCanvasStore((s) => s.toggleBattlefieldMode);

  return (
    <button
      onClick={toggleBattlefieldMode}
      title={
        battlefieldMode
          ? "Exit Battlefield Mode (restore all citations)"
          : "Enter Battlefield Mode: Highlight contradictions & disputes, dim routine citations"
      }
      className={cn(
        "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300",
        battlefieldMode
          ? "bg-red-600 text-white shadow-lg ring-2 shadow-red-500/30 ring-red-400/50"
          : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 border-border/70 border backdrop-blur-md",
        className,
      )}
    >
      <Swords
        className={cn(
          "h-3.5 w-3.5 transition-transform duration-300",
          battlefieldMode && "scale-110 rotate-12",
        )}
      />
      <span>Battlefield</span>
      {disputeCount > 0 && (
        <span
          className={cn(
            "py-0.2 ml-0.5 rounded-full px-1.5 text-[10px] leading-none font-bold",
            battlefieldMode
              ? "bg-white text-red-700"
              : "bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300",
          )}
        >
          {disputeCount}
        </span>
      )}
      {battlefieldMode && (
        <span className="relative ml-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-200 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
      )}
    </button>
  );
}
