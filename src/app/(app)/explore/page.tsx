"use client";

import dynamic from "next/dynamic";
import { CanvasProvider } from "@/contexts/canvas-context";
import { AppErrorBoundary } from "@/components/error-boundary";

// Dynamically import the canvas component with SSR disabled
// This is required because Sigma.js uses WebGL which doesn't exist on the server
const ExploreCanvas = dynamic(
  () =>
    import("@/components/canvas/explore-canvas").then(
      (mod) => mod.ExploreCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        Loading canvas...
      </div>
    ),
  },
);

export default function ExplorePage() {
  return (
    <AppErrorBoundary
      fallbackTitle="Graph Explorer Error"
      fallbackMessage="The graph renderer encountered an error. This can happen with very large graphs or WebGL issues. Try refreshing."
    >
      <CanvasProvider>
        <div className="relative h-full w-full">
          <ExploreCanvas />
        </div>
      </CanvasProvider>
    </AppErrorBoundary>
  );
}
