"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  Link2,
  SlidersHorizontal,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { FILTERS } from "@/lib/constants";

// Filter state interface
export interface FilterState {
  relationships: {
    supports: boolean;
    contradicts: boolean;
    extends: boolean;
    cites: boolean;
  };
  citationRange: [number, number];
  yearRange: [number, number];
}

interface GlobalFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  hiddenEdgeCount?: number;
  open: boolean;
  onToggle: () => void;
  /** Optional: actual max citations from data for dynamic range */
  maxCitations?: number;
  /** Optional: min year from actual data */
  minYear?: number;
  /** Optional: max year from actual data */
  maxYear?: number;
  /** Optional: callback to open advanced query builder modal */
  onOpenQueryBuilder?: () => void;
}

// Default filters using constants
export const DEFAULT_FILTERS: FilterState = {
  relationships: {
    supports: true,
    contradicts: true,
    extends: true,
    cites: true,
  },
  citationRange: [FILTERS.MIN_CITATIONS, FILTERS.DEFAULT_MAX_CITATIONS],
  yearRange: [FILTERS.MIN_YEAR, FILTERS.MAX_YEAR],
};

export function GlobalFilters({
  filters,
  onFiltersChange,
  hiddenEdgeCount = 0,
  open,
  onToggle,
  maxCitations = FILTERS.DEFAULT_MAX_CITATIONS,
  minYear = FILTERS.MIN_YEAR,
  maxYear = FILTERS.MAX_YEAR,
  onOpenQueryBuilder,
}: GlobalFiltersProps) {
  // Local slider state for instant visual feedback without re-rendering the graph
  const [localCitationRange, setLocalCitationRange] = useState(
    filters.citationRange,
  );
  const [localYearRange, setLocalYearRange] = useState(filters.yearRange);
  const citationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const yearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when external filters change (e.g. reset)
  useEffect(() => {
    setLocalCitationRange(filters.citationRange);
  }, [filters.citationRange]);
  useEffect(() => {
    setLocalYearRange(filters.yearRange);
  }, [filters.yearRange]);

  const handleRelationshipToggle = useCallback(
    (type: keyof FilterState["relationships"]) => {
      onFiltersChange({
        ...filters,
        relationships: {
          ...filters.relationships,
          [type]: !filters.relationships[type],
        },
      });
    },
    [filters, onFiltersChange],
  );

  // Debounced citation slider — local state updates instantly, context after 30ms pause
  const handleCitationChange = useCallback(
    (value: number[]) => {
      const range = [value[0], value[1]] as [number, number];
      setLocalCitationRange(range);
      if (citationTimerRef.current) clearTimeout(citationTimerRef.current);
      citationTimerRef.current = setTimeout(() => {
        onFiltersChange({
          ...filters,
          citationRange: range,
        });
      }, 30);
    },
    [filters, onFiltersChange],
  );

  // Commit on mouse release — always dispatch final value
  const handleCitationCommit = useCallback(
    (value: number[]) => {
      if (citationTimerRef.current) clearTimeout(citationTimerRef.current);
      const range = [value[0], value[1]] as [number, number];
      setLocalCitationRange(range);
      onFiltersChange({
        ...filters,
        citationRange: range,
      });
    },
    [filters, onFiltersChange],
  );

  // Debounced year slider
  const handleYearChange = useCallback(
    (value: number[]) => {
      const range = [value[0], value[1]] as [number, number];
      setLocalYearRange(range);
      if (yearTimerRef.current) clearTimeout(yearTimerRef.current);
      yearTimerRef.current = setTimeout(() => {
        onFiltersChange({
          ...filters,
          yearRange: range,
        });
      }, 30);
    },
    [filters, onFiltersChange],
  );

  // Commit on mouse release
  const handleYearCommit = useCallback(
    (value: number[]) => {
      if (yearTimerRef.current) clearTimeout(yearTimerRef.current);
      const range = [value[0], value[1]] as [number, number];
      setLocalYearRange(range);
      onFiltersChange({
        ...filters,
        yearRange: range,
      });
    },
    [filters, onFiltersChange],
  );

  const resetFilters = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  // Count active filters
  const activeFilterCount =
    (filters.relationships.supports ? 0 : 1) +
    (filters.relationships.contradicts ? 0 : 1) +
    (filters.relationships.extends ? 0 : 1) +
    (filters.relationships.cites ? 0 : 1) +
    (filters.citationRange[0] > FILTERS.MIN_CITATIONS ||
    filters.citationRange[1] < maxCitations
      ? 1
      : 0) +
    (filters.yearRange[0] > minYear || filters.yearRange[1] < maxYear ? 1 : 0);

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="h-7.5 px-2.5 rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-muted/40 dark:bg-zinc-900/40 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-foreground flex items-center gap-1.5 text-xs font-semibold shadow-2xs backdrop-blur-md transition-colors"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
            {activeFilterCount}
          </Badge>
        )}
      </button>
    );
  }

  return (
    <div className="bg-card/95 border-border animate-in slide-in-from-left-2 fade-in w-72 max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border shadow-2xl backdrop-blur duration-200">
      {/* Header */}
      <div className="border-border bg-muted/30 flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-sm font-bold">Global Filters</h3>
          <p className="text-muted-foreground text-xs">
            Configure graph visibility
          </p>
        </div>
        <button
          onClick={onToggle}
          className="hover:bg-muted rounded p-1 transition-colors"
        >
          <X className="text-muted-foreground h-4 w-4" />
        </button>
      </div>

      <div className="space-y-6 p-4">
        {/* Relationship Types */}
        <div>
          <h4 className="text-muted-foreground mb-3 text-[10px] font-bold tracking-wider uppercase">
            Relationship Types
          </h4>
          <div className="space-y-2">
            <FilterToggle
              icon={CheckCircle}
              label="Supports"
              color="text-supports"
              checked={filters.relationships.supports}
              onCheckedChange={() => handleRelationshipToggle("supports")}
            />
            <FilterToggle
              icon={XCircle}
              label="Refutes"
              color="text-contradicts"
              checked={filters.relationships.contradicts}
              onCheckedChange={() => handleRelationshipToggle("contradicts")}
            />
            <FilterToggle
              icon={ArrowRightCircle}
              label="Extends"
              color="text-extends"
              checked={filters.relationships.extends}
              onCheckedChange={() => handleRelationshipToggle("extends")}
            />
            <FilterToggle
              icon={Link2}
              label="Cites"
              color="text-muted-foreground"
              checked={filters.relationships.cites}
              onCheckedChange={() => handleRelationshipToggle("cites")}
            />
          </div>

          {/* Hidden edges indicator */}
          {hiddenEdgeCount > 0 && (
            <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
              <EyeOff className="h-3 w-3" />
              Hiding {hiddenEdgeCount} edges
            </p>
          )}
        </div>

        {/* Node Metrics */}
        <div>
          <h4 className="text-muted-foreground mb-3 text-[10px] font-bold tracking-wider uppercase">
            Node Metrics
          </h4>
          <div className="space-y-4">
            {/* Citation Count */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">Citation Count</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {localCitationRange[0]}–{localCitationRange[1]}
                </span>
              </div>
              <Slider
                value={[localCitationRange[0], localCitationRange[1]]}
                onValueChange={handleCitationChange}
                onValueCommit={handleCitationCommit}
                min={FILTERS.MIN_CITATIONS}
                max={maxCitations}
                step={10}
                className="w-full"
              />
            </div>

            {/* Publication Year */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">Publication Year</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {localYearRange[0]}–{localYearRange[1]}
                </span>
              </div>
              <Slider
                value={[localYearRange[0], localYearRange[1]]}
                onValueChange={handleYearChange}
                onValueCommit={handleYearCommit}
                min={minYear}
                max={maxYear}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-border bg-muted/10 flex flex-col gap-1.5 border-t p-2.5">
        {onOpenQueryBuilder && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenQueryBuilder}
            className="w-full justify-center gap-1.5 text-xs"
          >
            <SlidersHorizontal className="text-primary h-3.5 w-3.5" />
            Advanced Relational Rules...
          </Button>
        )}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-muted-foreground hover:text-foreground w-full text-xs"
          >
            Reset all filters
          </Button>
        )}
      </div>
    </div>
  );
}

