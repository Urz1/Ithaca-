"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Share2,
  Copy,
  Check,
  Download,
  Image,
  FileJson,
  Twitter,
  Mail,
  Loader2,
  FileCode,
  Table,
  Eye,
  X,
  Sparkles,
  ScrollText,
} from "lucide-react";
import type { ExportFormat, ExportMetadata } from "@/lib/graph-export";
import {
  buildGraphExportPayload,
  isDurableExportFormat,
} from "@/lib/graph-export-payload";
import {
  getJobCapabilities,
  submitDurableGraphExport,
  waitForBackgroundJob,
} from "@/app/(app)/jobs/actions";
import { createGraphSnapshot } from "@/app/(app)/dashboard/actions";
import { serializeGraphSnapshot } from "@/lib/graph-snapshot";
import type { Sigma } from "sigma";
import type Graph from "graphology";
import { cn } from "@/lib/utils";

interface ShareExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphTitle?: string;
  graphDescription?: string;
  searchQuery?: string;
  nodeCount?: number;
  edgeCount?: number;
  sigma?: Sigma | null;
  graph?: Graph | null;
}

/**
 * Prefer a frozen snapshot link so collaborators see the same nodes/edges.
 * Falls back to a live `?q=` re-fetch URL when the graph is empty.
 */
async function generateShareLink(input: {
  searchQuery?: string;
  graphTitle?: string;
  graph?: Graph | null;
}): Promise<string> {
  const url = new URL("/explore", window.location.origin);

  if (input.graph && input.graph.order > 0) {
    const snapshot = serializeGraphSnapshot(input.graph, input.searchQuery);
    const saved = await createGraphSnapshot({
      title: input.graphTitle || "Shared debate map",
      query: input.searchQuery || "snapshot",
      snapshot,
    });
    url.searchParams.set("graph", saved.id);
    return url.toString();
  }

  if (input.searchQuery) {
    url.searchParams.set("q", input.searchQuery);
  }

  return url.toString();
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-");
}

