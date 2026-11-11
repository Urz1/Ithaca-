"use client";

import { CalendarClock } from "lucide-react";
import { useSigma } from "@react-sigma/core";
import { applyTemporalLayout, restoreForceLayout } from "@/lib/temporal-layout";

interface TemporalLayoutControlProps {
  layoutMode: "force" | "temporal";
  onChange: (mode: "force" | "temporal") => void;
  minYear?: number;
  maxYear?: number;
}

/**
 * Toggle timeline layout on the same canvas (x = publication year).
 */
export function TemporalLayoutControl({
  layoutMode,
  onChange,
  minYear,
  maxYear,
}: TemporalLayoutControlProps) {
  const sigma = useSigma();
  const active = layoutMode === "temporal";

  const handleToggle = () => {
    const graph = sigma.getGraph();
    if (!active) {
      applyTemporalLayout(graph, { minYear, maxYear });
      sigma.refresh();
      onChange("temporal");
      return;
    }
    restoreForceLayout(graph);
    sigma.refresh();
    onChange("force");
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={active ? "Return to force layout" : "Timeline by year"}
      className={`flex h-8 w-8 items-center justify-center rounded border text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted"
      }`}
      aria-pressed={active}
    >
      <CalendarClock className="h-4 w-4" />
    </button>
  );
}
