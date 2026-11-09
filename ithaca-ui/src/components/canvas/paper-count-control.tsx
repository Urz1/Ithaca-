"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, RefreshCw } from "lucide-react";

interface PaperCountControlProps {
  count: number;
  onChange: (count: number) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  embedded?: boolean;
}

const PAPER_COUNT_OPTIONS = [5, 10, 25, 50, 100] as const;

/**
 * PaperCountControl - Allows user to select number of papers to display.
 * Supports standalone floating mode or embedded toolbar mode.
 */
export function PaperCountControl({
  count,
  onChange,
  onRefresh,
  isLoading = false,
  embedded = false,
}: PaperCountControlProps) {
  if (embedded) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <FileText className="text-muted-foreground h-3.5 w-3.5 ml-1" />
        <Select
          value={String(count)}
          onValueChange={(value) => onChange(Number(value))}
        >
          <SelectTrigger className="h-7 w-[80px] border-0 bg-transparent px-1 py-0 text-xs font-medium focus:ring-0">
            <SelectValue placeholder="Papers" />
          </SelectTrigger>
          <SelectContent align="start">
            {PAPER_COUNT_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} papers
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-6 w-6 rounded-md hover:bg-muted"
          title="Regenerate graph"
        >
          <RefreshCw
            className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="bg-card/90 border-border flex items-center gap-2 rounded-lg border px-3 py-1.5 shadow-lg backdrop-blur">
        <FileText className="text-muted-foreground h-4 w-4" />
        <Select
          value={String(count)}
          onValueChange={(value) => onChange(Number(value))}
        >
          <SelectTrigger className="h-7 w-24 border-0 bg-transparent p-0 text-xs focus:ring-0">
            <SelectValue placeholder="Papers" />
          </SelectTrigger>
          <SelectContent>
            {PAPER_COUNT_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} papers
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-6 w-6"
          title="Regenerate graph"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    </div>
  );
}
