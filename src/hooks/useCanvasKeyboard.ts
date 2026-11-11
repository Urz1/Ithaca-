"use client";

import { useEffect, useCallback } from "react";
import type { Sigma } from "sigma";
import { ANIMATION, GRAPH } from "@/lib/constants";
import { debug } from "@/lib/debug";

interface UseCanvasKeyboardOptions {
  /** Sigma instance for camera control */
  sigma: Sigma | null;
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Callback when ? is pressed (show help) */
  onShowHelp?: () => void;
  /** Callback when + or = is pressed (zoom in) */
  onZoomIn?: () => void;
  /** Callback when - is pressed (zoom out) */
  onZoomOut?: () => void;
  /** Callback when 0 is pressed (reset view) */
  onResetView?: () => void;
  /** Callback when f is pressed (toggle fullscreen) */
  onToggleFullscreen?: () => void;
  /** Callback when s is pressed (toggle selection mode) */
  onToggleSelection?: () => void;
  /** Callback when c is pressed (toggle chat) */
  onToggleChat?: () => void;
  /** Callback when p is pressed (toggle physics) */
  onTogglePhysics?: () => void;
  /** Callback when e is pressed (open export) */
  onExport?: () => void;
}

/**
 * Hook for canvas keyboard shortcuts
 * Provides consistent keyboard navigation across the graph canvas
 */
export function useCanvasKeyboard({
  sigma,
  enabled = true,
  onEscape,
  onShowHelp,
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleFullscreen,
  onToggleSelection,
  onToggleChat,
  onTogglePhysics,
  onExport,
}: UseCanvasKeyboardOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Prevent default for handled keys
      const handled = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      switch (event.key) {
        // Escape - close panels, deselect
        case "Escape":
          onEscape?.();
          handled();
          break;

        // ? or / - show keyboard shortcuts help
        case "?":
        case "/":
          if (!event.ctrlKey && !event.metaKey) {
            onShowHelp?.();
            handled();
          }
          break;

        // + or = - zoom in
        case "+":
        case "=":
          if (!event.ctrlKey && !event.metaKey) {
            if (onZoomIn) {
              onZoomIn();
            } else if (sigma) {
              const camera = sigma.getCamera();
              camera.animatedZoom({ duration: ANIMATION.CAMERA_DURATION });
            }
            handled();
          }
          break;

        // - - zoom out
        case "-":
          if (!event.ctrlKey && !event.metaKey) {
            if (onZoomOut) {
              onZoomOut();
            } else if (sigma) {
              const camera = sigma.getCamera();
              camera.animatedUnzoom({ duration: ANIMATION.CAMERA_DURATION });
            }
            handled();
          }
          break;

        // 0 - reset view
        case "0":
          if (!event.ctrlKey && !event.metaKey) {
            if (onResetView) {
              onResetView();
            } else if (sigma) {
              sigma
                .getCamera()
                .animatedReset({ duration: ANIMATION.CAMERA_DURATION });
            }
            handled();
          }
          break;

        // f - toggle fullscreen
        case "f":
        case "F":
          if (!event.ctrlKey && !event.metaKey) {
            onToggleFullscreen?.();
            handled();
          }
          break;

        // s - toggle selection mode
        case "s":
        case "S":
          if (!event.ctrlKey && !event.metaKey) {
            onToggleSelection?.();
            handled();
          }
          break;

        // c - toggle chat panel
        case "c":
        case "C":
          if (!event.ctrlKey && !event.metaKey) {
            onToggleChat?.();
            handled();
          }
          break;

        // p - toggle physics simulation
        case "p":
        case "P":
          if (!event.ctrlKey && !event.metaKey) {
            onTogglePhysics?.();
            handled();
          }
          break;

        // e - open export dialog
        case "e":
        case "E":
          if (!event.ctrlKey && !event.metaKey) {
            onExport?.();
            handled();
          }
          break;

        // Arrow keys - pan camera
        case "ArrowUp":
        case "ArrowDown":
        case "ArrowLeft":
        case "ArrowRight":
          if (sigma) {
            const camera = sigma.getCamera();
            const state = camera.getState();
            const panStep = 50 * state.ratio; // Scale with zoom level

            let dx = 0;
            let dy = 0;

            if (event.key === "ArrowUp") dy = -panStep;
            if (event.key === "ArrowDown") dy = panStep;
            if (event.key === "ArrowLeft") dx = -panStep;
            if (event.key === "ArrowRight") dx = panStep;

            camera.animate(
              { x: state.x + dx, y: state.y + dy },
              { duration: 150 },
            );
            handled();
          }
          break;

        default:
          break;
      }
    },
    [
      enabled,
      sigma,
      onEscape,
      onShowHelp,
      onZoomIn,
      onZoomOut,
      onResetView,
      onToggleFullscreen,
      onToggleSelection,
      onToggleChat,
      onTogglePhysics,
      onExport,
    ],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("keydown", handleKeyDown);
    debug.graph("Canvas keyboard navigation enabled");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Keyboard shortcuts configuration
 * Used by the help modal to display available shortcuts
 */
export const KEYBOARD_SHORTCUTS = [
  { key: "?", description: "Show keyboard shortcuts" },
  { key: "Esc", description: "Close panels / Deselect" },
  { key: "+", description: "Zoom in" },
  { key: "-", description: "Zoom out" },
  { key: "0", description: "Reset view" },
  { key: "↑↓←→", description: "Pan camera" },
  { key: "S", description: "Toggle selection mode" },
  { key: "C", description: "Toggle AI chat" },
  { key: "P", description: "Toggle physics" },
  { key: "F", description: "Toggle fullscreen" },
  { key: "E", description: "Open export dialog" },
  { key: "⌘K", description: "Open command bar" },
] as const;
