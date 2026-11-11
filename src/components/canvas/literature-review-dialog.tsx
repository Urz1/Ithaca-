"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type Graph from "graphology";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  BookOpen,
  Swords,
  Compass,
  Copy,
  Check,
  Download,
  RefreshCw,
  AlertCircle,
  Table,
  FileText,
  HelpCircle,
  Loader2,
} from "lucide-react";
import type { PaperNode, EdgeData } from "@/lib/api/graph-api";
import type { SynthesizedReview } from "@/app/api/research/synthesize/route";
import { useCanvasStore } from "@/stores/canvas-store";

export interface SynthesizePaperInput {
  id: string;
  title: string;
  authors?: string;
  year?: number;
  abstract?: string;
  citations?: number;
}

export interface SynthesizeEdgeInput {
  id: string;
  source: string;
  target: string;
  edgeType: string;
  confidence?: number;
  snippet?: string;
  contexts?: string[];
}

export interface LiteratureReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes?: SynthesizePaperInput[] | PaperNode[];
  edges?: SynthesizeEdgeInput[] | EdgeData[];
  graph?: Graph | null;
  topic?: string;
  onOpenDebateMatrix?: () => void;
}

export function LiteratureReviewDialog({
  open,
  onOpenChange,
  nodes,
  edges,
  graph,
  topic,
  onOpenDebateMatrix,
}: LiteratureReviewDialogProps) {
  const [review, setReview] = useState<SynthesizedReview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("lineage");

  const showToastMessage = useCanvasStore((s) => s.showToastMessage);

  // Extract nodes from graphology Graph if nodes not passed directly
  const extractedNodes: SynthesizePaperInput[] = useMemo(() => {
    if (nodes && nodes.length > 0) return nodes.slice(0, 100);
    if (!graph) return [];

    const result: SynthesizePaperInput[] = [];
    graph.forEachNode((id, attrs) => {
      if (result.length >= 100) return;
      if (attrs.clusterNode || attrs.nodeType === "cluster") return;

      result.push({
        id,
        title: String(attrs.title || attrs.label || id),
        authors: attrs.authors ? String(attrs.authors) : undefined,
        year: typeof attrs.year === "number" ? attrs.year : undefined,
        abstract: attrs.abstract ? String(attrs.abstract) : undefined,
        citations:
          typeof attrs.citations === "number" ? attrs.citations : undefined,
      });
    });
    return result;
  }, [nodes, graph, open]);

  // Extract edges from graphology Graph if edges not passed directly
  const extractedEdges: SynthesizeEdgeInput[] = useMemo(() => {
    if (edges && edges.length > 0) return edges;
    if (!graph) return [];

    const result: SynthesizeEdgeInput[] = [];
    graph.forEachEdge((id, attrs, source, target) => {
      if (attrs.hidden) return;
      const edgeType = String(attrs.edgeType || "cites");

      result.push({
        id,
        source,
        target,
        edgeType,
        confidence:
          typeof attrs.confidence === "number" ? attrs.confidence : undefined,
        snippet: attrs.snippet ? String(attrs.snippet) : undefined,
        contexts: Array.isArray(attrs.contexts)
          ? (attrs.contexts as string[])
          : undefined,
      });
    });
    return result;
  }, [edges, graph, open]);

  // Synthesis fetcher
  const handleSynthesize = useCallback(async () => {
    if (extractedNodes.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/research/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || "Literature Synthesis",
          nodes: extractedNodes,
          edges: extractedEdges,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Synthesis failed with status ${response.status}`,
        );
      }

      const body = await response.json();
      if (!body.synthesis) {
        throw new Error("Invalid response format from synthesis service");
      }

      setReview(body.synthesis);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to synthesize literature review";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [extractedNodes, extractedEdges, topic]);

  // Auto-synthesize when modal opens and no review has been generated yet
  useEffect(() => {
    if (open && !review && !isLoading && !error && extractedNodes.length > 0) {
      handleSynthesize();
    }
  }, [open, review, isLoading, error, extractedNodes.length, handleSynthesize]);

  // Copy Markdown draft
  const handleCopyMarkdown = useCallback(() => {
    if (!review) return;
    navigator.clipboard.writeText(review.fullMarkdown);
    setCopied(true);
    showToastMessage("Copied literature review Markdown to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }, [review, showToastMessage]);

  // Download Markdown file
  const handleDownloadMarkdown = useCallback(() => {
    if (!review) return;
    const filename = `literature-review-${(review.topic || "draft")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.md`;

    const blob = new Blob([review.fullMarkdown], {
      type: "text/markdown;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToastMessage(`Downloaded ${filename}`);
  }, [review, showToastMessage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-border/80 border-b p-6 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span>Literature Review Synthesis</span>
                {review && (
                  <Badge
                    variant="outline"
                    className="ml-2 border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
                  >
                    {review.meta.paperCount} Papers • {review.meta.disputeCount}{" "}
                    Clashes
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1 text-xs">
                Automated 3-part literature synthesis: Foundational Lineage,
                Empirical Points of Friction, and Unresolved Horizons.
              </DialogDescription>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {review && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMarkdown}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>Copy Markdown</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadMarkdown}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download .md</span>
                  </Button>
                </>
              )}

              {onOpenDebateMatrix && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenDebateMatrix();
                  }}
                  className="h-8 gap-1.5 border-indigo-200 text-xs text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
                >
                  <Table className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Debate Matrix</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSynthesize}
                disabled={isLoading || extractedNodes.length === 0}
                className="h-8 gap-1.5 text-xs"
                title="Regenerate synthesis"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
                <span>Regenerate</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-hidden p-6">
          {/* 1. Loading State */}
          {isLoading && (
            <div className="flex h-72 flex-col items-center justify-center space-y-4 p-8 text-center">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 dark:border-violet-900" />
                <Sparkles className="absolute inset-0 m-auto h-5 w-5 animate-pulse text-violet-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-foreground text-sm font-semibold">
                  Synthesizing Literature Review...
                </h3>
                <p className="text-muted-foreground max-w-sm text-xs">
                  Analyzing {extractedNodes.length} papers, mapping empirical
                  contradictions, and deriving foundational paradigms.
                </p>
              </div>
              <div className="text-muted-foreground/80 mt-2 flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1">
                  <Compass className="h-3 w-3 text-indigo-500" /> Lineage
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Swords className="h-3 w-3 text-red-500" /> Frictions
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 text-amber-500" /> Horizons
                </span>
              </div>
            </div>
          )}

          {/* 2. Error State */}
          {!isLoading && error && (
            <div className="flex h-64 flex-col items-center justify-center space-y-3 p-6 text-center">
              <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">
                Synthesis Encountered an Error
              </h3>
              <p className="text-muted-foreground max-w-md text-xs">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSynthesize}
                className="mt-2 text-xs"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          )}

          {/* 3. Empty State (No Papers) */}
          {!isLoading && !error && extractedNodes.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center space-y-3 p-6 text-center">
              <div className="bg-muted text-muted-foreground rounded-full p-3">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-foreground text-sm font-semibold">
                No Papers on Canvas
              </h3>
              <p className="text-muted-foreground max-w-sm text-xs">
                Add or explore papers on the canvas first. The Synthesis Engine
                requires at least one paper to construct a literature review.
              </p>
            </div>
          )}

          {/* 4. Loaded State with Tabs */}
          {!isLoading && !error && review && (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex h-full flex-col gap-4"
            >
              <TabsList className="bg-muted/60 grid h-9.5 w-full grid-cols-4 p-1">
                <TabsTrigger
                  value="lineage"
                  className="gap-1.5 px-2 text-xs data-[state=active]:font-semibold"
                >
                  <Compass className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  <span className="truncate">
                    <span className="font-bold">1.</span> Lineage
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="frictions"
                  className="gap-1.5 px-2 text-xs data-[state=active]:font-semibold"
                >
                  <Swords className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span className="truncate">
                    <span className="font-bold">2.</span> Friction
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="horizons"
                  className="gap-1.5 px-2 text-xs data-[state=active]:font-semibold"
                >
                  <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="truncate">
                    <span className="font-bold">3.</span> Horizons
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="full"
                  className="gap-1.5 px-2 text-xs data-[state=active]:font-semibold"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="truncate">Full Synthesis</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Foundational Lineage */}
              <TabsContent
                value="lineage"
                className="mt-0 flex-1 overflow-hidden"
              >
                <ScrollArea className="h-[52vh] pr-3">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-foreground text-base font-bold">
                        {review.sections.foundationalLineage.title}
                      </h3>
                      <p className="text-foreground/90 mt-2 text-sm leading-relaxed whitespace-pre-line">
                        {review.sections.foundationalLineage.content}
                      </p>
                    </div>

                    {review.sections.foundationalLineage.keyPapers.length >
                      0 && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wider text-indigo-800 uppercase dark:text-indigo-300">
                          <BookOpen className="h-3.5 w-3.5" />
                          Key Foundational Works
                        </h4>
                        <ul className="space-y-2 text-xs">
                          {review.sections.foundationalLineage.keyPapers.map(
                            (paper, idx) => (
                              <li
                                key={idx}
                                className="text-foreground/85 flex items-start gap-2"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
                                <span className="leading-normal font-medium">
                                  {paper}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab 2: Points of Friction */}
              <TabsContent
                value="frictions"
                className="mt-0 flex-1 overflow-hidden"
              >
                <ScrollArea className="h-[52vh] pr-3">
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-foreground text-base font-bold">
                          {review.sections.empiricalFrictions.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
                        >
                          {review.sections.empiricalFrictions.disputesCount}{" "}
                          Disputes Identified
                        </Badge>
                      </div>
                      <p className="text-foreground/90 mt-2 text-sm leading-relaxed whitespace-pre-line">
                        {review.sections.empiricalFrictions.content}
                      </p>
                    </div>

                    {review.sections.empiricalFrictions.clashes.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-red-800 uppercase dark:text-red-300">
                          <Swords className="h-3.5 w-3.5 text-red-500" />
                          Documented Empirical Clashes
                        </h4>
                        <div className="grid gap-3">
                          {review.sections.empiricalFrictions.clashes.map(
                            (clash, idx) => (
                              <div
                                key={idx}
                                className="space-y-2 rounded-xl border border-red-200/80 bg-red-50/40 p-4 dark:border-red-900/40 dark:bg-red-950/20"
                              >
                                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-red-900 dark:text-red-200">
                                  <span
                                    className="text-foreground min-w-0 flex-1 truncate font-semibold"
                                    title={clash.citing}
                                  >
                                    {clash.citing}
                                  </span>
                                  <span className="shrink-0 whitespace-nowrap rounded bg-red-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-red-700 uppercase shadow-xs dark:bg-red-900/60 dark:text-red-300">
                                    CONTRADICTS
                                  </span>
                                  <span
                                    className="text-foreground min-w-0 flex-1 truncate text-right font-semibold"
                                    title={clash.target}
                                  >
                                    {clash.target}
                                  </span>
                                </div>
                                <div className="bg-background/80 border-border/60 text-muted-foreground rounded-lg border p-2.5 text-xs leading-relaxed italic">
                                  &ldquo;{clash.claim}&rdquo;
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab 3: Unresolved Horizons */}
              <TabsContent
                value="horizons"
                className="mt-0 flex-1 overflow-hidden"
              >
                <ScrollArea className="h-[52vh] pr-3">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-foreground text-base font-bold">
                        {review.sections.unresolvedHorizons.title}
                      </h3>
                      <p className="text-foreground/90 mt-2 text-sm leading-relaxed whitespace-pre-line">
                        {review.sections.unresolvedHorizons.content}
                      </p>
                    </div>

                    {review.sections.unresolvedHorizons.openQuestions.length >
                      0 && (
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-800 uppercase dark:text-amber-300">
                          <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
                          Critical Open Research Questions
                        </h4>
                        <div className="space-y-2.5">
                          {review.sections.unresolvedHorizons.openQuestions.map(
                            (question, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
                                  {idx + 1}
                                </span>
                                <p className="text-foreground/90 text-xs leading-relaxed font-medium">
                                  {question}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab 4: Full Markdown */}
              <TabsContent value="full" className="mt-0 flex-1 overflow-hidden">
                <ScrollArea className="h-[52vh] pr-3">
                  <pre className="bg-muted/70 text-foreground border-border rounded-xl border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {review.fullMarkdown}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
