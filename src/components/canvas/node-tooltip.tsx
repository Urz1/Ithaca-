"use client";

import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

interface PaperTooltipState {
  visible: boolean;
  nodeId: string;
  label: string;
  title: string;
  paperId: string;
  authors: string;
  year: number;
  venue: string;
  citations: number;
  supports: number;
  refutes: number;
  isHighImpact: boolean;
  cluster: number;
  status: "solid" | "ghost";
  abstract: string;
}

const initialState: PaperTooltipState = {
  visible: false,
  nodeId: "",
  label: "",
  title: "",
  paperId: "",
  authors: "",
  year: 2024,
  venue: "",
  citations: 0,
  supports: 0,
  refutes: 0,
  isHighImpact: false,
  cluster: 0,
  status: "solid",
  abstract: "",
};

interface NodeTooltipProps {
  onExpand?: (
    nodeId: string,
    direction: "in" | "out",
    type?: "all" | "supports" | "contradicts",
  ) => void;
  onExpandByTopic?: (nodeId: string) => void;
  onFocus?: (nodeId: string) => void;
  onAddToProject?: (nodeId: string) => void;
  onViewDetails?: (nodeId: string) => void;
}

export function NodeTooltip({
  onExpand,
  onExpandByTopic,
  onFocus,
  onAddToProject,
  onViewDetails,
}: NodeTooltipProps) {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();
  const [tooltip, setTooltip] = useState<PaperTooltipState>(initialState);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEnterNode = useCallback(
    (event: { node: string }) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      const nodeData = sigma.getGraph().getNodeAttributes(event.node);
      setTooltip({
        visible: true,
        nodeId: event.node,
        label: nodeData.label || `Paper ${event.node}`,
        title: nodeData.title || nodeData.label || `Paper ${event.node}`,
        paperId: nodeData.paperId || `#${event.node}`,
        authors: nodeData.authors || "Unknown",
        year: nodeData.year || 2024,
        venue: nodeData.venue || "",
        citations: nodeData.citations || 0,
        supports: nodeData.supports || 0,
        refutes: nodeData.refutes || 0,
        isHighImpact: nodeData.isHighImpact || false,
        cluster: nodeData.cluster || 0,
        status: nodeData.status || "solid",
        abstract: nodeData.abstract || "",
      });
    },
    [sigma],
  );

  const handleLeaveNode = useCallback(() => {
    // ... existing ...
    hideTimeoutRef.current = setTimeout(() => {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }, 300);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }, 300);
  }, []);

  useEffect(() => {
    registerEvents({
      enterNode: handleEnterNode,
      leaveNode: handleLeaveNode,
    });
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [registerEvents, handleEnterNode, handleLeaveNode]);

  if (!tooltip.visible) return null;

  // Calculate stats for mini-chart
  const total = tooltip.supports + tooltip.refutes;
  const supportsPercent = total > 0 ? (tooltip.supports / total) * 100 : 50;

  return (
    <div className="pointer-events-none absolute top-4 right-4 z-10 w-80">
      {/* Card with fade-in animation */}
      <div
        className="bg-card/95 border-border animate-in fade-in slide-in-from-right-2 pointer-events-auto overflow-hidden rounded-lg border shadow-2xl backdrop-blur-md duration-200"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="border-border bg-muted/30 border-b p-4 pb-3">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex gap-2 text-[10px] font-bold tracking-wider uppercase">
              {tooltip.status === "ghost" && (
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary border-primary/20"
                >
                  Suggestion
                </Badge>
              )}
              {tooltip.isHighImpact && (
                <Badge
                  variant="destructive"
                  className="text-[10px] font-bold tracking-wider uppercase"
                >
                  High Impact
                </Badge>
              )}
            </div>
            <span className="text-muted-foreground ml-auto font-mono text-[10px]">
              {tooltip.paperId}
            </span>
          </div>
          <h3 className="text-foreground mb-1 line-clamp-2 text-sm leading-snug font-bold">
            {tooltip.title}
          </h3>
          <p className="text-muted-foreground text-xs font-medium">
            {tooltip.authors} ({tooltip.year})
          </p>
          {tooltip.venue && (
            <p className="text-muted-foreground/70 mt-0.5 truncate text-[10px] italic">
              {tooltip.venue}
            </p>
          )}
        </div>

        {/* Mini Chart Section */}
        <div className="bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-foreground text-xs font-medium">
              Relationship Overview
            </p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="bg-supports h-1.5 w-1.5 rounded-full" />
                <span className="text-muted-foreground text-[10px]">Pos</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="bg-contradicts h-1.5 w-1.5 rounded-full" />
                <span className="text-muted-foreground text-[10px]">Neg</span>
              </span>
            </div>
          </div>

          {/* Balance Bar */}
          <div className="bg-muted mb-3 h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-supports h-full transition-all duration-300"
              style={{ width: `${supportsPercent}%` }}
            />
          </div>

          {/* Stats Grid */}
          <div className="border-border flex gap-4 border-t pt-3">
            <div className="flex-1">
              <p className="text-muted-foreground mb-0.5 text-[10px] font-bold tracking-wider uppercase">
                Supports
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-supports font-mono text-lg font-bold">
                  {tooltip.supports}
                </span>
                {tooltip.supports > 0 && (
                  <span className="text-supports/60 flex items-center font-mono text-xs">
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                    {total > 0
                      ? Math.round((tooltip.supports / total) * 100)
                      : 0}
                    %
                  </span>
                )}
              </div>
            </div>
            <div className="bg-border w-px" />
            <div className="flex-1">
              <p className="text-muted-foreground mb-0.5 text-[10px] font-bold tracking-wider uppercase">
                Refutes
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-contradicts font-mono text-lg font-bold">
                  {tooltip.refutes}
                </span>
                {tooltip.refutes > 0 && (
                  <span className="text-contradicts/60 flex items-center font-mono text-xs">
                    <TrendingDown className="mr-0.5 h-3 w-3" />
                    {total > 0
                      ? Math.round((tooltip.refutes / total) * 100)
                      : 0}
                    %
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Abstract Snippet */}
        {tooltip.abstract && (
          <div className="border-border/50 border-t px-4 py-2">
            <p className="text-muted-foreground/80 line-clamp-2 text-[11px] leading-relaxed">
              {tooltip.abstract}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-muted/30 border-border flex items-center justify-between border-t px-4 py-2">
          <span className="text-muted-foreground font-mono text-[10px]">
            Cit: {tooltip.citations.toLocaleString()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails?.(tooltip.nodeId);
            }}
            className="text-foreground hover:text-primary flex items-center gap-1 text-xs font-medium transition-colors"
          >
            View Details
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Quick Expansion Actions */}
        {(onExpand || (onAddToProject && tooltip.status === "ghost")) && (
          <div className="bg-muted/50 border-border/50 flex items-center gap-2 border-t px-4 py-2">
            {onAddToProject && tooltip.status === "ghost" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToProject(tooltip.nodeId);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border-primary flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1 text-[10px] font-medium shadow-sm transition-colors"
              >
                Add to Project
              </button>
            )}

            {onFocus && tooltip.status === "solid" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus(tooltip.nodeId);
                }}
                className="bg-background hover:bg-primary/10 border-primary/20 text-primary flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-colors"
                title="Isolate this paper"
              >
                Focus
              </button>
            )}
            {tooltip.status === "solid" && onExpand && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpand(tooltip.nodeId, "out", "all");
                  }}
                  className="bg-background hover:bg-muted border-border flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors"
                  title="Show papers this paper cites"
                >
                  + Refs
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpand(tooltip.nodeId, "in", "all");
                  }}
                  className="bg-background hover:bg-muted border-border flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors"
                  title="Show papers citing this paper"
                >
                  + Cites
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExpand(tooltip.nodeId, "in", "contradicts");
                  }}
                  className="bg-background hover:bg-destructive/10 border-destructive/20 text-destructive flex flex-1 items-center justify-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors"
                  title="Show contradicting papers"
                >
                  + Critics
                </button>
                {onExpandByTopic && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandByTopic(tooltip.nodeId);
                    }}
                    className="bg-background flex flex-1 items-center justify-center gap-1 rounded border border-violet-500/20 px-2 py-1 text-[10px] text-violet-600 transition-colors hover:bg-violet-500/10 dark:text-violet-400"
                    title="Find papers in the same field"
                  >
                    + Related
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
