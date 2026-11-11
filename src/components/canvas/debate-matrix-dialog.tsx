"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  FileText,
  Copy,
  Check,
  Download,
  Search,
  Swords,
  Sparkles,
} from "lucide-react";
import type Graph from "graphology";
import {
  generateDebateMatrix,
  generateDebateMatrixFromGraph,
  exportMatrixToMarkdown,
  exportMatrixToCSV,
  exportMatrixToLaTeX,
  type DebateMatrix,
} from "@/lib/debate-report";
import type { PaperNode, EdgeData } from "@/lib/api/graph-api";
import { useCanvasStore } from "@/stores/canvas-store";

interface DebateMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes?: PaperNode[];
  edges?: EdgeData[];
  graph?: Graph | null;
  topic?: string;
  onOpenSynthesizer?: () => void;
}

export function DebateMatrixDialog({
  open,
  onOpenChange,
  nodes,
  edges,
  graph,
  topic,
  onOpenSynthesizer,
}: DebateMatrixDialogProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const [stanceFilter, setStanceFilter] = useState<
    "all" | "contradicts" | "supports"
  >("all");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const showToastMessage = useCanvasStore((s) => s.showToastMessage);

  // Generate matrix
  const matrix: DebateMatrix = useMemo(() => {
    if (!open && !nodes && !edges) {
      return {
        title: "",
        rows: [],
        totalDisputes: 0,
        totalConfirmations: 0,
        generatedAt: "",
      };
    }
    const title = topic ? `Debate Matrix: ${topic}` : "Academic Debate Matrix";
    if (graph) {
      return generateDebateMatrixFromGraph(graph, { title, topic });
    }
    return generateDebateMatrix(nodes || [], edges || [], {
      title,
      topic,
    });
  }, [graph, nodes, edges, topic, open]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return matrix.rows.filter((row) => {
      if (stanceFilter !== "all" && row.edgeType !== stanceFilter) {
        return false;
      }
      if (!filterQuery.trim()) return true;

      const q = filterQuery.toLowerCase();
      return (
        row.citingPaper.toLowerCase().includes(q) ||
        row.targetPaper.toLowerCase().includes(q) ||
        (row.citingAuthors && row.citingAuthors.toLowerCase().includes(q)) ||
        (row.targetAuthors && row.targetAuthors.toLowerCase().includes(q)) ||
        row.coreClaimOrSnippet.toLowerCase().includes(q) ||
        row.methodologyOrContext.toLowerCase().includes(q)
      );
    });
  }, [matrix, filterQuery, stanceFilter]);

  const handleCopy = (type: "markdown" | "latex" | "csv") => {
    let content = "";
    if (type === "markdown") content = exportMatrixToMarkdown(matrix);
    if (type === "latex") content = exportMatrixToLaTeX(matrix);
    if (type === "csv") content = exportMatrixToCSV(matrix);

    navigator.clipboard.writeText(content);
    setCopiedType(type);
    showToastMessage(
      `Copied ${type === "latex" ? "LaTeX table" : type.toUpperCase()} to clipboard!`,
    );
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownload = (type: "csv" | "latex") => {
    const content =
      type === "csv" ? exportMatrixToCSV(matrix) : exportMatrixToLaTeX(matrix);
    const mime =
      type === "csv" ? "text/csv;charset=utf-8;" : "text/x-tex;charset=utf-8;";
    const ext = type === "csv" ? "csv" : "tex";
    const filename = `debate-matrix-${(topic || "export").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToastMessage(`Downloaded ${filename}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-border/80 border-b p-6 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Table className="h-5 w-5 text-indigo-500" />
                <span>Debate Matrix</span>
                <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {matrix.totalDisputes} Refutations •{" "}
                  {matrix.totalConfirmations} Confirmations
                </span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1 text-xs">
                Structured dialectic comparison grid of scientific refutations
                and empirical confirmations.
              </DialogDescription>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy("markdown")}
                className="h-8 gap-1.5 text-xs"
              >
                {copiedType === "markdown" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>Markdown</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy("latex")}
                className="h-8 gap-1.5 text-xs"
              >
                {copiedType === "latex" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                <span>LaTeX</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload("csv")}
                className="h-8 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>CSV</span>
              </Button>

              {onOpenSynthesizer && (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenSynthesizer();
                  }}
                  className="h-8 gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-xs text-white shadow-sm hover:from-indigo-700 hover:to-violet-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Synthesize Review</span>
                </Button>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
              <Input
                placeholder="Search claims, methods, paper titles..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="border-border bg-muted/30 flex items-center gap-1 rounded-lg border p-0.5">
              <button
                onClick={() => setStanceFilter("all")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  stanceFilter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({matrix.rows.length})
              </button>
              <button
                onClick={() => setStanceFilter("contradicts")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  stanceFilter === "contradicts"
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                }`}
              >
                <Swords className="h-3 w-3" />
                <span>Refutes ({matrix.totalDisputes})</span>
              </button>
              <button
                onClick={() => setStanceFilter("supports")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  stanceFilter === "supports"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                }`}
              >
                Confirms ({matrix.totalConfirmations})
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Matrix Table */}
        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {filteredRows.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
              <Table className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">
                No debate entries match your query
              </p>
              <p className="text-xs opacity-75">
                Try clearing your search or switching to "All" stances.
              </p>
            </div>
          ) : (
            <div className="border-border overflow-hidden rounded-lg border shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-muted/60 border-border text-muted-foreground border-b font-semibold">
                    <th className="w-[22%] px-3 py-2.5">Baseline Benchmark</th>
                    <th className="w-[22%] px-3 py-2.5">Challenging Work</th>
                    <th className="w-[12%] px-3 py-2.5 text-center">Stance</th>
                    <th className="w-[44%] px-3 py-2.5">
                      Core Empirical Finding / Context
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border/60 divide-y">
                  {filteredRows.map((row) => {
                    const isContradiction = row.edgeType === "contradicts";
                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-muted/40 transition-colors"
                      >
                        {/* Target Benchmark */}
                        <td className="px-3 py-3 align-top font-medium">
                          <div className="text-foreground line-clamp-2">
                            {row.targetPaper}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-[11px]">
                            {row.targetAuthors || "Unknown authors"}{" "}
                            {row.targetYear ? `(${row.targetYear})` : ""}
                          </div>
                        </td>

                        {/* Challenging Paper */}
                        <td className="px-3 py-3 align-top">
                          <div className="text-foreground line-clamp-2 font-medium">
                            {row.citingPaper}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-[11px]">
                            {row.citingAuthors || "Unknown authors"}{" "}
                            {row.citingYear ? `(${row.citingYear})` : ""}
                          </div>
                        </td>

                        {/* Stance Badge */}
                        <td className="px-3 py-3 text-center align-top">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isContradiction
                                ? "border border-red-200 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950/80 dark:text-red-300"
                                : "border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300"
                            }`}
                          >
                            {isContradiction ? "Refutes" : "Confirms"}
                          </span>
                          <div className="text-muted-foreground mt-1 text-[10px]">
                            {row.confidence}% conf.
                          </div>
                        </td>

                        {/* Core Claim & Context */}
                        <td className="px-3 py-3 align-top">
                          <div className="text-foreground leading-relaxed">
                            {row.coreClaimOrSnippet}
                          </div>
                          {row.methodologyOrContext &&
                            row.methodologyOrContext !==
                              row.coreClaimOrSnippet && (
                              <div className="bg-muted/50 border-border/50 text-muted-foreground mt-1.5 line-clamp-2 rounded-sm border p-1.5 text-[11px] italic">
                                Context: {row.methodologyOrContext}
                              </div>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
