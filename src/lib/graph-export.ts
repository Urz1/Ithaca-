/**
 * Graph Export Utilities
 *
 * Export graph visualizations and data in multiple formats:
 * - PNG/SVG images for presentations (with legend, title, metadata)
 * - GraphML for network analysis tools
 * - JSON for data interchange
 *
 * All visual exports pass the "cold open test" - shareable with context
 */

import Graph from "graphology";
import type { Sigma } from "sigma";
import { debug } from "./debug";
import { jsPDF } from "jspdf";
import { applyHemisphericLayout } from "./perspective-layout";
import { cleanClaimSnippet } from "./api/citation-cleaner";

// =============================================================================
// TYPES
// =============================================================================

export type ExportFormat =
  "png" | "svg" | "graphml" | "json" | "csv" | "pdf" | "debate-md";

export interface ExportMetadata {
  title: string;
  description?: string;
  nodeCount: number;
  edgeCount: number;
  timestamp?: string;
  query?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHidden?: boolean;
  backgroundColor?: string;
  scale?: number; // For image exports (1 = actual size, 2 = 2x, etc.)
  metadata?: ExportMetadata;
  includeLegend?: boolean;
  includeHeader?: boolean;
  includeFooter?: boolean;
  quality?: "compressed" | "standard" | "print"; // affects DPI/size
  layoutMode?: "canvas" | "hemispheric";
}

// =============================================================================
// LEGEND CONFIGURATION
// =============================================================================

const LEGEND_CONFIG = {
  edgeTypes: [
    { color: "#22c55e", label: "Supports", dashed: false },
    { color: "#f43f5e", label: "Refutes (⚔️)", dashed: false },
    { color: "#3b82f6", label: "Extends", dashed: false },
    { color: "#a1a1aa", label: "Cites", dashed: false },
  ],
  nodeInfo: { label: "Paper Node" },
  contestedNodeInfo: { label: "Disputed Node (⚔️)" },
};

// =============================================================================
// BRANDING & STYLING
// =============================================================================

const BRAND = {
  name: "Ithaca",
  watermark: "ithaca.app",
  colors: {
    primary: "#8b5cf6",
    background: { light: "#F6F7F8", dark: "#0B0C10" },
    text: { light: "#1f2937", dark: "#f9fafb" },
    muted: { light: "#6b7280", dark: "#9ca3af" },
  },
};

// =============================================================================
// IMAGE EXPORT (PNG/SVG)
// =============================================================================

/**
 * Compute a coordinate mapper that normalizes graph node positions
 * into a target pixel area. This bypasses sigma.graphToViewport() which
 * depends on the live camera state and can produce NaN/out-of-bounds values.
 */
function createGraphMapper(
  graph: Graph,
  targetWidth: number,
  targetHeight: number,
  padding = 40,
  includeHidden = false,
): (gx: number, gy: number) => { x: number; y: number } {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  let count = 0;

  graph.forEachNode((_node, attrs) => {
    if (!includeHidden && attrs.hidden) return;
    const x = attrs.x ?? 0;
    const y = attrs.y ?? 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    count++;
  });

  // Fallback: if all nodes are at the same point, spread them
  if (count === 0 || (minX === maxX && minY === maxY)) {
    return () => ({ x: targetWidth / 2, y: targetHeight / 2 });
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const usableWidth = targetWidth - padding * 2;
  const usableHeight = targetHeight - padding * 2;

  // Preserve aspect ratio
  const scaleX = usableWidth / rangeX;
  const scaleY = usableHeight / rangeY;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padding + (usableWidth - rangeX * scale) / 2;
  const offsetY = padding + (usableHeight - rangeY * scale) / 2;

  return (gx: number, gy: number) => ({
    x: offsetX + (gx - minX) * scale,
    y: offsetY + (gy - minY) * scale,
  });
}

/**
 * Get scale factor based on quality setting
 */
function getScaleForQuality(quality: ExportOptions["quality"]): number {
  switch (quality) {
    case "compressed":
      return 1;
    case "print":
      return 3;
    default:
      return 2;
  }
}

/**
 * Safely check if dark mode is active (supports browser, SSR, and headless test runners)
 */
function isDarkTheme(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

/**
 * Safely trigger file download via anchor element if in browser environment
 */
function triggerDownload(url: string, filename: string): void {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (a.parentNode) {
        document.body.removeChild(a);
      }
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore cleanup errors
    }
  }, 2000);
}

/**
 * Draw the header section with title and context
 */
