/**
 * useEdgeFlowAnimation Hook
 *
 * Manages flowing edge animation for hovered/selected edges in the Sigma graph.
 * Uses requestAnimationFrame for smooth GPU-accelerated animation.
 *
 * Features:
 * - Only animates edges when hovered (performance-efficient)
 * - Respects prefers-reduced-motion accessibility setting
 * - Smooth animation from citing → cited paper
 * - Different patterns for support vs contradict edges
 */

import { useEffect, useRef } from "react";
import { useSigma } from "@react-sigma/core";
import { GRAPH } from "@/lib/constants";

interface EdgeFlowAnimationOptions {
  /** Whether animation is enabled */
  enabled?: boolean;
  /** Set of edges currently hovered/selected */
  hoveredEdges?: Set<string>;
}

export function useEdgeFlowAnimation(options: EdgeFlowAnimationOptions = {}) {
  const sigma = useSigma();
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const reducedMotionRef = useRef<boolean>(false);

  const { enabled = true, hoveredEdges = new Set() } = options;

  useEffect(() => {
    // Check for prefers-reduced-motion
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      reducedMotionRef.current = mediaQuery.matches;

      const handleChange = (e: MediaQueryListEvent) => {
        reducedMotionRef.current = e.matches;
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  useEffect(() => {
    if (!enabled || reducedMotionRef.current || hoveredEdges.size === 0) {
      // Cancel any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const graph = sigma.getGraph();

    // Store base sizes when animation starts
    const baseSizes = new Map<string, number>();
    hoveredEdges.forEach((edgeId) => {
      if (graph.hasEdge(edgeId)) {
        const attrs = graph.getEdgeAttributes(edgeId);
        // Store current size (already set by hover effect)
        baseSizes.set(edgeId, attrs.size || GRAPH.DEFAULT_EDGE_SIZE);
      }
    });

    // Animation loop
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = (currentTime - startTimeRef.current) / 1000; // seconds

      // Update edge attributes for flowing effect
      // This creates a subtle pulsing/glowing effect on hovered edges
      hoveredEdges.forEach((edgeId) => {
        try {
          if (!graph.hasEdge(edgeId)) return;

          const attrs = graph.getEdgeAttributes(edgeId);
          const edgeType = attrs.type || "default";

          // Calculate animation phase (0 to 1)
          const speed =
            edgeType === "contradicts"
              ? GRAPH.EDGE_FLOW.SPEED_CONTRADICT
              : GRAPH.EDGE_FLOW.SPEED_HOVER;

          const phase = ((elapsed * 1000) / speed) % 1;

          // Create pulsing effect by modulating size
          // For contradict edges: sharper pulses
          // For support edges: smooth sine wave
          let intensity: number;
          if (edgeType === "contradicts") {
            // Square wave pulse for contradicts (on/off effect)
            intensity = phase < 0.5 ? 1.0 : 0.7;
          } else {
            // Smooth sine wave for supports
            intensity = 0.85 + 0.15 * Math.sin(phase * Math.PI * 2);
          }

          // Apply intensity to base size (set by hover effect)
          const baseSize =
            baseSizes.get(edgeId) || attrs.size || GRAPH.DEFAULT_EDGE_SIZE;

          graph.setEdgeAttribute(edgeId, "size", baseSize * intensity);
        } catch (error) {
          // Edge might have been removed, ignore
          console.debug("Edge animation error:", error);
        }
      });

      // Request next frame
      sigma.refresh();
      animationRef.current = requestAnimationFrame(animate);
    };

    // Reset start time when hovered edges change
    startTimeRef.current = Date.now();

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Restore base sizes when animation stops
      baseSizes.forEach((size, edgeId) => {
        if (graph.hasEdge(edgeId)) {
          graph.setEdgeAttribute(edgeId, "size", size);
        }
      });
    };
  }, [enabled, hoveredEdges, sigma]);

  return {
    isAnimating: animationRef.current !== null && !reducedMotionRef.current,
  };
}
