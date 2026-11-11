"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MousePointer,
  X,
  Download,
  ZoomIn,
  GitCompare,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NodeSelectionToolProps {
  isActive: boolean;
  onToggle: () => void;
  selectedNodes: string[];
  onClearSelection: () => void;
  onRemoveNode: (nodeId: string) => void;
  onFocusSelection: () => void;
  onCompare: () => void;
  onExport: (format: "csv" | "bibtex") => void;
  nodeLabels?: Record<string, string>;
}

interface SelectionPanelProps {
  selectedNodes: string[];
  nodeLabels: Record<string, string>;
  onClearSelection: () => void;
  onRemoveNode: (nodeId: string) => void;
  onFocusSelection: () => void;
  onCompare: () => void;
  onExport: (format: "csv" | "bibtex") => void;
}

interface SelectionInstructionProps {
  isActive: boolean;
  selectedCount: number;
}

/**
 * NodeSelectionTool - Toggle button for selection mode (top-right)
 */
export function NodeSelectionTool({
  isActive,
  onToggle,
  selectedNodes,
}: Pick<
  NodeSelectionToolProps,
  "isActive" | "onToggle" | "selectedNodes" | "nodeLabels"
>) {
  return (
    <button
      onClick={onToggle}
      title={isActive ? "Exit Selection Mode" : "Select Nodes for Path & Dialectic Comparison"}
      className={`h-7.5 px-2.5 rounded-full border flex items-center gap-1.5 text-xs font-semibold shadow-2xs backdrop-blur-md transition-all ${
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "border-black/[0.06] dark:border-white/[0.08] bg-muted/40 dark:bg-zinc-900/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-foreground"
      }`}
    >
      <MousePointer className="h-3.5 w-3.5" />
      <span className="hidden 2xl:inline">
        {isActive ? "Selecting..." : "Select"}
      </span>
      {selectedNodes.length > 0 && (
        <Badge variant={isActive ? "secondary" : "default"} className="text-[10px] px-1 py-0 h-4">
          {selectedNodes.length}/2
        </Badge>
      )}
    </button>
  );
}

/**
 * NodeSlot - Renders a single Source or Target slot
 */
function NodeSlot({
  role,
  nodeId,
  label,
  onRemove,
}: {
  role: "Source" | "Target";
  nodeId: string | null;
  label: string | null;
  onRemove?: () => void;
}) {
  const isSource = role === "Source";

  if (!nodeId) {
    return (
      <div className="border-border/60 bg-muted/20 flex min-w-0 items-center gap-2 rounded-lg border border-dashed px-3 py-2">
        <div
          className={`h-3 w-3 rounded-full border-2 ${isSource ? "border-emerald-500/40" : "border-blue-500/40"}`}
        />
        <span className="text-muted-foreground text-xs">
          Click a node to set {role.toLowerCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 ${
        isSource
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-blue-500/40 bg-blue-500/5"
      }`}
    >
      <div
        className={`h-3 w-3 shrink-0 rounded-full ${isSource ? "bg-emerald-500" : "bg-blue-500"}`}
      />
      <div className="min-w-0 flex-1">
        <span
          className={`text-[10px] font-bold tracking-wider uppercase ${isSource ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`}
        >
          {role}
        </span>
        <p className="truncate text-xs font-medium">{label || nodeId}</p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-muted shrink-0 rounded p-0.5 transition-colors"
        >
          <X className="text-muted-foreground h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/**
 * SelectionPanel - Bottom bar with Source → Target slots and actions
 */
export function SelectionPanel({
  selectedNodes,
  nodeLabels,
  onClearSelection,
  onRemoveNode,
  onFocusSelection,
  onCompare,
  onExport,
}: SelectionPanelProps) {
  if (selectedNodes.length === 0) return null;

  const sourceId = selectedNodes[0] || null;
  const targetId = selectedNodes[1] || null;

  return (
    <div className="bg-card/95 border-border animate-in slide-in-from-bottom-4 fade-in w-[90vw] max-w-lg rounded-xl border p-4 shadow-2xl backdrop-blur md:w-auto md:min-w-96">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="text-primary h-4 w-4" />
          <h3 className="text-sm font-bold">Find Path</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClearSelection}
          title="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Source → Target slots */}
      <div className="mb-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <NodeSlot
            role="Source"
            nodeId={sourceId}
            label={sourceId ? nodeLabels[sourceId] || null : null}
            onRemove={sourceId ? () => onRemoveNode(sourceId) : undefined}
          />
        </div>
        <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <NodeSlot
            role="Target"
            nodeId={targetId}
            label={targetId ? nodeLabels[targetId] || null : null}
            onRemove={targetId ? () => onRemoveNode(targetId) : undefined}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          className="flex-1 gap-2"
          size="sm"
          onClick={onCompare}
          disabled={selectedNodes.length < 2}
        >
          <GitCompare className="h-3.5 w-3.5" />
          Find Path
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={onFocusSelection}
          title="Focus on selected nodes"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              title="Export selected"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport("csv")}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("bibtex")}>
              Export as BibTeX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/**
 * SelectionInstruction - Shows guidance when selection mode is active
 */
export function SelectionInstruction({
  isActive,
  selectedCount,
}: SelectionInstructionProps) {
  if (!isActive) return null;

  const message =
    selectedCount === 0
      ? "Click a node to set the source"
      : selectedCount === 1
        ? "Click another node to set the target"
        : "Ready to find path — or click a node to replace target";

  return (
    <div className="bg-primary text-primary-foreground animate-in fade-in rounded-full px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <MousePointer className="h-4 w-4" />
        <span>{message}</span>
      </div>
    </div>
  );
}
