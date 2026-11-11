"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCanvasActions, useCanvasRefs } from "@/contexts/canvas-context";
import type { EdgeEvidence } from "@/components/canvas/edge-evidence-popover";
import { SIGNAL_SOURCE_LABELS } from "@/components/canvas/edge-evidence-popover";

/**
 * Opens edge evidence when `?e2eEdge=<edgeId>` is present.
 * Used by Playwright to avoid brittle WebGL edge hit-testing.
 */
export function E2eEdgeOpener() {
  const searchParams = useSearchParams();
  const edgeId = searchParams.get("e2eEdge");
  const actions = useCanvasActions();
  const refs = useCanvasRefs();
  const opened = useRef(false);

  useEffect(() => {
    if (!edgeId || opened.current) return;

    let cancelled = false;
    let attempts = 0;

    const tryOpen = () => {
      if (cancelled || opened.current) return;

      const graph = refs.graphRef.current;
      if (!graph?.hasEdge(edgeId)) {
        attempts += 1;
        if (attempts < 120) {
          window.setTimeout(tryOpen, 50);
        }
        return;
      }

      opened.current = true;
      const attrs = graph.getEdgeAttributes(edgeId);
      const sourceId = graph.source(edgeId);
      const targetId = graph.target(edgeId);
      const sourceAttrs = graph.getNodeAttributes(sourceId);
      const targetAttrs = graph.getNodeAttributes(targetId);
      const type = (attrs.edgeType ||
        attrs.label ||
        "unknown") as EdgeEvidence["edgeType"];
      const signalSource = (attrs.signalSource || "default") as string;
      const contexts = attrs.contexts as string[] | undefined;
      const realSnippet = attrs.snippet as string | undefined;

      const snippets: EdgeEvidence["snippets"] = [];
      if (contexts?.length) {
        for (const ctx of contexts) {
          snippets.push({
            text: ctx,
            source: "Semantic Scholar — extracted from paper full text",
            context: "Discussion",
          });
        }
      }
      if (realSnippet) {
        snippets.push({
          text: realSnippet,
          source:
            SIGNAL_SOURCE_LABELS[signalSource]?.label || "AI classification",
        });
      }
      if (snippets.length === 0) {
        snippets.push({
          text: "No evidence data available for this citation relationship.",
          source: "Classification data unavailable",
        });
      }

      actions.showEdgeEvidence(
        {
          id: edgeId,
          edgeType: type,
          confidence: attrs.confidence || 0.5,
          sourcePaper: {
            id: sourceId,
            title: sourceAttrs.title || sourceAttrs.label || "Source Paper",
            authors: sourceAttrs.authors || "Unknown",
            year: sourceAttrs.year || 2024,
            openAccessUrl: sourceAttrs.openAccessUrl as string | undefined,
          },
          targetPaper: {
            id: targetId,
            title: targetAttrs.title || targetAttrs.label || "Target Paper",
            authors: targetAttrs.authors || "Unknown",
            year: targetAttrs.year || 2024,
            openAccessUrl: targetAttrs.openAccessUrl as string | undefined,
          },
          snippets,
          signalSource: signalSource as EdgeEvidence["signalSource"],
        },
        { x: 400, y: 300 },
      );
    };

    tryOpen();

    return () => {
      cancelled = true;
    };
  }, [actions, edgeId, refs]);

  return null;
}
