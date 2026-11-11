"use client";

import { Lightbulb, X } from "lucide-react";
import { drawDiscNodeLabel } from "sigma/rendering";

// =============================================================================
// TOAST NOTIFICATION
// =============================================================================

interface NewArgumentToastProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

/**
 * Toast notification for new argument discoveries.
 */
export function NewArgumentToast({
  show,
  message,
  onClose,
}: NewArgumentToastProps) {
  if (!show) return null;

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-card/95 border-primary/30 flex items-center gap-3 rounded-lg border p-1 pr-4 shadow-[0_0_20px_rgba(59,130,246,0.2)] backdrop-blur-sm">
        <div className="bg-primary/20 text-primary flex items-center justify-center rounded p-2">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-foreground text-sm font-bold">
            New Argument Found
          </span>
          <span className="text-muted-foreground text-xs">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground ml-4 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// =============================================================================
// THEME-AWARE NODE LABEL & HOVER DRAWERS
// =============================================================================

/**
 * Custom node label drawer with:
 * 1. High contrast typography in both light (#0f172a) and dark (#f8fafc) modes with legibility stroke.
 * 2. Visual orbital halos/rings around seminal and high-impact papers (> 500 or > 1,000 citations).
 * 3. Citation count metric badges rendered directly beside paper labels (e.g. "★ 14.2k cit.").
 */
export function createThemeAwareNodeLabelDrawer(isDark: boolean) {
  return function drawNodeLabel(
    context: CanvasRenderingContext2D,
    data: {
      x: number;
      y: number;
      size: number;
      label?: string | null;
      color?: string;
      citations?: number;
      isHighImpact?: boolean;
      [key: string]: unknown;
    },
    settings: {
      labelSize: number;
      labelFont: string;
      labelWeight: string;
      labelColor: { color?: string; attribute?: string };
    },
  ) {
    if (!data.label) return;

    const citations = typeof data.citations === "number" ? data.citations : 0;
    const isSeminal = citations >= 2500 || Boolean(data.isHighImpact);

    // 1. Subtle, elegant solid aura strictly for genuine seminal landmark papers (>= 2500 citations)
    if (isSeminal) {
      context.save();
      context.beginPath();
      const ringRadius = data.size + 3.5;
      context.arc(data.x, data.y, ringRadius, 0, Math.PI * 2);
      context.strokeStyle = isDark
        ? "rgba(245, 158, 11, 0.5)"
        : "rgba(217, 119, 6, 0.45)"; // Soft amber landmark aura
      context.lineWidth = 1.5;
      context.stroke();
      context.restore();
    }

    // 2. High-contrast typography for the label
    const size = settings.labelSize;
    const font = settings.labelFont;
    const weight = settings.labelWeight;

    // Format citation text: e.g. "★ 14.2k cit." or "★ 420 cit."
    let citText = "";
    if (citations > 0) {
      const formattedCount =
        citations >= 1000
          ? `${(citations / 1000).toFixed(citations >= 10000 ? 0 : 1)}k`
          : `${citations}`;
      citText = isSeminal
        ? `★ ${formattedCount} cit.`
        : `${formattedCount} cit.`;
    }

    const primaryColor = isDark ? "#f8fafc" : "#0f172a";
    const secondaryColor = isDark ? "#94a3b8" : "#64748b";
    const xPos = data.x + data.size + 4;
    const yPos = data.y + size / 3;

    // Draw subtle text shadow/backing for guaranteed legibility across edge lines
    context.save();
    context.font = `${weight} ${size}px ${font}`;
    context.strokeStyle = isDark
      ? "rgba(11, 12, 16, 0.85)"
      : "rgba(246, 247, 248, 0.9)";
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.strokeText(data.label, xPos, yPos);

    context.fillStyle = primaryColor;
    context.fillText(data.label, xPos, yPos);

    // If citations present, draw the citation metric pill/tag next to the author (year)
    if (citText) {
      const labelWidth = context.measureText(data.label).width;
      const citX = xPos + labelWidth + 6;
      context.font = `600 ${Math.max(size - 2, 9)}px ${font}`;
      context.fillStyle = isSeminal
        ? isDark
          ? "#fbbf24"
          : "#d97706" // Gold/amber for landmark
        : secondaryColor;
      context.fillText(citText, citX, yPos);
    }
    context.restore();
  };
}

/**
 * Custom hover drawer that uses theme-aware colors and displays citation count badge.
 * Based on Sigma's drawDiscNodeHover with configurable theme styling.
 */
export function createThemeAwareHoverDrawer(isDark: boolean) {
  const nodeLabelDrawer = createThemeAwareNodeLabelDrawer(isDark);

  return function drawNodeHover(
    context: CanvasRenderingContext2D,
    data: {
      x: number;
      y: number;
      size: number;
      label?: string | null;
      color?: string;
      citations?: number;
      isHighImpact?: boolean;
      [key: string]: unknown;
    },
    settings: {
      labelSize: number;
      labelFont: string;
      labelWeight: string;
      labelColor: { color?: string; attribute?: string };
    },
  ) {
    const size = settings.labelSize;
    const font = settings.labelFont;
    const weight = settings.labelWeight;

    context.font = `${weight} ${size}px ${font}`;

    // Theme-aware colors
    const bgColor = isDark ? "#1e293b" : "#ffffff";
    const shadowColor = isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.15)";

    // Draw the label background with theme-aware colors
    context.fillStyle = bgColor;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 1;
    context.shadowBlur = 8;
    context.shadowColor = shadowColor;

    const PADDING = 3;

    if (typeof data.label === "string") {
      const citations = typeof data.citations === "number" ? data.citations : 0;
      const citSuffix = citations > 0 ? `  ★ ${citations.toLocaleString()} cit.` : "";
      const fullLabel = `${data.label}${citSuffix}`;
      const textWidth = context.measureText(fullLabel).width;
      const boxWidth = Math.round(textWidth + 8);
      const boxHeight = Math.round(size + 2 * PADDING);
      const radius = Math.max(data.size, size / 2) + PADDING;

      const angleRadian = Math.asin(boxHeight / 2 / radius);
      const xDeltaCoord = Math.sqrt(
        Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2)),
      );

      context.beginPath();
      context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
      context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
      context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
      context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
      context.closePath();
      context.fill();
    } else {
      context.beginPath();
      context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2);
      context.closePath();
      context.fill();
    }

    // Reset shadow
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.shadowBlur = 0;

    // Draw the node label using our theme-aware drawer
    nodeLabelDrawer(context, data, settings);
  };
}