function drawHeader(
  ctx: CanvasRenderingContext2D,
  metadata: ExportMetadata,
  width: number,
  isDark: boolean,
  scale: number,
): number {
  const padding = 24 * scale;
  const headerHeight = 80 * scale;

  // Header background
  ctx.fillStyle = isDark ? "#111827" : "#ffffff";
  ctx.fillRect(0, 0, width, headerHeight);

  // Bottom border
  ctx.strokeStyle = isDark ? "#374151" : "#e5e7eb";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);
  ctx.stroke();

  // Title
  ctx.fillStyle = isDark ? BRAND.colors.text.dark : BRAND.colors.text.light;
  ctx.font = `bold ${18 * scale}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(metadata.title, padding, 36 * scale);

  // Description/context
  if (metadata.description || metadata.query) {
    ctx.fillStyle = isDark ? BRAND.colors.muted.dark : BRAND.colors.muted.light;
    ctx.font = `${12 * scale}px system-ui, -apple-system, sans-serif`;
    const contextText = metadata.query
      ? `Query: "${metadata.query}"`
      : metadata.description || "";
    ctx.fillText(contextText, padding, 58 * scale);
  }

  // Stats badge on the right
  ctx.fillStyle = isDark ? "#374151" : "#f3f4f6";
  const statsText = `${metadata.nodeCount} papers · ${metadata.edgeCount} citations`;
  ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;
  const statsWidth = ctx.measureText(statsText).width + 16 * scale;
  const statsX = width - padding - statsWidth;

  // Stats background pill
  ctx.beginPath();
  ctx.roundRect(statsX, 26 * scale, statsWidth, 24 * scale, 12 * scale);
  ctx.fill();

  // Stats text
  ctx.fillStyle = isDark ? BRAND.colors.muted.dark : BRAND.colors.muted.light;
  ctx.fillText(statsText, statsX + 8 * scale, 43 * scale);

  return headerHeight;
}

/**
 * Draw the legend section
 */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isDark: boolean,
  scale: number,
): { width: number; height: number } {
  const padding = 12 * scale;
  const itemHeight = 20 * scale;
  const legendWidth = 155 * scale;
  const legendHeight =
    (LEGEND_CONFIG.edgeTypes.length + 3) * itemHeight + padding * 2;

  // Legend background
  ctx.fillStyle = isDark
    ? "rgba(17, 24, 39, 0.95)"
    : "rgba(255, 255, 255, 0.95)";
  ctx.strokeStyle = isDark ? "#374151" : "#e5e7eb";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.roundRect(x, y, legendWidth, legendHeight, 8 * scale);
  ctx.fill();
  ctx.stroke();

  // Legend title
  ctx.fillStyle = isDark ? BRAND.colors.muted.dark : BRAND.colors.muted.light;
  ctx.font = `bold ${9 * scale}px system-ui, -apple-system, sans-serif`;
  ctx.fillText("LEGEND", x + padding, y + padding + 10 * scale);

  // Edge types
  let currentY = y + padding + 28 * scale;
  ctx.font = `${11 * scale}px system-ui, -apple-system, sans-serif`;

  LEGEND_CONFIG.edgeTypes.forEach((edge) => {
    // Line
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = edge.color === "#f43f5e" ? 3 * scale : 2 * scale;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x + padding, currentY);
    ctx.lineTo(x + padding + 14 * scale, currentY);
    ctx.stroke();

    // Arrowhead tip on legend line
    const tipX = x + padding + 20 * scale;
    ctx.fillStyle = edge.color;
    ctx.beginPath();
    ctx.moveTo(tipX, currentY);
    ctx.lineTo(tipX - 5 * scale, currentY - 3 * scale);
    ctx.lineTo(tipX - 5 * scale, currentY + 3 * scale);
    ctx.closePath();
    ctx.fill();

    // Label
    ctx.fillStyle = isDark ? BRAND.colors.text.dark : BRAND.colors.text.light;
    ctx.fillText(edge.label, x + padding + 28 * scale, currentY + 4 * scale);

    currentY += itemHeight;
  });

  // Standard Node indicator
  ctx.strokeStyle = isDark ? "#6b7280" : "#9ca3af";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(x + padding + 10 * scale, currentY, 5 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = isDark ? BRAND.colors.text.dark : BRAND.colors.text.light;
  ctx.fillText(
    LEGEND_CONFIG.nodeInfo.label,
    x + padding + 28 * scale,
    currentY + 4 * scale,
  );

  currentY += itemHeight;

  // Disputed Node indicator with aura
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(x + padding + 10 * scale, currentY, 5 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#f43f5e";
  ctx.fill();
  ctx.stroke();

  // Aura ring
  ctx.strokeStyle = "rgba(244, 63, 94, 0.45)";
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(x + padding + 10 * scale, currentY, 8 * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = isDark ? BRAND.colors.text.dark : BRAND.colors.text.light;
  ctx.fillText(
    LEGEND_CONFIG.contestedNodeInfo.label,
    x + padding + 28 * scale,
    currentY + 4 * scale,
  );

  return { width: legendWidth, height: legendHeight };
}

/**
 * Draw the footer section with timestamp and watermark
 */
function drawFooter(
  ctx: CanvasRenderingContext2D,
  metadata: ExportMetadata,
  width: number,
  canvasHeight: number,
  isDark: boolean,
  scale: number,
): number {
  const footerHeight = 40 * scale;
  const padding = 24 * scale;
  const footerY = canvasHeight - footerHeight;

  // Footer background
  ctx.fillStyle = isDark ? "#111827" : "#ffffff";
  ctx.fillRect(0, footerY, width, footerHeight);

  // Top border
  ctx.strokeStyle = isDark ? "#374151" : "#e5e7eb";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  // Timestamp on left
  ctx.fillStyle = isDark ? BRAND.colors.muted.dark : BRAND.colors.muted.light;
  ctx.font = `${10 * scale}px system-ui, -apple-system, sans-serif`;
  const timestamp = metadata.timestamp || new Date().toISOString();
  const formattedDate = new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  ctx.fillText(`Exported: ${formattedDate}`, padding, footerY + 25 * scale);

  // Watermark on right
  ctx.fillStyle = BRAND.colors.primary;
  ctx.font = `bold ${11 * scale}px system-ui, -apple-system, sans-serif`;
  const watermarkText = BRAND.watermark;
  const watermarkWidth = ctx.measureText(watermarkText).width;
  ctx.fillText(
    watermarkText,
    width - padding - watermarkWidth,
    footerY + 25 * scale,
  );

  return footerHeight;
}

/**
 * Draw directional arrow with offset from target node perimeter
 */
export function drawDirectionalArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  targetRadius: number,
  color: string,
  lineWidth: number,
  isContradiction: boolean,
  scale: number = 1,
  isTargetControversial: boolean = false,
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-3) return;

  const ux = dx / dist;
  const uy = dy / dist;

  // Offset endpoint so the arrowhead touches the target node perimeter cleanly,
  // accounting for the outer luminous aura ring (radius + 8) if controversial.
  const haloBuffer = isTargetControversial ? 10.5 : 2.5;
  const offset = targetRadius + haloBuffer;
  const endX = toX - ux * offset;
  const endY = toY - uy * offset;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  if (isContradiction) {
    // Solid neon crimson with luminous halo
    ctx.shadowColor = "rgba(244, 63, 94, 0.75)";
    ctx.shadowBlur = 8;
    ctx.setLineDash([]);
  } else {
    ctx.setLineDash([]);
  }

  // Draw main line segment
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Arrowhead geometry: flared dynamically relative to stroke width
  const arrowWidth = isContradiction
    ? Math.max(14, lineWidth * 3.0)
    : Math.max(7.5, lineWidth * 2.2);
  const arrowLength = isContradiction
    ? Math.max(16, lineWidth * 3.4)
    : Math.max(9.5, lineWidth * 2.5);

  const baseX = endX - ux * arrowLength;
  const baseY = endY - uy * arrowLength;

  const nx = -uy;
  const ny = ux;

  const p1X = baseX + nx * (arrowWidth / 2);
  const p1Y = baseY + ny * (arrowWidth / 2);
  const p2X = baseX - nx * (arrowWidth / 2);
  const p2Y = baseY - ny * (arrowWidth / 2);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(p1X, p1Y);
  ctx.lineTo(p2X, p2Y);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export interface DebateCalloutItem {
  id: string;
  citingTitle: string;
  citingYear?: number;
  targetTitle: string;
  targetYear?: number;
  snippet: string;
  confidence: number;
  salience?: number;
}

/**
 * Compute epistemic salience for ranking dialectic clashes:
 * Salience = Confidence * (1 + DirectnessBonus) * log10(Citations + 10)
 */
export function computeEpistemicSalience(
  clashOrConfidence:
    | {
        citingTitle: string;
        targetTitle: string;
        confidence: number;
        snippet?: string;
      }
    | number,
  sourceAttrsOrTier?:
    | {
        citations?: number;
        title?: string;
        label?: string;
      }
    | (1 | 2 | 3),
  targetAttrsOrCitations?:
    | {
        title?: string;
        label?: string;
        authors?: string;
      }
    | number,
): number {
  if (typeof clashOrConfidence === "number") {
    const confidence = clashOrConfidence;
    const tier = typeof sourceAttrsOrTier === "number" ? sourceAttrsOrTier : undefined;
    const citations = typeof targetAttrsOrCitations === "number" ? targetAttrsOrCitations : 0;
    const directnessBonus = tier === 1 ? 1.0 : tier === 2 ? 0.5 : 0.0;
    const impactMultiplier = Math.log10(Math.max(0, citations) + 10);
    return confidence * (1 + directnessBonus) * impactMultiplier;
  }

  const clash = clashOrConfidence;
  const sourceAttrs = typeof sourceAttrsOrTier === "object" ? sourceAttrsOrTier : undefined;
  const targetAttrs = typeof targetAttrsOrCitations === "object" ? targetAttrsOrCitations : undefined;

  const citingTitle = (sourceAttrs?.title || clash.citingTitle || "").toLowerCase();
  const targetLabel = (targetAttrs?.label || targetAttrs?.title || clash.targetTitle || "").toLowerCase();
  const surnameMatch = targetLabel.match(/^[a-z\-]+/i);
  const targetSurname = surnameMatch ? surnameMatch[0].toLowerCase() : "";

  let directnessBonus = 0;
  if (
    citingTitle.includes("comment on") ||
    citingTitle.includes("rebuttal to") ||
    citingTitle.includes("reply to") ||
    citingTitle.includes("response to") ||
    citingTitle.includes("failure to replicate") ||
    citingTitle.includes("failures to replicate") ||
    citingTitle.includes("failed to replicate") ||
    citingTitle.includes("attempts to replicate") ||
    (targetSurname.length >= 3 && citingTitle.includes(targetSurname))
  ) {
    directnessBonus = 1.0;
  } else if (
    clash.snippet &&
    targetSurname.length >= 3 &&
    clash.snippet.toLowerCase().includes(targetSurname)
  ) {
    directnessBonus = 0.5;
  }

  const citations = Number(sourceAttrs?.citations ?? 0);
  const impactMultiplier = Math.log10(Math.max(0, citations) + 10);

  return clash.confidence * (1 + directnessBonus) * impactMultiplier;
}

function cleanPaperTitle(title: string): string {
  if (title.length > 34) {
    return title.slice(0, 32).trim() + "…";
  }
  return title;
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let len = text.length;
  while (len > 3 && ctx.measureText(text.slice(0, len) + "…").width > maxWidth) {
    len -= 2;
  }
  return text.slice(0, len) + "…";
}

/**
 * Extract top dialectic clashes from the graph for the debate callout card
 */
export function getTopDebateClashes(
  graph: Graph,
  limit = 3,
  includeHidden = false,
): DebateCalloutItem[] {
  const clashes: DebateCalloutItem[] = [];

  graph.forEachEdge((edge, attrs, source, target) => {
    if (!includeHidden && attrs.hidden) return;
    const edgeType = attrs.edgeType || attrs.type;
    if (edgeType !== "contradicts") return;

    const sourceAttrs = graph.getNodeAttributes(source);
    const targetAttrs = graph.getNodeAttributes(target);
    if (!includeHidden && (sourceAttrs.hidden || targetAttrs.hidden)) return;

    const citingTitle = String(sourceAttrs.label || sourceAttrs.title || source);
    const targetTitle = String(targetAttrs.label || targetAttrs.title || target);
    const confidence = Number(attrs.confidence ?? 90);

    let snippet = String(attrs.snippet || "");
    if (!snippet && Array.isArray(attrs.contexts) && attrs.contexts[0]) {
      snippet = String(attrs.contexts[0]);
    }
    if (!snippet) {
      snippet = "Contradicting empirical claims";
    }

    const salience = computeEpistemicSalience(
      { citingTitle, targetTitle, confidence, snippet },
      sourceAttrs,
      targetAttrs,
    );

    clashes.push({
      id: edge,
      citingTitle: cleanPaperTitle(citingTitle),
      citingYear: sourceAttrs.year,
      targetTitle: cleanPaperTitle(targetTitle),
      targetYear: targetAttrs.year,
      snippet: cleanClaimSnippet(snippet),
      confidence,
      salience,
    });
  });

  // Sort by epistemic salience descending (highest impact direct rebuttals first)
  clashes.sort((a, b) => (b.salience ?? b.confidence) - (a.salience ?? a.confidence));
  return clashes.slice(0, limit);
}

/**
 * Format paper title with year, avoiding duplicate year if already present in label
 */
export function formatDebateLabelWithYear(title: string, year?: number): string {
  if (!year) return title;
  if (title.includes(String(year))) return title;
  return `${title} (${year})`;
}

/**
 * Draw the embedded Dialectic Debate Callout Card (passing the Cold Open Test)
 */
export function drawDebateCalloutCard(
  ctx: CanvasRenderingContext2D,
  clashes: DebateCalloutItem[],
  x: number,
  y: number,
  width: number,
  isDark: boolean,
  scale: number,
): { width: number; height: number } {
  if (clashes.length === 0) return { width: 0, height: 0 };

  const padding = 14 * scale;
  const headerHeight = 24 * scale;
  const rowHeight = 44 * scale;
  const cardHeight = headerHeight + clashes.length * rowHeight + padding * 2;

  ctx.save();
  // Glassmorphic background with crimson accent border
  ctx.fillStyle = isDark
    ? "rgba(17, 24, 39, 0.94)"
    : "rgba(255, 255, 255, 0.96)";
  ctx.strokeStyle = "#f43f5e";
  ctx.lineWidth = 1.5 * scale;
  ctx.shadowColor = "rgba(244, 63, 94, 0.35)";
  ctx.shadowBlur = 12 * scale;
  ctx.beginPath();
  ctx.roundRect(x, y, width, cardHeight, 10 * scale);
  ctx.fill();
  ctx.stroke();

  // Reset shadow for crisp text
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  // Header Title
  ctx.fillStyle = "#f43f5e";
  ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(
    `⚔️ EMPIRICAL CONTROVERSIES (${clashes.length} Active Clashes)`,
    x + padding,
    y + padding,
  );

  let curY = y + padding + headerHeight;
  clashes.forEach((clash, idx) => {
    // Divider line between items
    if (idx > 0) {
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(x + padding, curY - 6 * scale);
      ctx.lineTo(x + width - padding, curY - 6 * scale);
      ctx.stroke();
    }

    // Clash pair title
    ctx.fillStyle = isDark ? "#f9fafb" : "#111827";
    ctx.font = `bold ${10 * scale}px system-ui, -apple-system, sans-serif`;
    const citingStr = formatDebateLabelWithYear(clash.citingTitle, clash.citingYear);
    const targetStr = formatDebateLabelWithYear(clash.targetTitle, clash.targetYear);
    const pairText = `${citingStr} ⚔️ ${targetStr}`;
    const truncatedPair = truncateText(
      ctx,
      pairText,
      width - padding * 2 - 45 * scale,
    );
    ctx.fillText(truncatedPair, x + padding, curY);

    // Confidence badge
    ctx.fillStyle = "#f43f5e";
    ctx.font = `bold ${9 * scale}px system-ui, -apple-system, sans-serif`;
    const confText = `${clash.confidence}%`;
    const confWidth = ctx.measureText(confText).width;
    ctx.fillText(confText, x + width - padding - confWidth, curY);

    // Snippet quote
    ctx.fillStyle = isDark ? "#9ca3af" : "#4b5563";
    ctx.font = `italic ${9 * scale}px system-ui, -apple-system, sans-serif`;
    const quoteText = `“${clash.snippet}”`;
    const truncatedQuote = truncateText(ctx, quoteText, width - padding * 2);
    ctx.fillText(truncatedQuote, x + padding, curY + 14 * scale);

    curY += rowHeight;
  });

  ctx.restore();
  return { width, height: cardHeight };
}

/**
 * High-fidelity Canvas renderer shared by both PNG and PDF exports.
 * Renders stratified edges, directional arrowheads, contested node halos,
 * legend, debate callout card, header, and footer.
 */
export function renderGraphToExportCanvas(
  graph: Graph,
  sigma: Sigma | null,
  options: {
    exportWidth: number;
    exportHeight: number;
    graphWidth: number;
    graphHeight: number;
    headerHeight: number;
    footerHeight: number;
    scale: number;
    isDark: boolean;
    metadata: ExportMetadata;
    includeHeader: boolean;
    includeLegend: boolean;
    includeFooter: boolean;
    includeHidden: boolean;
    layoutMode?: "canvas" | "hemispheric";
  },
): HTMLCanvasElement {
  const {
    exportWidth,
    exportHeight,
    graphWidth,
    graphHeight,
    headerHeight,
    footerHeight,
    scale,
    isDark,
    metadata,
    includeHeader,
    includeLegend,
    includeFooter,
    includeHidden,
    layoutMode = "canvas",
  } = options;

  const graphData = graph.copy();
  if (layoutMode === "hemispheric") {
    applyHemisphericLayout(graphData);
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;

  const ctx = exportCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  const bgColor = isDark
    ? BRAND.colors.background.dark
    : BRAND.colors.background.light;

  // 1. Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, exportWidth, exportHeight);

  // 2. Draw header
  if (includeHeader) {
    drawHeader(ctx, metadata, exportWidth, isDark, scale);
  }

  // 3. Draw graph content in scaled coordinates
  ctx.save();
  ctx.translate(0, headerHeight);
  ctx.scale(scale, scale);

  const mapCoord = createGraphMapper(
    graphData,
    graphWidth,
    graphHeight,
    48,
    includeHidden,
  );

  // Stratify edges into 3 passes
  interface EdgeRenderItem {
    edge: string;
    source: string;
    target: string;
    sv: { x: number; y: number };
    tv: { x: number; y: number };
    targetRadius: number;
    edgeType: string;
    color: string;
    size: number;
    isTargetControversial: boolean;
  }

  const backgroundEdges: EdgeRenderItem[] = [];
  const lineageEdges: EdgeRenderItem[] = [];
  const contradictionEdges: EdgeRenderItem[] = [];

  graphData.forEachEdge((edge, attributes, source, target) => {
    if (!includeHidden && attributes.hidden) return;

    const sourceAttrs = graphData.getNodeAttributes(source);
    const targetAttrs = graphData.getNodeAttributes(target);
    if (!includeHidden && (sourceAttrs.hidden || targetAttrs.hidden)) return;

    const targetControversyScore = targetAttrs.controversyScore || 0;
    const isTargetControversial = targetControversyScore >= 1;

    const sv = mapCoord(sourceAttrs.x ?? 0, sourceAttrs.y ?? 0);
    const tv = mapCoord(targetAttrs.x ?? 0, targetAttrs.y ?? 0);
    const edgeType = attributes.edgeType || attributes.type || "cites";
    const targetRadius = targetAttrs.size || 5;

    let edgeColor = attributes.color;
    if (edgeType === "supports") {
      edgeColor = "#22c55e";
    } else if (edgeType === "contradicts") {
      edgeColor = "#f43f5e"; // Bright neon rose/crimson for refutations
    } else if (edgeType === "extends") {
      edgeColor = "#3b82f6";
    } else {
      edgeColor = isDark ? "#6b7280" : "#9ca3af";
    }

    const item: EdgeRenderItem = {
      edge,
      source,
      target,
      sv,
      tv,
      targetRadius,
      edgeType,
      color: edgeColor,
      size: attributes.size || 1,
      isTargetControversial,
    };

    if (edgeType === "contradicts") {
      contradictionEdges.push(item);
    } else if (edgeType === "supports" || edgeType === "extends") {
      lineageEdges.push(item);
    } else {
      backgroundEdges.push(item);
    }
  });

  // Pass 1: Background neutral citations (subdued hairline, 25% opacity)
  backgroundEdges.forEach((item) => {
    ctx.save();
    ctx.globalAlpha = isDark ? 0.22 : 0.30;
    drawDirectionalArrow(
      ctx,
      item.sv.x,
      item.sv.y,
      item.tv.x,
      item.tv.y,
      item.targetRadius,
      item.color,
      Math.max(0.7, item.size * 0.9),
      false,
      scale,
      item.isTargetControversial,
    );
    ctx.restore();
  });

  // Pass 2: Lineage progression edges (supports, extends - 88% opacity, crisp 2.2px)
  lineageEdges.forEach((item) => {
    ctx.save();
    ctx.globalAlpha = 0.88;
    drawDirectionalArrow(
      ctx,
      item.sv.x,
      item.sv.y,
      item.tv.x,
      item.tv.y,
      item.targetRadius,
      item.color,
      Math.max(2.2, item.size * 1.8),
      false,
      scale,
      item.isTargetControversial,
    );
    ctx.restore();
  });

  // Pass 3: Active dialectic refutations (contradicts - top z-index, solid, bold 3.8px with luminous halo)
  contradictionEdges.forEach((item) => {
    ctx.save();
    ctx.globalAlpha = 1.0;
    drawDirectionalArrow(
      ctx,
      item.sv.x,
      item.sv.y,
      item.tv.x,
      item.tv.y,
      item.targetRadius,
      item.color,
      Math.max(3.8, item.size * 2.6),
      true,
      scale,
      item.isTargetControversial,
    );
    ctx.restore();
  });

  // 4. Draw nodes
  graphData.forEachNode((node, attributes) => {
    if (!includeHidden && attributes.hidden) return;

    const pos = mapCoord(attributes.x ?? 0, attributes.y ?? 0);
    const size = attributes.size || 5;
    const controversyScore = attributes.controversyScore || 0;
    const isControversial = controversyScore >= 1;
    const isHighlighted = attributes.highlighted || isControversial;

    // A. Contested Node Aura (Luminous dual halo rings)
    if (isControversial) {
      ctx.save();
      // Outer faint halo
      ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size + 8, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glowing ring
      ctx.shadowColor = "rgba(244, 63, 94, 0.8)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // B. Node Core Disc
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
    ctx.fillStyle = isControversial ? "#f43f5e" : (attributes.color || "#999999");
    ctx.fill();

    // Subtle disc border
    ctx.strokeStyle = isDark ? "#1f2937" : "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // C. Controversy Counter Badge (⚔️ N)
    if (isControversial) {
      const badgeText = `⚔️ ${controversyScore}`;
      ctx.font = `bold 9px system-ui, -apple-system, sans-serif`;
      const badgeTextWidth = ctx.measureText(badgeText).width;
      const bPadding = 4;
      const bWidth = badgeTextWidth + bPadding * 2;
      const bHeight = 14;
      const bX = pos.x + size * 0.65;
      const bY = pos.y - size * 0.65 - bHeight / 2;

      ctx.save();
      ctx.fillStyle = "#ef4444";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bWidth, bHeight, 7);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, bX + bWidth / 2, bY + bHeight / 2);
      ctx.restore();
    }

    // D. Node Label with theme-aware background pill
    if (attributes.label) {
      const label = attributes.label;
      ctx.font = `11px system-ui, -apple-system, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      const labelX = pos.x;
      const labelY = pos.y - size - 9;

      if (isHighlighted) {
        const pillPadding = 6;
        const pillHeight = 18;
        const pillBgColor = isDark ? "#1f2937" : "#ffffff";
        const pillBorderColor = isControversial
          ? "rgba(244, 63, 94, 0.7)"
          : isDark
            ? "#374151"
            : "#e5e7eb";

        ctx.fillStyle = pillBgColor;
        ctx.strokeStyle = pillBorderColor;
        ctx.lineWidth = isControversial ? 1.5 : 1;
        ctx.beginPath();
        ctx.roundRect(
          labelX - textWidth / 2 - pillPadding,
          labelY - pillHeight / 2 - 2,
          textWidth + pillPadding * 2,
          pillHeight,
          pillHeight / 2,
        );
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = isDark ? "#f9fafb" : "#1f2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, labelX, labelY);
    }
  });

  ctx.restore();

  // 5. Draw Legend (bottom-left)
  if (includeLegend) {
    const legendX = 16 * scale;
    const legendY = headerHeight + graphHeight * scale - 210 * scale;
    drawLegend(ctx, legendX, legendY, isDark, scale);
  }

  // 6. Draw Dialectic Debate Callout Card (bottom-right)
  const clashes = getTopDebateClashes(graphData, 3, includeHidden);
  if (clashes.length > 0) {
    const calloutWidth = Math.min(420 * scale, exportWidth * 0.48);
    const calloutX = exportWidth - calloutWidth - 16 * scale;
    const headerH = 24 * scale;
    const rowH = 44 * scale;
    const pad = 14 * scale;
    const estimatedCardHeight = headerH + clashes.length * rowH + pad * 2;
    const calloutY =
      headerHeight + graphHeight * scale - estimatedCardHeight - 16 * scale;

    drawDebateCalloutCard(
      ctx,
      clashes,
      calloutX,
      calloutY,
      calloutWidth,
      isDark,
      scale,
    );
  }

  // 7. Draw Footer
  if (includeFooter) {
    drawFooter(ctx, metadata, exportWidth, exportHeight, isDark, scale);
  }

  return exportCanvas;
}