export function ShareExportDialog({
  open,
  onOpenChange,
  graphTitle = "Citation Network",
  graphDescription,
  searchQuery,
  nodeCount = 0,
  edgeCount = 0,
  sigma,
  graph,
}: ShareExportProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const [durableJobsEnabled, setDurableJobsEnabled] = useState(false);
  const [maxNodesSynchronous, setMaxNodesSynchronous] = useState(2000);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<ExportFormat>("png");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Build metadata for exports
  const exportMetadata: ExportMetadata = {
    title: graphTitle,
    description: graphDescription,
    query: searchQuery,
    nodeCount,
    edgeCount,
    timestamp: new Date().toISOString(),
  };

  // Generate share link when dialog opens
  const handleGenerateLink = useCallback(async () => {
    setIsGeneratingLink(true);
    setError(null);
    try {
      const url = await generateShareLink({
        searchQuery,
        graphTitle,
        graph,
      });
      setShareUrl(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate share link",
      );
      console.error(err);
    } finally {
      setIsGeneratingLink(false);
    }
  }, [searchQuery, graphTitle, graph]);

  // Generate link on open (regenerate if searchQuery changed)
  useEffect(() => {
    if (open) {
      handleGenerateLink();
      void getJobCapabilities().then((capabilities) => {
        setDurableJobsEnabled(capabilities.durableJobsEnabled);
        setMaxNodesSynchronous(capabilities.maxNodesSynchronous);
      });
    } else {
      setShareUrl(null);
      setJobMessage(null);
    }
  }, [open, handleGenerateLink]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!sigma || !graph) {
        setError("Graph not initialized");
        return;
      }

      setExporting(format);
      setError(null);
      setJobMessage(null);

      try {
        const filename = sanitizeFilename(graphTitle);
        const useDurableQueue =
          durableJobsEnabled &&
          nodeCount > maxNodesSynchronous &&
          isDurableExportFormat(format);

        if (useDurableQueue) {
          const payload = buildGraphExportPayload(graph, {
            format,
            filename,
            includeHidden: false,
          });
          setJobMessage("Submitting export to background worker...");
          const submission = await submitDurableGraphExport({
            filename: payload.filename,
            content: payload.content,
            contentType: payload.contentType,
            encoding: payload.encoding,
            nodeCount,
          });
          setJobMessage(
            "Processing export. This may take up to two minutes...",
          );
          const completed = await waitForBackgroundJob(submission.jobId);
          if (!completed) {
            throw new Error("Timed out waiting for export job");
          }
          if (completed.status === "FAILED") {
            throw new Error(completed.errorMessage || "Export job failed");
          }
          if (!completed.artifact?.id) {
            throw new Error("Export completed without an artifact");
          }
          window.location.href = `/api/artifacts/${completed.artifact.id}/download`;
          setJobMessage("Export ready. Download started.");
          return;
        }

        const { exportGraph } = await import("@/lib/graph-export");
        await exportGraph(sigma, graph, {
          format,
          filename,
          metadata: exportMetadata,
          includeLegend: true,
          includeHeader: true,
          includeFooter: true,
        });
      } catch (err) {
        setError(
          `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        console.error(err);
      } finally {
        setExporting(null);
      }
    },
    [
      graphTitle,
      sigma,
      graph,
      exportMetadata,
      durableJobsEnabled,
      maxNodesSynchronous,
      nodeCount,
    ],
  );

  // Generate preview for visual exports - matches actual export
  const generatePreview = useCallback(async () => {
    if (!graph || !previewCanvasRef.current) return;

    const ctx = previewCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains("dark");
    const previewWidth = 400;
    const previewHeight = 260;
    const headerHeight = 32;
    const footerHeight = 20;
    const graphAreaHeight = previewHeight - headerHeight - footerHeight;

    previewCanvasRef.current.width = previewWidth;
    previewCanvasRef.current.height = previewHeight;

    // Background
    ctx.fillStyle = isDark ? "#0B0C10" : "#F6F7F8";
    ctx.fillRect(0, 0, previewWidth, previewHeight);

    // Mini header
    ctx.fillStyle = isDark ? "#111827" : "#ffffff";
    ctx.fillRect(0, 0, previewWidth, headerHeight);
    ctx.strokeStyle = isDark ? "#374151" : "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(previewWidth, headerHeight);
    ctx.stroke();

    ctx.fillStyle = isDark ? "#f9fafb" : "#1f2937";
    ctx.font = "bold 11px system-ui";
    ctx.fillText(graphTitle, 10, 21);

    // Stats badge
    ctx.fillStyle = isDark ? "#374151" : "#f3f4f6";
    const statsText = `${nodeCount} · ${edgeCount}`;
    ctx.beginPath();
    ctx.roundRect(previewWidth - 70, 8, 60, 16, 8);
    ctx.fill();
    ctx.fillStyle = isDark ? "#9ca3af" : "#6b7280";
    ctx.font = "9px system-ui";
    ctx.fillText(statsText, previewWidth - 65, 20);

    // Draw edges from graph data
    ctx.save();

    // Create coordinate mapper: normalize graph positions into the preview graph area
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    let nodeCount_ = 0;
    graph.forEachNode((_n, attrs) => {
      if (attrs.hidden) return;
      const x = attrs.x ?? 0;
      const y = attrs.y ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      nodeCount_++;
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const pad = 20;
    const usableW = previewWidth - pad * 2;
    const usableH = graphAreaHeight - pad * 2;
    const scaleF = Math.min(usableW / rangeX, usableH / rangeY);
    const ofsX = pad + (usableW - rangeX * scaleF) / 2;
    const ofsY = headerHeight + pad + (usableH - rangeY * scaleF) / 2;

    const mapPrev = (gx: number, gy: number) => ({
      x: ofsX + (gx - minX) * scaleF,
      y: ofsY + (gy - minY) * scaleF,
    });

    graph.forEachEdge((edge, attributes, source, target) => {
      if (attributes.hidden) return;
      const sourceAttrs = graph.getNodeAttributes(source);
      const targetAttrs = graph.getNodeAttributes(target);
      if (sourceAttrs.hidden || targetAttrs.hidden) return;

      const sv = mapPrev(sourceAttrs.x ?? 0, sourceAttrs.y ?? 0);
      const tv = mapPrev(targetAttrs.x ?? 0, targetAttrs.y ?? 0);

      const edgeType = attributes.edgeType || attributes.type || "default";
      let edgeColor = isDark ? "#6b7280" : "#9ca3af";
      if (edgeType === "supports") edgeColor = "#22c55e";
      else if (edgeType === "contradicts") edgeColor = "#ef4444";
      else if (edgeType === "extends") edgeColor = "#3b82f6";

      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      if (edgeType === "contradicts") ctx.setLineDash([3, 2]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(sv.x, sv.y);
      ctx.lineTo(tv.x, tv.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw nodes from graph data
    graph.forEachNode((node, attributes) => {
      if (attributes.hidden) return;
      const pos = mapPrev(attributes.x ?? 0, attributes.y ?? 0);
      // Scale node size proportionally to the preview (preview is ~1/3 of export)
      const size = Math.max(Math.min((attributes.size || 5) * 0.35, 6), 1.5);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fillStyle = attributes.color || "#999";
      ctx.fill();
    });
    ctx.restore();

    // Mini legend
    const legendX = 8;
    const legendY = headerHeight + graphAreaHeight - 50;
    ctx.fillStyle = isDark ? "rgba(17,24,39,0.9)" : "rgba(255,255,255,0.9)";
    ctx.strokeStyle = isDark ? "#374151" : "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(legendX, legendY, 65, 45, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 7px system-ui";
    ctx.fillStyle = isDark ? "#9ca3af" : "#6b7280";
    ctx.fillText("LEGEND", legendX + 5, legendY + 10);

    const legendItems = [
      { color: "#22c55e", label: "Supports" },
      { color: "#ef4444", label: "Refutes" },
      { color: "#3b82f6", label: "Extends" },
    ];
    legendItems.forEach((item, i) => {
      const y = legendY + 18 + i * 9;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(legendX + 5, y);
      ctx.lineTo(legendX + 15, y);
      ctx.stroke();
      ctx.fillStyle = isDark ? "#f9fafb" : "#1f2937";
      ctx.font = "7px system-ui";
      ctx.fillText(item.label, legendX + 18, y + 3);
    });

    // Mini footer
    ctx.fillStyle = isDark ? "#111827" : "#ffffff";
    ctx.fillRect(0, previewHeight - footerHeight, previewWidth, footerHeight);
    ctx.strokeStyle = isDark ? "#374151" : "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, previewHeight - footerHeight);
    ctx.lineTo(previewWidth, previewHeight - footerHeight);
    ctx.stroke();

    ctx.fillStyle = "#8b5cf6";
    ctx.font = "bold 8px system-ui";
    ctx.fillText("ithaca.app", previewWidth - 55, previewHeight - 6);

    ctx.fillStyle = isDark ? "#9ca3af" : "#6b7280";
    ctx.font = "7px system-ui";
    ctx.fillText(
      "Exported: " + new Date().toLocaleDateString(),
      8,
      previewHeight - 6,
    );
  }, [graph, graphTitle, nodeCount, edgeCount]);

  // Generate preview when dialog opens
  useEffect(() => {
    if (open && graph) {
      setTimeout(generatePreview, 100);
    }
  }, [open, graph, generatePreview]);

  const handleSocialShare = useCallback(
    (platform: string) => {
      if (!shareUrl) return;

      const text = `Check out this scientific argument graph: ${graphTitle}`;
      const encodedUrl = encodeURIComponent(shareUrl);

      let shareLink = "";
      switch (platform) {
        case "twitter":
          shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`;
          break;
        case "email":
          shareLink = `mailto:?subject=${encodeURIComponent(`Shared Graph: ${graphTitle}`)}&body=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;
          break;
      }

      if (shareLink) {
        window.open(shareLink, "_blank", "noopener,noreferrer");
      }
    },
    [graphTitle, shareUrl],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="share-dialog"
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share debate map
          </DialogTitle>
          <DialogDescription>
            Freeze this map for organization teammates, or export a Debate
            Report of contested claims.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-destructive bg-destructive/10 rounded p-2 text-sm">
            {error}
          </div>
        )}

        {jobMessage && (
          <div className="bg-primary/10 text-primary rounded p-2 text-sm">
            {jobMessage}
          </div>
        )}

        <div className="space-y-6 py-4">
          {/* Primary: frozen share for org teammates */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Frozen share link</label>
            <div className="flex gap-2">
              <Input
                data-testid="share-frozen-link"
                value={isGeneratingLink ? "Generating link..." : shareUrl || ""}
                readOnly
                className="font-mono text-xs"
                disabled={isGeneratingLink}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0"
                disabled={!shareUrl || isGeneratingLink}
              >
                {isGeneratingLink ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Anyone in your organization can open the same frozen nodes and
              edges. Not a public internet link.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleSocialShare("email")}
                disabled={!shareUrl}
              >
                <Mail className="h-4 w-4" />
                Email teammates
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleSocialShare("twitter")}
                disabled={!shareUrl}
              >
                <Twitter className="h-4 w-4" />
                Twitter
              </Button>
            </div>
          </div>

          {/* Primary niche artifact */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Debate Report</label>
            <Button
              data-testid="export-debate-report"
              className="h-auto w-full justify-start gap-3 p-4"
              variant="default"
              disabled={exporting === "debate-md" || !graph}
              onClick={() => handleExport("debate-md")}
            >
              {exporting === "debate-md" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ScrollText className="h-5 w-5" />
              )}
              <span className="text-left">
                <span className="block text-sm font-medium">
                  {exporting === "debate-md"
                    ? "Exporting..."
                    : "Export Debate Report"}
                </span>
                <span className="text-primary-foreground/80 block text-xs font-normal">
                  Contested claims, evidence snippets, and corrections
                </span>
              </span>
            </Button>
          </div>

          {/* Export Preview */}
          {graph && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="text-muted-foreground h-4 w-4" />
                  Export Preview
                </label>
                <Badge variant="secondary" className="text-[10px]">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Includes legend & metadata
                </Badge>
              </div>
              <div className="border-border bg-muted/30 relative overflow-hidden rounded-lg border">
                <canvas
                  ref={previewCanvasRef}
                  className="h-auto w-full"
                  style={{ maxHeight: 200 }}
                />
                <div className="from-background/60 pointer-events-none absolute inset-0 bg-gradient-to-t to-transparent" />
                <div className="text-muted-foreground absolute right-2 bottom-2 left-2 flex items-center justify-between text-[10px]">
                  <span>Title, stats & timestamp included</span>
                  <span>Legend embedded</span>
                </div>
              </div>
            </div>
          )}

          {/* Other export formats */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Other formats</label>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-auto flex-col gap-1 p-3"
                disabled={exporting === "png" || !sigma || !graph}
                onClick={() => handleExport("png")}
              >
                {exporting === "png" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Image className="h-5 w-5" />
                )}
                <span className="text-xs font-medium">
                  {exporting === "png" ? "Exporting..." : "PNG Image"}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  High-res screenshot
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-1 p-3"
                disabled={exporting === "svg" || !sigma || !graph}
                onClick={() => handleExport("svg")}
              >
                {exporting === "svg" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileCode className="h-5 w-5" />
                )}
                <span className="text-xs font-medium">
                  {exporting === "svg" ? "Exporting..." : "SVG Vector"}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  Scalable format
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-1 p-3"
                disabled={exporting === "graphml" || !graph}
                onClick={() => handleExport("graphml")}
              >
                {exporting === "graphml" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileCode className="h-5 w-5" />
                )}
                <span className="text-xs font-medium">
                  {exporting === "graphml" ? "Exporting..." : "GraphML"}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  For Gephi/Cytoscape
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-1 p-3"
                disabled={exporting === "json" || !graph}
                onClick={() => handleExport("json")}
              >
                {exporting === "json" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileJson className="h-5 w-5" />
                )}
                <span className="text-xs font-medium">
                  {exporting === "json" ? "Exporting..." : "JSON Data"}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  Graph structure
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-1 p-3"
                disabled={exporting === "csv" || !graph}
                onClick={() => handleExport("csv")}
              >
                {exporting === "csv" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Table className="h-5 w-5" />
                )}
                <span className="text-xs font-medium">
                  {exporting === "csv" ? "Exporting..." : "CSV Tables"}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  Nodes & edges sheets
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col gap-1 p-3"
                disabled={exporting === "pdf" || !sigma || !graph}
                onClick={() => handleExport("pdf")}
              >
                {exporting === "pdf" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                <span className="text-xs font-medium">
                  {exporting === "pdf" ? "Exporting..." : "PDF Document"}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  Print-ready file
                </span>
              </Button>
            </div>
          </div>

          {/* Graph Info */}
          <div className="text-muted-foreground flex items-center justify-between border-t pt-2 text-xs">
            <span>{graphTitle}</span>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {nodeCount} nodes
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {edgeCount} edges
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating Share Button for Canvas - positioned at bottom-right
export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="canvas-share-button"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground h-7 px-2.5 rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-muted/30 dark:bg-zinc-900/40 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center gap-1 text-xs font-medium transition-colors"
      title="Share or export graph"
    >
      <Share2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}
