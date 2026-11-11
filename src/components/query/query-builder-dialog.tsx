"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QueryBuilder, type QueryCondition, type Query } from "./query-builder";
import { useState } from "react";

interface QueryBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyConditions: (conditions: QueryCondition[]) => void;
}

export function QueryBuilderDialog({
  open,
  onOpenChange,
  onApplyConditions,
}: QueryBuilderDialogProps) {
  const [savedQueries, setSavedQueries] = useState<Query[]>([
    {
      id: "q_recent_high_impact",
      name: "Recent High Impact (Citations > 100, Year ≥ 2020)",
      createdAt: new Date().toISOString(),
      conditions: [
        {
          id: "c1",
          field: "citations",
          comparator: "gt",
          value: 100,
          operator: "AND",
        },
        {
          id: "c2",
          field: "year",
          comparator: "gte",
          value: 2020,
          operator: "AND",
        },
      ],
    },
  ]);

  const handleExecute = (conditions: QueryCondition[]) => {
    onApplyConditions(conditions);
    onOpenChange(false);
  };

  const handleSave = (query: Query) => {
    setSavedQueries((prev) => [query, ...prev]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b p-4 pb-3">
          <DialogTitle>Advanced Dialectic Query Builder</DialogTitle>
          <DialogDescription className="text-xs">
            Construct multi-condition relational rules to isolate specific
            nodes, claim authors, and citation patterns.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <QueryBuilder
            onExecuteQuery={handleExecute}
            onSaveQuery={handleSave}
            savedQueries={savedQueries}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