/**
 * Export Sigma canvas as PNG with full context (header, legend, footer, debate callout)
 * Draws high-contrast stratified edges and directional arrowheads directly from graph data
 */
export async function exportAsPNG(
  sigma: Sigma,
  options: Partial<ExportOptions> = {},
  graph?: Graph,
): Promise<string> {
  const {
    filename = "graph.png",
    quality = "standard",
    metadata = { title: "Citation Network", nodeCount: 0, edgeCount: 0 },
    includeLegend = true,
    includeHeader = true,
    includeFooter = true,
    includeHidden = false,
  } = options;

  const scale = getScaleForQuality(quality);
  const isDark = isDarkTheme();

  try {
    const { width: sigmaWidth, height: sigmaHeight } = sigma.getDimensions();
    const graphWidth = sigmaWidth;
    const graphHeight = sigmaHeight;
    const headerHeight = includeHeader ? 80 * scale : 0;
    const footerHeight = includeFooter ? 40 * scale : 0;

    const exportWidth = graphWidth * scale;
    const exportHeight = graphHeight * scale + headerHeight + footerHeight;

    const graphData = graph || sigma.getGraph();
    if (!graphData) {
      throw new Error("No graph data available for PNG export");
    }

    const exportCanvas = renderGraphToExportCanvas(graphData, sigma, {
      exportWidth,
      exportHeight,
      graphWidth,
      graphHeight,
      headerHeight,
      footerHeight,
      scale,
      isDark,
      metadata,
      includeHeader,
      includeLegend,
      includeFooter,
      includeHidden,
      layoutMode: options.layoutMode,
    });

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        "image/png",
        quality === "print" ? 1.0 : 0.92,
      );
    });

    // Create download
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);

    debug.graph(
      `Exported PNG: ${filename} (${quality} quality, ${Math.round(blob.size / 1024)}KB)`,
    );
    return url;
  } catch (error) {
    debug.error("PNG export failed:", error);
    throw error;
  }
}

