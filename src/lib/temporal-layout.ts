import type Graph from "graphology";

export type LayoutMode = "force" | "temporal";

/**
 * Place nodes on an x-axis by publication year while keeping a stable y jitter.
 * Physics should be disabled before calling this.
 */
export function applyTemporalLayout(
  graph: Graph,
  options: { minYear?: number; maxYear?: number; width?: number } = {},
): { placed: number; minYear: number; maxYear: number } {
  let minYear = options.minYear ?? Number.POSITIVE_INFINITY;
  let maxYear = options.maxYear ?? Number.NEGATIVE_INFINITY;

  graph.forEachNode((_node, attrs) => {
    if (attrs.hidden) return;
    const year = Number(attrs.year);
    if (!Number.isFinite(year)) return;
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);
  });

  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    return { placed: 0, minYear: 0, maxYear: 0 };
  }

  if (minYear === maxYear) {
    maxYear = minYear + 1;
  }

  const width = options.width ?? 1200;
  let placed = 0;

  graph.forEachNode((node, attrs) => {
    if (attrs.hidden) return;
    const year = Number(attrs.year);
    if (!Number.isFinite(year)) return;

    if (attrs.forceX === undefined) {
      graph.setNodeAttribute(node, "forceX", attrs.x ?? 0);
      graph.setNodeAttribute(node, "forceY", attrs.y ?? 0);
    }

    const t = (year - minYear) / (maxYear - minYear);
    const jitter =
      (typeof attrs.forceY === "number" ? attrs.forceY : Number(attrs.y) || 0) *
      0.15;
    graph.setNodeAttribute(node, "x", t * width - width / 2);
    graph.setNodeAttribute(node, "y", jitter + ((hash(node) % 100) - 50));
    placed += 1;
  });

  return { placed, minYear, maxYear };
}

/** Restore positions captured before a temporal layout. */
export function restoreForceLayout(graph: Graph): number {
  let restored = 0;
  graph.forEachNode((node, attrs) => {
    if (attrs.forceX === undefined || attrs.forceY === undefined) return;
    graph.setNodeAttribute(node, "x", attrs.forceX);
    graph.setNodeAttribute(node, "y", attrs.forceY);
    restored += 1;
  });
  return restored;
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}
