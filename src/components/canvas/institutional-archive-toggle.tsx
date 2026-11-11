"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Landmark } from "lucide-react";

interface InstitutionalArchiveToggleProps {
  active: boolean;
  onToggle: () => void;
  count?: number;
  className?: string;
}

export function InstitutionalArchiveToggle({
  active,
  onToggle,
  count,
  className = "",
}: InstitutionalArchiveToggleProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={`h-7.5 px-2.5 rounded-full text-xs shadow-2xs transition-all ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white dark:border-emerald-600 dark:bg-emerald-600"
          : "border-black/[0.06] dark:border-white/[0.08] bg-muted/40 dark:bg-zinc-900/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-foreground"
      } ${className}`}
      title="Filter for verified open-access institutional repositories & university archives"
    >
      <Landmark
        className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white" : "text-emerald-600"}`}
      />
      <span className="font-semibold hidden 2xl:inline">Open Archives</span>
      <span className="font-semibold 2xl:hidden">Archives</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={`py-0.2 ml-1 rounded-full px-1.5 text-[10px] font-bold ${
            active
              ? "bg-white/20 text-white"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {count}
        </span>
      )}
    </Button>
  );
}

// Backward compatibility alias
export const NationalExplorerToggle = InstitutionalArchiveToggle;