/**
 * Generate SVG legend markup
 */
function generateSVGLegend(x: number, y: number, isDark: boolean): string {
  const bgColor = isDark
    ? "rgba(17, 24, 39, 0.95)"
    : "rgba(255, 255, 255, 0.95)";
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  const textColor = isDark ? "#f9fafb" : "#1f2937";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";

  let legend = `
  <g transform="translate(${x}, ${y})">
    <rect width="155" height="150" rx="8" fill="${bgColor}" stroke="${borderColor}" stroke-width="1"/>
    <text x="12" y="20" font-size="9" font-weight="bold" fill="${mutedColor}" font-family="system-ui, sans-serif">LEGEND</text>
`;

  let itemY = 40;
  LEGEND_CONFIG.edgeTypes.forEach((edge) => {
    const markerId =
      edge.color === "#22c55e"
        ? "arrow-supports"
        : edge.color === "#f43f5e"
          ? "arrow-contradicts"
          : edge.color === "#3b82f6"
            ? "arrow-extends"
            : "arrow-cites";
    const strokeW = edge.color === "#f43f5e" ? "3" : "2";

    legend += `    <line x1="12" y1="${itemY}" x2="26" y2="${itemY}" stroke="${edge.color}" stroke-width="${strokeW}" marker-end="url(#${markerId})"/>
    <text x="36" y="${itemY + 4}" font-size="11" fill="${textColor}" font-family="system-ui, sans-serif">${escapeXml(edge.label)}</text>
`;
    itemY += 20;
  });

  // Standard Node
  legend += `    <circle cx="18" cy="${itemY}" r="5" fill="none" stroke="${mutedColor}" stroke-width="2"/>
    <text x="36" y="${itemY + 4}" font-size="11" fill="${textColor}" font-family="system-ui, sans-serif">${escapeXml(LEGEND_CONFIG.nodeInfo.label)}</text>
`;
  itemY += 20;

  // Disputed Node
  legend += `    <circle cx="18" cy="${itemY}" r="5" fill="#f43f5e" stroke="#f43f5e" stroke-width="1.5"/>
    <circle cx="18" cy="${itemY}" r="8" fill="none" stroke="rgba(244, 63, 94, 0.45)" stroke-width="1.5"/>
    <text x="36" y="${itemY + 4}" font-size="11" fill="${textColor}" font-family="system-ui, sans-serif">${escapeXml(LEGEND_CONFIG.contestedNodeInfo.label)}</text>
  </g>
`;
  return legend;
}

