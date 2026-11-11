/**
 * Contained Panel Component
 *
 * A slide-over panel that stays WITHIN its parent container,
 * rather than using fixed positioning on the viewport.
 * Used for canvas overlays that shouldn't overlap the chat panel.
 */

"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// CONTAINED PANEL
// =============================================================================

interface ContainedPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
  title?: string;
  description?: string;
  /** Control backdrop intensity: true (default), "light", or false */
  backdrop?: boolean | "light";
  /** Allow drag-to-resize (bottom panels only) */
  resizable?: boolean;
}

export function ContainedPanel({
  open,
  onOpenChange,
  children,
  side = "right",
  className,
  backdrop = true,
  resizable = false,
}: ContainedPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [dragHeight, setDragHeight] = React.useState<number | null>(null);
  const isDragging = React.useRef(false);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  // Drag-to-resize for bottom panels
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (!resizable || side !== "bottom") return;
      e.preventDefault();
      isDragging.current = true;

      const parentEl = panelRef.current?.parentElement;
      if (!parentEl) return;
      const parentRect = parentEl.getBoundingClientRect();

      const onPointerMove = (ev: PointerEvent) => {
        if (!isDragging.current) return;
        const newHeight = parentRect.bottom - ev.clientY;
        const minH = 140;
        const maxH = parentRect.height * 0.85;
        setDragHeight(Math.min(maxH, Math.max(minH, newHeight)));
      };

      const onPointerUp = () => {
        isDragging.current = false;
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [resizable, side],
  );

  if (!open) return null;

  const backdropClass =
    backdrop === true
      ? "bg-black/30 backdrop-blur-[2px]"
      : backdrop === "light"
        ? "bg-black/10"
        : "bg-transparent pointer-events-none";

  return (
    <>
      {/* Backdrop - contained within parent */}
      {backdrop !== false && (
        <div
          className={cn(
            "animate-in fade-in-0 absolute inset-0 z-40 duration-200",
            backdropClass,
          )}
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "bg-background absolute z-50 flex flex-col shadow-2xl",
          "animate-in duration-300 ease-out",
          side === "right" &&
            "slide-in-from-right inset-y-0 right-0 w-full max-w-xl border-l",
          side === "left" &&
            "slide-in-from-left inset-y-0 left-0 w-full max-w-xl border-r",
          side === "bottom" &&
            "slide-in-from-bottom inset-x-0 bottom-0 border-t",
          // Only apply className height when not actively dragging
          side === "bottom" && !dragHeight && "h-[60%]",
          className,
        )}
        style={
          side === "bottom" && dragHeight ? { height: dragHeight } : undefined
        }
      >
        {/* Drag Handle — functional when resizable */}
        {side === "bottom" && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center py-2",
              resizable &&
                "hover:bg-muted/50 cursor-ns-resize transition-colors select-none",
            )}
            onPointerDown={resizable ? handlePointerDown : undefined}
          >
            <div className="bg-muted-foreground/30 h-1.5 w-12 rounded-full" />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {children}
      </div>
    </>
  );
}

// =============================================================================
// CONTAINED PANEL HEADER
// =============================================================================

interface ContainedPanelHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ContainedPanelHeader({
  children,
  className,
}: ContainedPanelHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 p-6 pb-4", className)}>
      {children}
    </div>
  );
}

// =============================================================================
// CONTAINED PANEL TITLE
// =============================================================================

interface ContainedPanelTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function ContainedPanelTitle({
  children,
  className,
}: ContainedPanelTitleProps) {
  return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>;
}

// =============================================================================
// CONTAINED PANEL DESCRIPTION
// =============================================================================

interface ContainedPanelDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function ContainedPanelDescription({
  children,
  className,
}: ContainedPanelDescriptionProps) {
  return (
    <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>
  );
}

// =============================================================================
// CONTAINED PANEL CONTENT
// =============================================================================

interface ContainedPanelContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ContainedPanelContent({
  children,
  className,
}: ContainedPanelContentProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-6 pt-0", className)}>
      {children}
    </div>
  );
}

// =============================================================================
// CONTAINED PANEL FOOTER
// =============================================================================

interface ContainedPanelFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ContainedPanelFooter({
  children,
  className,
}: ContainedPanelFooterProps) {
  return (
    <div
      className={cn("mt-auto flex justify-end gap-2 border-t p-4", className)}
    >
      {children}
    </div>
  );
}
