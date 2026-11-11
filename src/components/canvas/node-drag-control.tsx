"use client";

import { useEffect, useRef } from "react";
import { useSigma, useRegisterEvents } from "@react-sigma/core";

/**
 * NodeDragControl - Enables dragging nodes to reposition them
 * Uses Sigma's native event system for smooth drag performance
 */
export function NodeDragControl() {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const draggedNodeRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    registerEvents({
      downNode: (event) => {
        draggedNodeRef.current = event.node;
        isDraggingRef.current = true;

        // Prevent camera movement while dragging
        sigma.getCamera().disable();
      },

      // Sigma v3 mousemovebody event provides coordinates directly
      mousemovebody: (event) => {
        if (!draggedNodeRef.current || !isDraggingRef.current) return;

        const graph = sigma.getGraph();

        // Get mouse position from the event (Sigma provides x, y directly)
        const pos = sigma.viewportToGraph(event);

        // Update node position
        graph.setNodeAttribute(draggedNodeRef.current, "x", pos.x);
        graph.setNodeAttribute(draggedNodeRef.current, "y", pos.y);

        // Prevent default to avoid selection
        event.preventSigmaDefault?.();
        event.original?.preventDefault?.();
      },

      mouseup: () => {
        if (draggedNodeRef.current) {
          draggedNodeRef.current = null;
          isDraggingRef.current = false;

          // Re-enable camera
          sigma.getCamera().enable();
        }
      },

      // Also handle leaving the canvas
      leaveStage: () => {
        if (draggedNodeRef.current) {
          draggedNodeRef.current = null;
          isDraggingRef.current = false;
          sigma.getCamera().enable();
        }
      },
    });

    // Cleanup
    return () => {
      sigma.getCamera().enable();
    };
  }, [sigma, registerEvents]);

  return null; // This component doesn't render anything
}