/**
 * Generate SVG Debate Callout Card markup
 */
function generateSVGDebateCallout(
  clashes: DebateCalloutItem[],
  x: number,
  y: number,
  width: number,
  isDark: boolean,
): string {
  if (clashes.length === 0) return "";
  const headerHeight = 24;
  const rowHeight = 44;
  const padding = 14;
  const height = headerHeight + clashes.length * rowHeight + padding * 2;
  const bgColor = isDark
    ? "rgba(17, 24, 39, 0.95)"
    : "rgba(255, 255, 255, 0.96)";
  const textColor = isDark ? "#f9fafb" : "#111827";
  const mutedColor = isDark ? "#9ca3af" : "#4b5563";

  let out = `
  <g id="debate-callout" transform="translate(${x}, ${y})">
    <rect width="${width}" height="${height}" rx="10" fill="${bgColor}" stroke="#f43f5e" stroke-width="1.5"/>
    <text x="${padding}" y="${padding + 12}" font-size="10" font-weight="bold" fill="#f43f5e" font-family="system-ui, sans-serif">⚔️ EMPIRICAL CONTROVERSIES (${clashes.length} Active Clashes)</text>
`;

  let curY = padding + headerHeight;
  clashes.forEach((clash, idx) => {
    if (idx > 0) {
      out += `    <line x1="${padding}" y1="${curY - 6}" x2="${width - padding}" y2="${curY - 6}" stroke="${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}" stroke-width="1"/>\n`;
    }
    const citingStr = formatDebateLabelWithYear(clash.citingTitle, clash.citingYear);
    const targetStr = formatDebateLabelWithYear(clash.targetTitle, clash.targetYear);
    const pairText = `${citingStr} ⚔️ ${targetStr}`;
    const truncatedPair =
      pairText.length > 40 ? pairText.slice(0, 38) + "…" : pairText;
    const truncatedQuote =
      clash.snippet.length > 55 ? clash.snippet.slice(0, 53) + "…" : clash.snippet;

    out += `    <text x="${padding}" y="${curY + 10}" font-size="10" font-weight="bold" fill="${textColor}" font-family="system-ui, sans-serif">${escapeXml(truncatedPair)}</text>
    <text x="${width - padding - 30}" y="${curY + 10}" font-size="9" font-weight="bold" fill="#f43f5e" font-family="system-ui, sans-serif">${clash.confidence}%</text>
    <text x="${padding}" y="${curY + 24}" font-size="9" font-style="italic" fill="${mutedColor}" font-family="system-ui, sans-serif">“${escapeXml(truncatedQuote)}”</text>
`;
    curY += rowHeight;
  });

  out += `  </g>\n`;
  return out;
}

