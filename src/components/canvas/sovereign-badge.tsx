"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GraduationCap, Landmark } from "lucide-react";
import { SOVEREIGN_REPOSITORIES } from "@/lib/api/oai-pmh-client";

interface SovereignBadgeProps {
  institutionSlug?: string;
  handleUri?: string;
  advisors?: string[];
  size?: "sm" | "md";
  showLink?: boolean;
}

export function SovereignBadge({
  institutionSlug,
  handleUri,
  advisors,
  size = "md",
  showLink = true,
}: SovereignBadgeProps) {
  const repo = institutionSlug
    ? SOVEREIGN_REPOSITORIES[institutionSlug.toLowerCase()]
    : null;
  const label = repo ? repo.name : "Institutional Archive";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={`gap-1 border-emerald-300 bg-emerald-50 font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ${
            size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2.5 py-0.5 text-xs"
          }`}
        >
          <Landmark className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>{label}</span>
        </Badge>

        {showLink && handleUri && (
          <a
            href={handleUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 transition-colors hover:underline dark:text-emerald-400"
            title="Open thesis in university repository"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            <span>Repository Handle</span>
          </a>
        )}
      </div>

      {advisors && advisors.length > 0 && (
        <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[11px]">
          <GraduationCap className="h-3 w-3 shrink-0 text-emerald-600" />
          <span className="text-foreground/80 font-medium">
            Advisors: {advisors.join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

export const InstitutionalBadge = SovereignBadge;
