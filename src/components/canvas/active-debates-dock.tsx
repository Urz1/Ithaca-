"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Swords, ChevronDown, ChevronUp, Table, ArrowUpRight } from "lucide-react";
import type Graph from "graphology";
import type { Sigma } from "sigma";
import { cn } from "@/lib/utils";
import type { EdgeEvidence } from "@/components/canvas/edge-evidence-popover";
import { SIGNAL_SOURCE_LABELS } from "@/components/canvas/edge-evidence-popover";
import type { PaperNode } from "@/lib/api/graph-api";
import { formatDebateLabelWithYear, computeEpistemicSalience } from "@/lib/graph-export";
import { cleanClaimSnippet } from "@/lib/api/citation-cleaner";

export interface ActiveDebatesDockProps {
  graph: Graph | null;
  sigma: Sigma | null;
  onEdgeClick?: (
    edgeId: string,
    position: { x: number; y: number },
    evidence: EdgeEvidence,
  ) => void;
  onOpenDebateMatrix?: () => void;
  className?: string;
}

export interface ActiveDisputeItem {
  id: string;
  sourceId: string;
  targetId: string;
  citingTitle: string;
  citingAuthors: string;
  citingYear?: number;
  targetTitle: string;
  targetAuthors: string;
  targetYear?: number;
  snippet: string;
  confidence: number;
  signalSource?: string;
  contexts?: string[];
  directnessTier?: 1 | 2 | 3;
  salience?: number;
}

