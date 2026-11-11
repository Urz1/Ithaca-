"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCollectionExploreTarget,
  getGraphSnapshot,
} from "@/app/(app)/dashboard/actions";
import { useCanvasActions, useCanvasRefs } from "@/contexts/canvas-context";
import { debug } from "@/lib/debug";

interface ExploreUrlHydratorProps {
  onSearchPaper: (paperId: string) => Promise<void>;
}

async function waitForGraphApi(
  graphApiRef: { current: unknown },
  attempts = 240,
): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    if (graphApiRef.current) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

/**
 * Loads explore URL params into the canvas once the Sigma graph API is ready.
 * Supports ?graph= (frozen snapshot), ?collection=, and ?q=.
 */
export function ExploreUrlHydrator({ onSearchPaper }: ExploreUrlHydratorProps) {
  const searchParams = useSearchParams();
  const actions = useCanvasActions();
  const refs = useCanvasRefs();
  const hydratedKey = useRef<string | null>(null);

  useEffect(() => {
    const graphId = searchParams.get("graph");
    const collectionId = searchParams.get("collection");
    const query = searchParams.get("q");
    const key = graphId
      ? `graph:${graphId}`
      : collectionId
        ? `collection:${collectionId}`
        : query
          ? `q:${query}`
          : null;

    if (!key || hydratedKey.current === key) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      if (hydratedKey.current === key) return;

      const ready = await waitForGraphApi(refs.graphApiRef);
      if (!ready || cancelled) {
        debug.error("Explore URL hydration timed out waiting for graph API");
        actions.setLoading(false);
        return;
      }

      try {
        if (graphId) {
          actions.setLoading(true);
          const saved = await getGraphSnapshot(graphId);
          if (!saved) {
            actions.setLoading(false);
            return;
          }
          if (saved.snapshot) {
            hydratedKey.current = key;
            refs.graphApiRef.current?.addGraphData(
              saved.snapshot.nodes as never[],
              saved.snapshot.edges as never[],
              true,
            );
            if (saved.snapshot.nodes.length > 0) {
              actions.setVisiblePapers(saved.snapshot.nodes as never[]);
            }
            actions.setLoading(false);
            return;
          }
          // Older saves without a frozen payload: re-run the original query.
          if (saved.query) {
            hydratedKey.current = key;
            await onSearchPaper(
              saved.query.startsWith("topic-") ||
                /^W\d+/i.test(saved.query) ||
                saved.query.includes("/")
                ? saved.query
                : `topic-${saved.query}`,
            );
          } else {
            actions.setLoading(false);
          }
          return;
        }

        if (collectionId) {
          if (
            collectionId === "pilot-e2e-collection" ||
            process.env.NEXT_PUBLIC_E2E === "1"
          ) {
            actions.setLoading(true);
            const saved = await getGraphSnapshot("pilot-e2e-graph");
            if (!saved?.snapshot) {
              actions.setLoading(false);
              return;
            }
            hydratedKey.current = key;
            refs.graphApiRef.current?.addGraphData(
              saved.snapshot.nodes as never[],
              saved.snapshot.edges as never[],
              true,
            );
            if (saved.snapshot.nodes.length > 0) {
              actions.setVisiblePapers(saved.snapshot.nodes as never[]);
            }
            actions.setLoading(false);
            return;
          }

          const result = await getCollectionExploreTarget(collectionId);
          if (result?.target) {
            hydratedKey.current = key;
            await onSearchPaper(result.target);
          }
          return;
        }

        if (query) {
          hydratedKey.current = key;
          await onSearchPaper(query);
        }
      } catch (error) {
        debug.error("Explore URL hydration failed", error);
        actions.setLoading(false);
      }
    };

    void run();

    retryTimer = setTimeout(() => {
      if (!cancelled && hydratedKey.current !== key) {
        void run();
      }
    }, 2_000);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [searchParams, onSearchPaper, actions, refs]);

  return null;
}
