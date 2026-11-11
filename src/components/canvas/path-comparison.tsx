"use client";

import { useState, useMemo } from "react";
import {
  ContainedPanel,
  ContainedPanelContent,
} from "@/components/ui/contained-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitCompare,
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  Link2,
  X,
  Route,
  Zap,
  Handshake,
  Info,
} from "lucide-react";

import type { SemanticPath, PathMode } from "@/lib/graph-algorithms";

const EDGE_CONFIG = {
  supports: {
    icon: CheckCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  contradicts: {
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  extends: {
    icon: ArrowRightCircle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  cites: {
    icon: Link2,
    color: "text-zinc-500 dark:text-zinc-400",
    bg: "bg-zinc-500/10",
  },
};

const MODE_CONFIG: Record<
  PathMode,
  { label: string; icon: typeof Route; description: string }
> = {
  shortest: {
    label: "Shortest",
    icon: Route,
    description: "Most direct connection",
  },
  conflict: {
    label: "Conflict",
    icon: Zap,
    description: "Path through disputes",
  },
  consensus: {
    label: "Consensus",
    icon: Handshake,
    description: "Path through agreement",
  },
};

interface PathComparisonViewProps {
  isOpen: boolean;
  onClose: () => void;
  paths?: SemanticPath[];
  onModeChange?: (mode: PathMode) => void;
  currentMode?: PathMode;
}

/**
 * Renders a single path as a vertical node chain with edge badges.
 */
function PathChain({ path }: { path: SemanticPath }) {
  if (!path.nodes || path.nodes.length === 0) {
    return (
      <div className="text-muted-foreground py-6 text-center text-sm">
        No path found for this mode.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {path.nodes.map((node, idx) => {
        const edge = path.edges?.[idx];
        const EdgeIcon = edge ? EDGE_CONFIG[edge.type]?.icon : null;

        return (
          <div key={node.id}>
            {/* Node card */}
            <div className="bg-muted/50 border-border/50 rounded-lg border px-3 py-2.5">
              <h4 className="line-clamp-1 text-sm font-medium">{node.title}</h4>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {node.authors} · {node.year}
              </p>
            </div>

            {/* Edge connector */}
            {edge && (
              <div className="flex items-center justify-center py-1">
                <div className="bg-border h-3 w-px" />
                <div
                  className={`mx-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    EDGE_CONFIG[edge.type]?.bg || ""
                  } ${EDGE_CONFIG[edge.type]?.color || ""}`}
                >
                  {EdgeIcon && <EdgeIcon className="h-3 w-3" />}
                  <span className="capitalize">{edge.type}</span>
                  <span className="opacity-60">{edge.confidence}%</span>
                </div>
                <div className="bg-border h-3 w-px" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PathComparisonView({
  isOpen,
  onClose,
  paths = [],
  onModeChange,
  currentMode = "shortest",
}: PathComparisonViewProps) {
  // Group paths by mode
  const pathsByMode = useMemo(() => {
    const map: Record<PathMode, SemanticPath | null> = {
      shortest: null,
      conflict: null,
      consensus: null,
    };
    for (const p of paths) {
      if (p.id.includes("shortest")) map.shortest = p;
      else if (p.id.includes("conflict")) map.conflict = p;
      else if (p.id.includes("consensus")) map.consensus = p;
    }
    return map;
  }, [paths]);

  // Detect if all modes returned the same route (identical node sequence)
  const allPathsIdentical = useMemo(() => {
    const validPaths = [
      pathsByMode.shortest,
      pathsByMode.conflict,
      pathsByMode.consensus,
    ].filter((p): p is SemanticPath => p !== null && p.nodes.length > 0);
    if (validPaths.length < 2) return false;
    const ref = validPaths[0].nodes.map((n) => n.id).join(",");
    return validPaths.every((p) => p.nodes.map((n) => n.id).join(",") === ref);
  }, [pathsByMode]);

  const activePath = pathsByMode[currentMode];

  if (!isOpen) return null;

  return (
    <ContainedPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      side="bottom"
      className="h-[45%]"
      backdrop="light"
      resizable
    >
      <ContainedPanelContent className="flex h-full flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="bg-card flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <GitCompare className="text-primary h-4.5 w-4.5" />
            <h2 className="text-sm font-semibold">Path Comparison</h2>
            {activePath && (
              <Badge variant="secondary" className="text-[10px]">
                {activePath.nodes?.length || 0} hops
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode tabs */}
        <div className="bg-muted/30 flex border-b">
          {(["shortest", "conflict", "consensus"] as PathMode[]).map((mode) => {
            const config = MODE_CONFIG[mode];
            const Icon = config.icon;
            const modePath = pathsByMode[mode];
            const hasPath =
              modePath && modePath.nodes && modePath.nodes.length > 0;

            return (
              <button
                key={mode}
                onClick={() => onModeChange?.(mode)}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
                  currentMode === mode
                    ? "border-primary text-foreground bg-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
                {hasPath && (
                  <span className="text-muted-foreground text-[10px]">
                    ({modePath!.nodes.length})
                  </span>
                )}
                {!hasPath && (
                  <span className="text-muted-foreground/50 text-[10px]">
                    —
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {paths.length === 0 ? (
            <div className="py-12 text-center">
              <GitCompare className="text-muted-foreground/30 mx-auto mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                No paths found between the selected nodes.
              </p>
              <p className="text-muted-foreground/60 mt-1 text-xs">
                They may not be connected in this graph.
              </p>
            </div>
          ) : (
            <div>
              {/* Mode description */}
              {activePath && (
                <div className="mb-4 flex items-start gap-2">
                  <div
                    className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: activePath.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">{activePath.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {activePath.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Identical-path notice */}
              {allPathsIdentical && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Only one path exists between these nodes — all three modes
                    traverse the same route. Add more papers to create
                    alternative paths for meaningful comparison.
                  </p>
                </div>
              )}

              {/* Path chain */}
              {activePath ? (
                <PathChain path={activePath} />
              ) : (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No {currentMode} path found between these nodes.
                </div>
              )}

              {/* Quick stats comparing modes */}
              {paths.length > 1 && (
                <div className="mt-6 border-t pt-4">
                  <h4 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                    Mode Comparison
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {(["shortest", "conflict", "consensus"] as PathMode[]).map(
                      (mode) => {
                        const config = MODE_CONFIG[mode];
                        const p = pathsByMode[mode];
                        const hops = p?.nodes?.length ? p.nodes.length - 1 : 0;
                        const conflicts =
                          p?.edges?.filter((e) => e.type === "contradicts")
                            .length || 0;
                        const supports =
                          p?.edges?.filter((e) => e.type === "supports")
                            .length || 0;

                        return (
                          <div
                            key={mode}
                            className={`cursor-pointer rounded-lg border p-3 text-center transition-all ${
                              currentMode === mode
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/30"
                            }`}
                            onClick={() => onModeChange?.(mode)}
                          >
                            <p className="text-lg font-bold">{hops || "—"}</p>
                            <p className="text-muted-foreground text-[10px]">
                              {config.label}
                            </p>
                            {hops > 0 && (
                              <div className="mt-1 flex items-center justify-center gap-2">
                                {supports > 0 && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                    {supports}✓
                                  </span>
                                )}
                                {conflicts > 0 && (
                                  <span className="text-[10px] text-red-600 dark:text-red-400">
                                    {conflicts}✗
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ContainedPanelContent>
    </ContainedPanel>
  );
}