/**
 * Generate SVG header markup
 */
function generateSVGHeader(
  width: number,
  metadata: ExportMetadata,
  isDark: boolean,
): string {
  const bgColor = isDark ? "#111827" : "#ffffff";
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  const textColor = isDark ? "#f9fafb" : "#1f2937";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const pillBg = isDark ? "#374151" : "#f3f4f6";

  const statsText = `${metadata.nodeCount} papers · ${metadata.edgeCount} citations`;
  const contextText = metadata.query
    ? `Query: "${metadata.query}"`
    : metadata.description || "";

  return `
  <g id="header">
    <rect width="${width}" height="80" fill="${bgColor}"/>
    <line x1="0" y1="80" x2="${width}" y2="80" stroke="${borderColor}" stroke-width="1"/>
    <text x="24" y="36" font-size="18" font-weight="bold" fill="${textColor}" font-family="system-ui, sans-serif">${escapeXml(metadata.title)}</text>
    ${contextText ? `<text x="24" y="58" font-size="12" fill="${mutedColor}" font-family="system-ui, sans-serif">${escapeXml(contextText)}</text>` : ""}
    <rect x="${width - 180}" y="26" width="156" height="24" rx="12" fill="${pillBg}"/>
    <text x="${width - 172}" y="43" font-size="11" fill="${mutedColor}" font-family="system-ui, sans-serif">${statsText}</text>
  </g>
`;
}

/**
 * Generate SVG footer markup
 */
function generateSVGFooter(
  width: number,
  totalHeight: number,
  metadata: ExportMetadata,
  isDark: boolean,
): string {
  const bgColor = isDark ? "#111827" : "#ffffff";
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const footerY = totalHeight - 40;

  const timestamp = metadata.timestamp || new Date().toISOString();
  const formattedDate = new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return `
  <g id="footer" transform="translate(0, ${footerY})">
    <rect width="${width}" height="40" fill="${bgColor}"/>
    <line x1="0" y1="0" x2="${width}" y2="0" stroke="${borderColor}" stroke-width="1"/>
    <text x="24" y="25" font-size="10" fill="${mutedColor}" font-family="system-ui, sans-serif">Exported: ${formattedDate}</text>
    <text x="${width - 80}" y="25" font-size="11" font-weight="bold" fill="${BRAND.colors.primary}" font-family="system-ui, sans-serif">${BRAND.watermark}</text>
  </g>
`;
}

/**
 * Export Sigma canvas as SVG with full context (header, legend, footer, debate callout)
 * Text is selectable and searchable
 */
