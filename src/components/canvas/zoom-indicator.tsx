"use client";

import { useSigma, useCamera } from "@react-sigma/core";
import { useEffect, useState, useCallback } from "react";
import { Minus, Plus, Crosshair } from "lucide-react";

interface ZoomIndicatorProps {
  embedded?: boolean;
  className?: string;
}

export function ZoomIndicator({ embedded = false, className }: ZoomIndicatorProps) {
  const sigma = useSigma();
  const { gotoNode, reset } = useCamera();
  const [zoomLevel, setZoomLevel] = useState(100);

  // Track zoom level changes
  useEffect(() => {
    const camera = sigma.getCamera();

    const updateZoom = () => {
      // Camera ratio is inverse of zoom (smaller = more zoomed in)
      const ratio = camera.ratio;
      const percent = Math.round((1 / ratio) * 100);
      setZoomLevel(Math.min(600, Math.max(10, percent)));
    };

    // Initial update
    updateZoom();

    // Listen for camera updates
    camera.on("updated", updateZoom);

    return () => {
      camera.off("updated", updateZoom);
    };
  }, [sigma]);

  const handleZoomIn = useCallback(() => {
    const camera = sigma.getCamera();
    camera.animatedZoom({ duration: 200 });
  }, [sigma]);

  const handleZoomOut = useCallback(() => {
    const camera = sigma.getCamera();
    camera.animatedUnzoom({ duration: 200 });
  }, [sigma]);

  const handleReset = useCallback(() => {
    const camera = sigma.getCamera();
    camera.animate({ ratio: 1, x: 0.5, y: 0.5 }, { duration: 300 });
  }, [sigma]);

  // Determine zoom "zone" for display styling
  const getZoomZone = () => {
    if (zoomLevel <= 150) return "linear";
    if (zoomLevel <= 600) return "logarithmic";
    return "micro";
  };

  const zone = getZoomZone();

  if (embedded) {
    return (
      <div className={`flex items-center gap-1 ${className || ""}`}>
        <button
          onClick={handleZoomOut}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          title="Zoom Out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <span className="text-foreground font-mono text-[11px] font-medium min-w-[38px] text-center">
          {zoomLevel}%
        </span>

        <button
          onClick={handleZoomIn}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          title="Zoom In"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={handleReset}
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          title="Reset View"
        >
          <Crosshair className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-card/90 border-border absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border p-1.5 shadow-2xl backdrop-blur ${className || ""}`}>
      {/* Zoom Out */}
      <button
        onClick={handleZoomOut}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        title="Zoom Out"
      >
        <Minus className="h-4 w-4" />
      </button>

      {/* Zoom Level Display */}
      <div className="min-w-[60px] px-3 text-center">
        <span className="text-foreground font-mono text-xs font-medium">
          {zoomLevel}%
        </span>
        {zone !== "linear" && (
          <span className="text-muted-foreground block text-[9px] uppercase">
            {zone}
          </span>
        )}
      </div>

      {/* Zoom In */}
      <button
        onClick={handleZoomIn}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        title="Zoom In"
      >
        <Plus className="h-4 w-4" />
      </button>

      {/* Divider */}
      <div className="bg-border mx-1 h-4 w-px" />

      {/* Reset/Center */}
      <button
        onClick={handleReset}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        title="Reset View"
      >
        <Crosshair className="h-4 w-4" />
      </button>
    </div>
  );
}