export function ActiveDebatesDock({
  graph,
  sigma,
  onEdgeClick,
  onOpenDebateMatrix,
  className,
}: ActiveDebatesDockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [graphVersion, setGraphVersion] = useState(0);

  useEffect(() => {
    if (!graph) return;
    const handleGraphChange = () => {
      setGraphVersion((v) => v + 1);
    };

    graph.on("edgeAdded", handleGraphChange);
    graph.on("edgeDropped", handleGraphChange);
    graph.on("edgeAttributesUpdated", handleGraphChange);
    graph.on("cleared", handleGraphChange);

    return () => {
      graph.removeListener("edgeAdded", handleGraphChange);
      graph.removeListener("edgeDropped", handleGraphChange);
      graph.removeListener("edgeAttributesUpdated", handleGraphChange);
      graph.removeListener("cleared", handleGraphChange);
    };
  }, [graph]);

  // Extract all active disputes from the graph
  const disputes: ActiveDisputeItem[] = useMemo(() => {
    if (!graph) return [];

    const items: ActiveDisputeItem[] = [];

    graph.forEachEdge((edge, attrs, source, target) => {
      if (attrs.hidden) return;
      const edgeType = attrs.edgeType || attrs.type;
      if (edgeType !== "contradicts") return;

      const sourceAttrs = (graph.getNodeAttributes(source) ||
        {}) as PaperNode & { hidden?: boolean };
      const targetAttrs = (graph.getNodeAttributes(target) ||
        {}) as PaperNode & { hidden?: boolean };
      if (sourceAttrs.hidden || targetAttrs.hidden) return;

      const citingTitle = String(
        sourceAttrs.title || sourceAttrs.label || source,
      );
      const targetTitle = String(
        targetAttrs.title || targetAttrs.label || target,
      );
      const confidence = Number(attrs.confidence ?? 90);

      let snippet = String(attrs.snippet || "");
      if (!snippet && Array.isArray(attrs.contexts) && attrs.contexts[0]) {
        snippet = String(attrs.contexts[0]);
      }
      if (!snippet) {
        snippet = "Empirical refutation / replication failure reported.";
      }

      const directnessTier = attrs.directnessTier as (1 | 2 | 3 | undefined);
      const citingCitations =
        (sourceAttrs as { citationCount?: number; citations?: number }).citationCount ||
        (sourceAttrs as { citationCount?: number; citations?: number }).citations ||
        0;
      const salience = computeEpistemicSalience(
        {
          citingTitle,
          targetTitle,
          confidence,
          snippet,
        },
        {
          citations: citingCitations,
          title: citingTitle,
          label: sourceAttrs.label,
        },
        {
          title: targetTitle,
          label: targetAttrs.label,
          authors: targetAttrs.authors,
        },
      );

      items.push({
        id: edge,
        sourceId: source,
        targetId: target,
        citingTitle,
        citingAuthors: sourceAttrs.authors || "Unknown Authors",
        citingYear: sourceAttrs.year,
        targetTitle,
        targetAuthors: targetAttrs.authors || "Unknown Authors",
        targetYear: targetAttrs.year,
        snippet: cleanClaimSnippet(snippet),
        confidence,
        signalSource: attrs.signalSource,
        contexts: attrs.contexts,
        directnessTier,
        salience,
      });
    });

    // Sort by epistemic salience descending (canonical direct refutations with high citations rank first)
    return items.sort(
      (a, b) => (b.salience ?? b.confidence) - (a.salience ?? a.confidence),
    );
  }, [graph, graphVersion]);

  if (disputes.length === 0) {
    return null;
  }

  const handleFlyToDispute = (dispute: ActiveDisputeItem) => {
    if (!sigma || !graph) return;

    try {
      const sourceDisplay = sigma.getNodeDisplayData(dispute.sourceId);
      const targetDisplay = sigma.getNodeDisplayData(dispute.targetId);

      if (sourceDisplay && targetDisplay) {
        const midX = (sourceDisplay.x + targetDisplay.x) / 2;
        const midY = (sourceDisplay.y + targetDisplay.y) / 2;

        // Smooth camera fly-to centering on the dispute
        sigma.getCamera().animate(
          {
            x: midX,
            y: midY,
            ratio: 0.35,
          },
          { duration: 600 },
        );

        // Convert graph coordinate to viewport screen position
        const sourceScreen = sigma.graphToViewport(sourceDisplay);
        const targetScreen = sigma.graphToViewport(targetDisplay);
        const screenX = (sourceScreen.x + targetScreen.x) / 2;
        const screenY = (sourceScreen.y + targetScreen.y) / 2;

        if (onEdgeClick) {
          const edgeAttrs = graph.getEdgeAttributes(dispute.id);
          const snippets: EdgeEvidence["snippets"] = [];

          if (dispute.contexts && dispute.contexts.length > 0) {
            for (const ctx of dispute.contexts) {
              snippets.push({
                text: ctx,
                source: "Semantic Scholar citation context",
                context: "Discussion" as const,
              });
            }
          }

          if (dispute.snippet) {
            snippets.push({
              text: dispute.snippet,
              source:
                SIGNAL_SOURCE_LABELS[dispute.signalSource || "default"]
                  ?.label || "AI classification",
            });
          }

          const evidence: EdgeEvidence = {
            id: dispute.id,
            edgeType: "contradicts",
            confidence: dispute.confidence,
            sourcePaper: {
              id: dispute.sourceId,
              title: dispute.citingTitle,
              authors: dispute.citingAuthors,
              year: dispute.citingYear || 2024,
            },
            targetPaper: {
              id: dispute.targetId,
              title: dispute.targetTitle,
              authors: dispute.targetAuthors,
              year: dispute.targetYear || 2024,
            },
            snippets,
            signalSource: dispute.signalSource as EdgeEvidence["signalSource"],
          };

          onEdgeClick(dispute.id, { x: screenX, y: screenY }, evidence);
        }
      }
    } catch (err) {
      console.warn("Failed to fly to dispute:", err);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto z-20 flex flex-col transition-all duration-300",
        "w-80 sm:w-96 rounded-xl border border-rose-500/30 bg-background/95 shadow-xl backdrop-blur-md dark:bg-zinc-950/90",
        className,
      )}
    >
      {/* Header Bar */}
      <div
        className={cn(
          "flex cursor-pointer items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-rose-500/5",
          isExpanded && "border-b border-rose-500/20",
        )}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
            <Swords className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wide uppercase text-rose-600 dark:text-rose-400">
              Active Debates
            </span>
            <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
              {disputes.length} {disputes.length === 1 ? "Clash" : "Clashes"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Expanded Disputes List */}
      {isExpanded && (
        <div className="flex max-h-72 flex-col overflow-y-auto divide-y divide-border/40 p-1.5">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              onClick={() => handleFlyToDispute(dispute)}
              className="group cursor-pointer rounded-lg p-2.5 transition-all hover:bg-rose-500/10"
              title="Click to zoom directly to this empirical clash"
            >
              {/* Paper Pair Header */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="text-xs font-semibold leading-tight text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400">
                  <span className="font-bold">
                    {formatDebateLabelWithYear(dispute.citingTitle, dispute.citingYear)}
                  </span>
                  <span className="mx-1.5 text-rose-500 font-normal">⚔️</span>
                  <span className="opacity-90">
                    {formatDebateLabelWithYear(dispute.targetTitle, dispute.targetYear)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {dispute.directnessTier === 1 && (
                    <span className="rounded bg-rose-500/20 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      Direct
                    </span>
                  )}
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    {dispute.confidence}%
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>

              {/* Grounded Quote Snippet */}
              <div className="mt-1 line-clamp-2 text-[11px] italic leading-normal text-muted-foreground group-hover:text-foreground/90">
                &ldquo;{dispute.snippet}&rdquo;
              </div>
            </div>
          ))}

          {/* Action Footer */}
          {onOpenDebateMatrix && (
            <div className="pt-2 pb-1 px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDebateMatrix();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/5 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/15 dark:text-rose-400"
              >
                <Table className="h-3 w-3" />
                <span>Open Full Debate Matrix</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