export async function exportAsSVG(
  sigma: Sigma,
  graph: Graph,
  options: Partial<ExportOptions> = {},
): Promise<string> {
  const {
    filename = "graph.svg",
    includeHidden = false,
    metadata = { title: "Citation Network", nodeCount: 0, edgeCount: 0 },
    includeLegend = true,
    includeHeader = true,
    includeFooter = true,
    layoutMode = "canvas",
  } = options;

  const isDark = isDarkTheme();

  try {
    const { width, height } = sigma.getDimensions();

    const headerHeight = includeHeader ? 80 : 0;
    const footerHeight = includeFooter ? 40 : 0;
    const totalHeight = height + headerHeight + footerHeight;

    const bgColor = isDark
      ? BRAND.colors.background.dark
      : BRAND.colors.background.light;
    const textColor = isDark ? "#f9fafb" : "#1f2937";

    // Clone graph to allow layout transformations without mutating live canvas
    const graphData = graph.copy();
    if (layoutMode === "hemispheric") {
      applyHemisphericLayout(graphData);
    }

    // Start SVG with metadata and arrow marker definitions
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
  <title>${escapeXml(metadata.title)}</title>
  <desc>Citation network visualization with ${metadata.nodeCount} papers and ${metadata.edgeCount} citations. Exported from ${BRAND.watermark}</desc>
  <metadata>
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <rdf:Description>
        <dc:title>${escapeXml(metadata.title)}</dc:title>
        <dc:creator>${BRAND.name}</dc:creator>
        <dc:date>${metadata.timestamp || new Date().toISOString()}</dc:date>
      </rdf:Description>
    </rdf:RDF>
  </metadata>

  <defs>
    <marker id="arrow-contradicts" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 0 1.2 L 10 5 L 0 8.8 z" fill="#f43f5e" />
    </marker>
    <marker id="arrow-supports" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#22c55e" />
    </marker>
    <marker id="arrow-extends" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#3b82f6" />
    </marker>
    <marker id="arrow-cites" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#a1a1aa" opacity="0.6" />
    </marker>
    <filter id="crimson-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${bgColor}"/>
`;

    // Add header
    if (includeHeader) {
      svg += generateSVGHeader(width, metadata, isDark);
    }

    // Graph content
    svg += `
  <!-- Graph Content -->
  <g id="graph">
`;

    // Create coordinate mapper for the graph area
    const mapCoord = createGraphMapper(graphData, width, height, 48, includeHidden);

    // Stratify edges into 3 passes
    interface SvgEdgeItem {
      sx: number;
      sy: number;
      tx: number;
      ty: number;
      color: string;
      strokeWidth: number;
      opacity: string;
      markerId: string;
      filter?: string;
    }

    const bgEdges: SvgEdgeItem[] = [];
    const linEdges: SvgEdgeItem[] = [];
    const conEdges: SvgEdgeItem[] = [];

    graphData.forEachEdge((edge, attributes, source, target) => {
      if (!includeHidden && attributes.hidden) return;

      const sourceNode = graphData.getNodeAttributes(source);
      const targetNode = graphData.getNodeAttributes(target);
      if (!includeHidden && (sourceNode.hidden || targetNode.hidden)) return;

      const sv = mapCoord(sourceNode.x ?? 0, sourceNode.y ?? 0);
      const tv = mapCoord(targetNode.x ?? 0, targetNode.y ?? 0);

      const sx = sv.x;
      const sy = sv.y + headerHeight;
      const rawTx = tv.x;
      const rawTy = tv.y + headerHeight;

      const edgeType = attributes.edgeType || attributes.type || "default";
      const targetRadius = targetNode.size || 5;
      const isTargetControversial = (targetNode.controversyScore || 0) >= 1;

      // Compute vector offset so arrowhead stops cleanly outside target node & halo buffer
      const dx = rawTx - sx;
      const dy = rawTy - sy;
      const dist = Math.hypot(dx, dy);
      let tx = rawTx;
      let ty = rawTy;

      if (dist > 1) {
        const offset = targetRadius + (isTargetControversial ? 10.5 : 2.5);
        tx = rawTx - (dx / dist) * offset;
        ty = rawTy - (dy / dist) * offset;
      }

      let edgeColor = attributes.color;
      let strokeWidth = 1.2;
      let opacity = "0.85";
      let markerId = "arrow-cites";
      let filter: string | undefined = undefined;

      if (edgeType === "supports") {
        edgeColor = "#22c55e";
        strokeWidth = Math.max(2.2, (attributes.size || 1) * 1.8);
        opacity = "0.88";
        markerId = "arrow-supports";
        linEdges.push({ sx, sy, tx, ty, color: edgeColor, strokeWidth, opacity, markerId });
      } else if (edgeType === "contradicts") {
        edgeColor = "#f43f5e";
        strokeWidth = Math.max(3.8, (attributes.size || 1) * 2.6);
        opacity = "1.0";
        markerId = "arrow-contradicts";
        filter = "url(#crimson-glow)";
        conEdges.push({ sx, sy, tx, ty, color: edgeColor, strokeWidth, opacity, markerId, filter });
      } else if (edgeType === "extends") {
        edgeColor = "#3b82f6";
        strokeWidth = Math.max(2.2, (attributes.size || 1) * 1.6);
        opacity = "0.85";
        markerId = "arrow-extends";
        linEdges.push({ sx, sy, tx, ty, color: edgeColor, strokeWidth, opacity, markerId });
      } else {
        edgeColor = isDark ? "#6b7280" : "#9ca3af";
        strokeWidth = Math.max(0.7, (attributes.size || 1) * 0.9);
        opacity = isDark ? "0.22" : "0.30";
        markerId = "arrow-cites";
        bgEdges.push({ sx, sy, tx, ty, color: edgeColor, strokeWidth, opacity, markerId });
      }
    });

    // Render SVG Edges in 3 passes
    [...bgEdges, ...linEdges, ...conEdges].forEach((e) => {
      const filterAttr = e.filter ? ` filter="${e.filter}"` : "";
      svg += `    <line x1="${e.sx}" y1="${e.sy}" x2="${e.tx}" y2="${e.ty}" 
        stroke="${e.color}" stroke-width="${e.strokeWidth}" opacity="${e.opacity}" marker-end="url(#${e.markerId})"${filterAttr}/>\n`;
    });

    // Draw nodes
    graphData.forEachNode((node, attributes) => {
      if (!includeHidden && attributes.hidden) return;

      const pos = mapCoord(attributes.x ?? 0, attributes.y ?? 0);
      const cx = pos.x;
      const cy = pos.y + headerHeight;
      const size = attributes.size || 5;
      const controversyScore = attributes.controversyScore || 0;
      const isControversial = controversyScore >= 1;
      const isHighlighted = attributes.highlighted || isControversial;

      // Halo for disputed nodes
      if (isControversial) {
        svg += `    <circle cx="${cx}" cy="${cy}" r="${size + 7}" fill="none" stroke="rgba(244, 63, 94, 0.35)" stroke-width="1.8"/>\n`;
        svg += `    <circle cx="${cx}" cy="${cy}" r="${size + 4}" fill="none" stroke="#f43f5e" stroke-width="2" filter="url(#crimson-glow)"/>\n`;
      }

      // Main node circle
      const nodeFill = isControversial ? "#f43f5e" : (attributes.color || "#999");
      svg += `    <circle cx="${cx}" cy="${cy}" r="${size}" 
        fill="${nodeFill}" stroke="${isDark ? "#1f2937" : "#ffffff"}" stroke-width="1.2" data-id="${escapeXml(node)}"/>\n`;

      // Controversy Badge ⚔️ N
      if (isControversial) {
        const badgeText = `⚔️ ${controversyScore}`;
        const bWidth = badgeText.length * 6 + 10;
        const bHeight = 14;
        const bX = cx + size * 0.65;
        const bY = cy - size * 0.65 - bHeight / 2;

        svg += `    <rect x="${bX}" y="${bY}" width="${bWidth}" height="${bHeight}" rx="7" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
    <text x="${bX + bWidth / 2}" y="${bY + 10}" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff" font-family="system-ui, sans-serif">${badgeText}</text>\n`;
      }

      // Add label
      if (attributes.label) {
        const labelY = cy - size - 9;

        if (isHighlighted) {
          const pillBgColor = isDark ? "#1f2937" : "#ffffff";
          const pillBorderColor = isControversial
            ? "rgba(244, 63, 94, 0.7)"
            : isDark
              ? "#374151"
              : "#e5e7eb";
          const textWidth = attributes.label.length * 6.5;
          const pillPadding = 6;
          const pillHeight = 18;

          svg += `    <rect x="${cx - textWidth / 2 - pillPadding}" y="${labelY - pillHeight / 2 - 2}" 
            width="${textWidth + pillPadding * 2}" height="${pillHeight}" rx="${pillHeight / 2}"
            fill="${pillBgColor}" stroke="${pillBorderColor}" stroke-width="${isControversial ? 1.5 : 1}"/>\n`;
        }

        svg += `    <text x="${cx}" y="${labelY}" 
          text-anchor="middle" font-size="11" fill="${textColor}" font-family="system-ui, sans-serif" 
          style="pointer-events: all; cursor: default;">${escapeXml(attributes.label)}</text>\n`;
      }
    });

    svg += `  </g>\n`;

    // Add legend (bottom-left)
    if (includeLegend) {
      svg += generateSVGLegend(16, headerHeight + height - 170, isDark);
    }

    // Add Dialectic Debate Callout Card (bottom-right)
    const clashes = getTopDebateClashes(graphData, 3, includeHidden);
    if (clashes.length > 0) {
      const calloutWidth = Math.min(420, width * 0.48);
      const calloutX = width - calloutWidth - 16;
      const headerH = 24;
      const rowH = 44;
      const pad = 14;
      const estCardH = headerH + clashes.length * rowH + pad * 2;
      const calloutY = headerHeight + height - estCardH - 16;

      svg += generateSVGDebateCallout(clashes, calloutX, calloutY, calloutWidth, isDark);
    }

    // Add footer
    if (includeFooter) {
      svg += generateSVGFooter(width, totalHeight, metadata, isDark);
    }

    svg += `</svg>`;

    // Create download
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);

    debug.graph(`Exported SVG: ${filename}`);
    return url;
  } catch (error) {
    debug.error("SVG export failed:", error);
    throw error;
  }
}

// =============================================================================
// DATA EXPORT (GraphML, JSON, CSV)
// =============================================================================

/**
 * Export graph as GraphML (for Gephi, Cytoscape, etc.)
 */
