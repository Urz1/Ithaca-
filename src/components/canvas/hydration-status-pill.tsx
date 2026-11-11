"use client";

import React from "react";
import { useCanvasStore } from "@/stores/canvas-store";
import { Zap, CheckCircle2 } from "lucide-react";

export function HydrationStatusPill() {
  const hydrationState = useCanvasStore((s) => s.hydrationState);
  const { isHydrating, totalEdges, hydratedEdges, cachedCount } =
    hydrationState;

  if (!isHydrating && hydratedEdges === 0) {
    return null;
  }

  const percent =
    totalEdges > 0
      ? Math.min(100, Math.round((hydratedEdges / totalEdges) * 100))
      : 100;
  const isComplete = !isHydrating && hydratedEdges > 0;

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium shadow-md backdrop-blur-md transition-all duration-500 ${
        isComplete
          ? "bg-background/80 border-emerald-500/30 text-emerald-600 opacity-90 dark:text-emerald-400"
          : "bg-background/90 border-border text-foreground"
      }`}
    >
      {isComplete ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Zap className="h-3.5 w-3.5 animate-pulse text-amber-500" />
      )}

      <span>
        {isComplete
          ? `All ${totalEdges} stances classified`
          : `Classifying stances: ${hydratedEdges}/${totalEdges} (${percent}%)`}
      </span>

      {!isComplete && (
        <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {cachedCount > 0 && !isComplete && (
        <span className="text-muted-foreground text-[10px]">
          ({cachedCount} cached)
        </span>
      )}
    </div>
  );
}