// Filter Toggle Component
function FilterToggle({
  icon: Icon,
  label,
  color,
  checked,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-2 transition-all ${
        checked
          ? "bg-muted/50 border-border"
          : "bg-muted/20 border-transparent opacity-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${checked ? color : "text-muted-foreground"}`}
        />
        <span
          className={`text-sm font-medium ${checked ? "" : "text-muted-foreground"}`}
        >
          {label}
        </span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// Graph Legend Component
export function GraphLegend() {
  return (
    <div className="bg-card/90 border-border rounded-lg border p-3 shadow-lg backdrop-blur">
      <h4 className="text-muted-foreground mb-2 text-[10px] font-bold tracking-wider uppercase">
        Dialectic Edges
      </h4>
      <div className="space-y-1.5">
        <LegendItem color="bg-supports" label="Supports" dashed={false} />
        <LegendItem color="bg-contradicts" label="Refutes" dashed={true} />
        <LegendItem color="bg-extends" label="Extends" dashed={false} />
        <LegendItem color="bg-zinc-400" label="Cites" dashed={false} />
      </div>

      <div className="border-border my-2.5 border-t" />

      <h4 className="text-muted-foreground mb-2 text-[10px] font-bold tracking-wider uppercase">
        Node Metrics Scale
      </h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="border-muted-foreground/60 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-muted/40">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <span className="text-muted-foreground text-xs">
            Landmark Work (&gt;500 cites)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-muted-foreground/50 flex h-3.5 w-3.5 items-center justify-center rounded-full border bg-muted/30">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          </div>
          <span className="text-muted-foreground text-xs">
            Established Work (50–500 cites)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-muted-foreground/40 h-2.5 w-2.5 rounded-full border bg-muted/20" />
          <span className="text-muted-foreground text-xs">
            Specialized Work (&lt;50 cites)
          </span>
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <div className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.5)]">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
          </div>
          <span className="text-muted-foreground text-xs">
            Contested Core (≥3 Refutations)
          </span>
        </div>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-0.5 w-4 ${color} ${dashed ? "border-contradicts border-t-2 border-dashed bg-transparent" : ""}`}
      />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
