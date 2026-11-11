"use client";

import { Loader2 } from "lucide-react";

interface CanvasLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

/**
 * A loading overlay that appears over the canvas during data fetching operations.
 * Uses a subtle backdrop to maintain context while indicating loading state.
 */
export function CanvasLoadingOverlay({
  isLoading,
  message = "Loading graph data...",
}: CanvasLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="bg-background/50 absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-card/95 border-border flex flex-col items-center gap-3 rounded-lg border p-6 shadow-lg">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder for the canvas while initial data is loading.
 * Shows a pulsing effect to indicate activity.
 */
export function CanvasSkeleton() {
  return (
    <div className="bg-background absolute inset-0 flex items-center justify-center">
      {/* Animated dot pattern to suggest graph nodes */}
      <div className="relative h-full w-full overflow-hidden">
        {/* Central cluster */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Central node */}
            <div className="bg-primary/30 absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full" />

            {/* Surrounding nodes */}
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60 * Math.PI) / 180;
              const radius = 60;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <div
                  key={i}
                  className="bg-muted-foreground/20 absolute h-3 w-3 animate-pulse rounded-full"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)",
                    animationDelay: `${i * 100}ms`,
                  }}
                />
              );
            })}

            {/* Connection lines */}
            <svg
              className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 opacity-20"
              viewBox="-80 -80 160 160"
            >
              {[...Array(6)].map((_, i) => {
                const angle = (i * 60 * Math.PI) / 180;
                const x = Math.cos(angle) * 60;
                const y = Math.sin(angle) * 60;

                return (
                  <line
                    key={i}
                    x1="0"
                    y1="0"
                    x2={x}
                    y2={y}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-muted-foreground"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Loading text */}
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          <p className="text-muted-foreground text-sm">
            Initializing visualization...
          </p>
        </div>
      </div>
    </div>
  );
}