export async function exportAsGraphML(
  graph: Graph,
  options: Partial<ExportOptions> = {},
): Promise<string> {
  const { filename = "graph.graphml", includeHidden = false } = options;

  try {
    let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="x" for="node" attr.name="x" attr.type="double"/>
  <key id="y" for="node" attr.name="y" attr.type="double"/>
  <key id="size" for="node" attr.name="size" attr.type="double"/>
  <key id="color" for="node" attr.name="color" attr.type="string"/>
  <key id="title" for="node" attr.name="title" attr.type="string"/>
  <key id="year" for="node" attr.name="year" attr.type="int"/>
  <key id="citations" for="node" attr.name="citations" attr.type="int"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <key id="type" for="edge" attr.name="type" attr.type="string"/>
  <graph edgedefault="directed">
`;

    // Add nodes
    graph.forEachNode((node, attributes) => {
      if (!includeHidden && attributes.hidden) return;

      graphml += `    <node id="${escapeXml(node)}">
      <data key="label">${escapeXml(attributes.label || node)}</data>
      <data key="x">${attributes.x || 0}</data>
      <data key="y">${attributes.y || 0}</data>
      <data key="size">${attributes.size || 5}</data>
      <data key="color">${attributes.color || "#999"}</data>
`;

      if (attributes.title) {
        graphml += `      <data key="title">${escapeXml(attributes.title)}</data>
`;
      }
      if (attributes.year) {
        graphml += `      <data key="year">${attributes.year}</data>
`;
      }
      if (attributes.citations) {
        graphml += `      <data key="citations">${attributes.citations}</data>
`;
      }

      graphml += `    </node>
`;
    });

    // Add edges
    graph.forEachEdge((edge, attributes, source, target) => {
      if (!includeHidden && attributes.hidden) return;

      graphml += `    <edge source="${escapeXml(source)}" target="${escapeXml(target)}">
      <data key="weight">${attributes.weight || 1}</data>
      <data key="type">${attributes.type || "default"}</data>
    </edge>
`;
    });

    graphml += `  </graph>
</graphml>`;

    // Create download
    const blob = new Blob([graphml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);

    debug.graph(`Exported GraphML: ${filename}`);
    return url;
  } catch (error) {
    debug.error("GraphML export failed:", error);
    throw error;
  }
}

/**
 * Export graph as JSON
 */
export async function exportAsJSON(
  graph: Graph,
  options: Partial<ExportOptions> = {},
): Promise<string> {
  const { filename = "graph.json", includeHidden = false } = options;

  try {
    const nodes: any[] = [];
    const edges: any[] = [];

    graph.forEachNode((node, attributes) => {
      if (!includeHidden && attributes.hidden) return;
      nodes.push({ id: node, ...attributes });
    });

    graph.forEachEdge((edge, attributes, source, target) => {
      if (!includeHidden && attributes.hidden) return;
      edges.push({ id: edge, source, target, ...attributes });
    });

    const data = { nodes, edges };
    const json = JSON.stringify(data, null, 2);

    // Create download
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);

    debug.graph(`Exported JSON: ${filename}`);
    return url;
  } catch (error) {
    debug.error("JSON export failed:", error);
    throw error;
  }
}

/**
 * Export graph as CSV (nodes and edges separately)
 */
export async function exportAsCSV(
  graph: Graph,
  options: Partial<ExportOptions> = {},
): Promise<{ nodesUrl: string; edgesUrl: string }> {
  const { filename = "graph", includeHidden = false } = options;

  try {
    // Nodes CSV
    let nodesCsv = "id,label,x,y,size,color,title,year,citations\n";
    graph.forEachNode((node, attributes) => {
      if (!includeHidden && attributes.hidden) return;

      nodesCsv += `"${node}","${csvEscape(attributes.label || node)}",${attributes.x || 0},${attributes.y || 0},${attributes.size || 5},"${attributes.color || "#999"}","${csvEscape(attributes.title || "")}",${attributes.year || ""},${attributes.citations || ""}\n`;
    });

    // Edges CSV
    let edgesCsv = "source,target,type,weight,color\n";
    graph.forEachEdge((edge, attributes, source, target) => {
      if (!includeHidden && attributes.hidden) return;

      edgesCsv += `"${source}","${target}","${attributes.type || "default"}",${attributes.weight || 1},"${attributes.color || "#ccc"}"\n`;
    });

    // Download nodes
    const nodesBlob = new Blob([nodesCsv], { type: "text/csv" });
    const nodesUrl = URL.createObjectURL(nodesBlob);
    triggerDownload(nodesUrl, `${filename}_nodes.csv`);

    // Download edges
    const edgesBlob = new Blob([edgesCsv], { type: "text/csv" });
    const edgesUrl = URL.createObjectURL(edgesBlob);
    triggerDownload(edgesUrl, `${filename}_edges.csv`);

    debug.graph(`Exported CSV: ${filename}_nodes.csv, ${filename}_edges.csv`);
    return { nodesUrl, edgesUrl };
  } catch (error) {
    debug.error("CSV export failed:", error);
    throw error;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function csvEscape(str: string): string {
  return str.replace(/"/g, '""');
}

/**
 * Export Sigma canvas as PDF with full context (header, legend, footer)
 * Uses jsPDF to generate a multi-page PDF with the graph visualization
 */
export async function exportAsPDF(
  sigma: Sigma,
  options: Partial<ExportOptions> = {},
  graph?: Graph,
): Promise<string> {
  const {
    filename = "graph.pdf",
    quality = "standard",
    metadata = { title: "Citation Network", nodeCount: 0, edgeCount: 0 },
    includeLegend = true,
    includeHeader = true,
    includeFooter = true,
  } = options;

  const isDark = isDarkTheme();

  try {
    // First export as PNG to get the graph image
    const scale = quality === "print" ? 3 : quality === "compressed" ? 1 : 2;
    const { width: sigmaWidth, height: sigmaHeight } = sigma.getDimensions();

    // Create a temporary canvas with the graph
    const graphWidth = sigmaWidth;
    const graphHeight = sigmaHeight;
    const headerHeight = includeHeader ? 80 * scale : 0;
    const footerHeight = includeFooter ? 40 * scale : 0;

    const exportWidth = graphWidth * scale;
    const exportHeight = graphHeight * scale + headerHeight + footerHeight;

    const graphData = graph || sigma.getGraph();
    if (!graphData) {
      throw new Error("No graph data available for PDF export");
    }

    const exportCanvas = renderGraphToExportCanvas(graphData, sigma, {
      exportWidth,
      exportHeight,
      graphWidth,
      graphHeight,
      headerHeight,
      footerHeight,
      scale,
      isDark,
      metadata,
      includeHeader,
      includeLegend,
      includeFooter,
      includeHidden: options.includeHidden ?? false,
      layoutMode: options.layoutMode,
    });

    // Create PDF
    // Determine orientation based on aspect ratio
    const isLandscape = exportWidth > exportHeight;
    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "px",
      format: [exportWidth / scale, exportHeight / scale],
    });

    // Add the canvas as an image
    const imgData = exportCanvas.toDataURL("image/png", 0.95);
    pdf.addImage(
      imgData,
      "PNG",
      0,
      0,
      exportWidth / scale,
      exportHeight / scale,
    );

    // Add PDF metadata
    pdf.setProperties({
      title: metadata.title,
      subject: `Citation network with ${metadata.nodeCount} papers and ${metadata.edgeCount} citations`,
      author: BRAND.name,
      keywords: "citation, network, research, graph",
      creator: BRAND.watermark,
    });

    // Save PDF
    pdf.save(filename);

    debug.graph(`Exported PDF: ${filename} (${quality} quality)`);

    return filename;
  } catch (error) {
    debug.error("PDF export failed:", error);
    throw error;
  }
}

/**
 * Export a markdown Debate Report of contested claims, evidence, and corrections.
 */
export async function exportAsDebateReport(
  graph: Graph,
  options: Partial<ExportOptions> = {},
): Promise<string> {
  const { buildDebateReport, renderDebateReportMarkdown } =
    await import("./debate-report");
  const filename = options.filename?.endsWith(".md")
    ? options.filename
    : `${options.filename || "debate-report"}.md`;

  const report = buildDebateReport(graph, {
    title: options.metadata?.title || "Debate Report",
    query: options.metadata?.query,
  });
  const markdown = renderDebateReportMarkdown(report);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  debug.graph(`Exported Debate Report: ${filename}`);
  return url;
}

/**
 * Main export function - routes to appropriate exporter
 */
export async function exportGraph(
  sigma: Sigma,
  graph: Graph,
  options: ExportOptions,
): Promise<string | { nodesUrl: string; edgesUrl: string }> {
  switch (options.format) {
    case "png":
      return exportAsPNG(sigma, options, graph);
    case "svg":
      return exportAsSVG(sigma, graph, options);
    case "graphml":
      return exportAsGraphML(graph, options);
    case "json":
      return exportAsJSON(graph, options);
    case "csv":
      return exportAsCSV(graph, options);
    case "pdf":
      return exportAsPDF(sigma, options, graph);
    case "debate-md":
      return exportAsDebateReport(graph, options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}
