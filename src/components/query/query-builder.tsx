/**
 * Query Builder Interface
 *
 * Visual interface for constructing complex graph queries.
 * Allows users to filter papers by multiple criteria and build search queries.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Search, Filter, Save, Trash2, Play } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export type QueryOperator = "AND" | "OR" | "NOT";
export type QueryField =
  | "title"
  | "authors"
  | "abstract"
  | "year"
  | "citations"
  | "venue"
  | "keywords";
export type QueryComparator =
  "contains" | "equals" | "gt" | "lt" | "gte" | "lte" | "between";

export interface QueryCondition {
  id: string;
  field: QueryField;
  comparator: QueryComparator;
  value: string | number | [number, number];
  operator: QueryOperator;
}

export interface Query {
  id: string;
  name: string;
  conditions: QueryCondition[];
  createdAt: string;
}

interface QueryBuilderProps {
  onExecuteQuery: (conditions: QueryCondition[]) => void;
  onSaveQuery?: (query: Query) => void;
  savedQueries?: Query[];
}

// =============================================================================
// QUERY BUILDER COMPONENT
// =============================================================================

export function QueryBuilder({
  onExecuteQuery,
  onSaveQuery,
  savedQueries = [],
}: QueryBuilderProps) {
  const [conditions, setConditions] = useState<QueryCondition[]>([
    createEmptyCondition(),
  ]);
  const [queryName, setQueryName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Field configuration
  const fieldConfig: Record<
    QueryField,
    { label: string; comparators: QueryComparator[] }
  > = {
    title: {
      label: "Title",
      comparators: ["contains", "equals"],
    },
    authors: {
      label: "Authors",
      comparators: ["contains", "equals"],
    },
    abstract: {
      label: "Abstract",
      comparators: ["contains"],
    },
    year: {
      label: "Year",
      comparators: ["equals", "gt", "lt", "gte", "lte", "between"],
    },
    citations: {
      label: "Citations",
      comparators: ["gt", "lt", "gte", "lte", "between"],
    },
    venue: {
      label: "Venue",
      comparators: ["contains", "equals"],
    },
    keywords: {
      label: "Keywords",
      comparators: ["contains"],
    },
  };

  const comparatorLabels: Record<QueryComparator, string> = {
    contains: "contains",
    equals: "equals",
    gt: ">",
    lt: "<",
    gte: "≥",
    lte: "≤",
    between: "between",
  };

  function createEmptyCondition(): QueryCondition {
    return {
      id: `cond_${Date.now()}_${Math.random()}`,
      field: "title",
      comparator: "contains",
      value: "",
      operator: "AND",
    };
  }

  const addCondition = () => {
    setConditions([...conditions, createEmptyCondition()]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length === 1) return; // Keep at least one
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<QueryCondition>) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const executeQuery = () => {
    onExecuteQuery(conditions);
  };

  const saveQuery = () => {
    if (!queryName.trim()) return;

    const query: Query = {
      id: `query_${Date.now()}`,
      name: queryName,
      conditions: conditions,
      createdAt: new Date().toISOString(),
    };

    onSaveQuery?.(query);
    setQueryName("");
    setShowSaveDialog(false);
  };

  const loadQuery = (query: Query) => {
    setConditions(query.conditions);
  };

  const clearQuery = () => {
    setConditions([createEmptyCondition()]);
  };

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Filter className="h-5 w-5" />
          Query Builder
        </h2>

        <p className="text-muted-foreground mb-3 text-sm">
          Build complex queries to find specific papers
        </p>
      </div>

      {/* Query Conditions */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {conditions.map((condition, index) => (
          <div key={condition.id} className="space-y-2">
            {/* Operator (for 2nd condition onwards) */}
            {index > 0 && (
              <div className="flex items-center gap-2">
                <Select
                  value={condition.operator}
                  onValueChange={(value) =>
                    updateCondition(condition.id, {
                      operator: value as QueryOperator,
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                    <SelectItem value="NOT">NOT</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-border h-px flex-1" />
              </div>
            )}

            {/* Condition Row */}
            <div className="bg-card border-border flex items-start gap-2 rounded-lg border p-3">
              {/* Field */}
              <Select
                value={condition.field}
                onValueChange={(value) => {
                  const field = value as QueryField;
                  const comparators = fieldConfig[field].comparators;
                  updateCondition(condition.id, {
                    field,
                    comparator: comparators[0],
                    value: "",
                  });
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fieldConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Comparator */}
              <Select
                value={condition.comparator}
                onValueChange={(value) =>
                  updateCondition(condition.id, {
                    comparator: value as QueryComparator,
                  })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldConfig[condition.field].comparators.map((comp) => (
                    <SelectItem key={comp} value={comp}>
                      {comparatorLabels[comp]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value Input */}
              <div className="flex-1">
                {condition.comparator === "between" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="h-9"
                      value={
                        Array.isArray(condition.value) ? condition.value[0] : ""
                      }
                      onChange={(e) =>
                        updateCondition(condition.id, {
                          value: [
                            parseInt(e.target.value) || 0,
                            Array.isArray(condition.value)
                              ? condition.value[1]
                              : 0,
                          ],
                        })
                      }
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      className="h-9"
                      value={
                        Array.isArray(condition.value) ? condition.value[1] : ""
                      }
                      onChange={(e) =>
                        updateCondition(condition.id, {
                          value: [
                            Array.isArray(condition.value)
                              ? condition.value[0]
                              : 0,
                            parseInt(e.target.value) || 0,
                          ],
                        })
                      }
                    />
                  </div>
                ) : (
                  <Input
                    type={
                      ["year", "citations"].includes(condition.field)
                        ? "number"
                        : "text"
                    }
                    placeholder="Enter value..."
                    className="h-9"
                    value={String(condition.value)}
                    onChange={(e) =>
                      updateCondition(condition.id, { value: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Remove Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => removeCondition(condition.id)}
                disabled={conditions.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add Condition Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={addCondition}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Condition
        </Button>
      </div>

      {/* Actions */}
      <div className="border-border space-y-2 border-t p-4">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={executeQuery}>
            <Play className="mr-2 h-4 w-4" />
            Execute Query
          </Button>
          <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={clearQuery}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Saved Queries */}
        {savedQueries.length > 0 && (
          <div className="pt-2">
            <label className="text-muted-foreground mb-2 block text-xs font-medium">
              Saved Queries
            </label>
            <div className="flex flex-wrap gap-2">
              {savedQueries.map((query) => (
                <Badge
                  key={query.id}
                  variant="secondary"
                  className="hover:bg-primary/20 cursor-pointer"
                  onClick={() => loadQuery(query)}
                >
                  {query.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="bg-background/80 absolute inset-0 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border-border w-full max-w-sm space-y-4 rounded-lg border p-4">
            <h3 className="font-semibold">Save Query</h3>
            <Input
              placeholder="Query name..."
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveQuery()}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={saveQuery}
                disabled={!queryName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
