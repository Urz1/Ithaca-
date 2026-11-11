"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  Keyboard,
  Sparkles,
  BookOpen,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GraphLegend } from "@/components/filters/global-filters";

import { useCanvasStore, type DialecticCounts } from "@/stores/canvas-store";

// =============================================================================
// CANVAS FOOTER - Unified bottom-left zone component
// =============================================================================

interface CanvasFooterProps {
  // Graph stats
  nodeCount: number;
  edgeCount: number;
  status?: "live" | "loading" | "error";
  dialecticCounts?: DialecticCounts;

  // Actions
  onKeyboardHelpClick: () => void;
  onTutorialClick: () => void;
  onTutorialRestart?: () => void;
  hasSeenTutorial: boolean;
}

/**
 * Unified footer component for the canvas bottom-left zone.
 * Combines Legend, Status, and Help buttons in a collapsible layout.
 */
export function CanvasFooter({
  nodeCount,
  edgeCount,
  status = "live",
  dialecticCounts,
  onKeyboardHelpClick,
  onTutorialClick,
  onTutorialRestart,
  hasSeenTutorial,
}: CanvasFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const storeCounts = useCanvasStore((s) => s.dialecticCounts);
  const activeDialectic = dialecticCounts || storeCounts;

  return (
    <div className="flex flex-col gap-2">
      {/* Collapsible Legend - only shows when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <GraphLegend />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main footer bar */}
      <div
        data-testid="canvas-footer"
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          "bg-card/90 border-border border backdrop-blur-sm",
          "rounded-lg shadow-lg",
        )}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1",
            "text-muted-foreground text-xs",
            "hover:text-foreground hover:bg-muted/50",
            "rounded transition-colors",
          )}
          title={isExpanded ? "Hide legend" : "Show legend"}
        >
          <BookOpen className="h-3.5 w-3.5" />
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronUp className="h-3 w-3" />
          )}
        </button>

        {/* Separator */}
        <div className="bg-border h-4 w-px" />

        {/* Stats indicator */}
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <StatusDot status={status} />
          <span
            data-testid="canvas-node-count"
            className="hidden font-medium tabular-nums md:inline"
          >
            {nodeCount.toLocaleString()} nodes
          </span>
          <span className="text-muted-foreground/50 hidden md:inline">•</span>
          <span
            data-testid="canvas-edge-count"
            className="hidden font-medium tabular-nums md:inline"
          >
            {edgeCount.toLocaleString()} edges
          </span>
        </div>

        {/* Dialectic Distribution Metrics HUD */}
        {edgeCount > 0 && (
          <>
            <div className="bg-border h-4 w-px" />
            <div
              data-testid="canvas-dialectic-hud"
              className="flex items-center gap-2 text-xs"
              title={`Dialectic Breakdown: ${activeDialectic.supports} Supports, ${activeDialectic.contradicts} Refutes, ${activeDialectic.extends} Extends, ${activeDialectic.cites} Cites`}
            >
              <div
                className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400"
                title="Empirical Confirmations (Supports)"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="tabular-nums">{activeDialectic.supports}</span>
              </div>
              <div
                className="flex items-center gap-1 font-medium text-red-600 dark:text-red-400"
                title="Active Controversies / Refutations"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="tabular-nums">{activeDialectic.contradicts}</span>
              </div>
              <div
                className="flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400"
                title="Conceptual Extensions"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="tabular-nums">{activeDialectic.extends}</span>
              </div>
              <div className="hidden items-center gap-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase lg:flex">
                <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums">
                  {Math.round(
                    ((activeDialectic.supports +
                      activeDialectic.contradicts +
                      activeDialectic.extends) /
                      edgeCount) *
                      100,
                  )}
                  % dialectic
                </span>
              </div>
            </div>
          </>
        )}

        {/* Separator */}
        <div className="bg-border h-4 w-px" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Keyboard shortcuts */}
          <button
            onClick={onKeyboardHelpClick}
            className={cn(
              "flex h-7 w-7 items-center justify-center",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted/50 rounded transition-colors",
            )}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          {/* Tutorial */}
          <TutorialButton
            hasSeenTutorial={hasSeenTutorial}
            onClick={onTutorialClick}
            onRestart={onTutorialRestart}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatusDot({ status }: { status: "live" | "loading" | "error" }) {
  const colors = {
    live: "bg-emerald-500",
    loading: "bg-amber-500 animate-pulse",
    error: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("h-1.5 w-1.5 rounded-full", colors[status])} />
    </div>
  );
}

function TutorialButton({
  hasSeenTutorial,
  onClick,
  onRestart,
}: {
  hasSeenTutorial: boolean;
  onClick: () => void;
  onRestart?: () => void;
}) {
  const handleClick = () => {
    if (hasSeenTutorial && onRestart) {
      onRestart();
    }
    onClick();
  };

  if (!hasSeenTutorial) {
    // First time user - prominent button
    return (
      <motion.button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1",
          "bg-primary text-primary-foreground",
          "rounded-md shadow-sm",
          "text-xs font-medium",
          "hover:bg-primary/90 transition-colors",
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Tour
      </motion.button>
    );
  }

  // Returning user - subtle icon
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center",
        "text-muted-foreground hover:text-primary",
        "hover:bg-muted/50 rounded transition-colors",
      )}
      title="Restart tutorial"
    >
      <Sparkles className="h-4 w-4" />
    </button>
  );
}
