"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// OVERLAY ZONE TYPES
// =============================================================================

export type OverlayZone =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface OverlaySlot {
  zone: OverlayZone;
  children: ReactNode;
  className?: string;
}

// =============================================================================
// ZONE POSITIONS
// =============================================================================

const ZONE_POSITIONS: Record<OverlayZone, string> = {
  "top-left": "absolute top-4 left-4 z-30",
  "top-center": "absolute top-3.5 left-0 right-0 px-4 pointer-events-none z-30",
  "top-right": "absolute top-4 right-4 z-30",
  "bottom-left": "absolute bottom-16 left-4 z-30",
  "bottom-center": "absolute bottom-3.5 left-0 right-0 px-4 pointer-events-none z-30",
  "bottom-right": "absolute bottom-16 right-4 z-30",
};

const ZONE_DEFAULTS: Record<OverlayZone, string> = {
  "top-left": "flex flex-col gap-3",
  "top-center": "flex flex-col items-center gap-2",
  "top-right": "flex flex-row items-start gap-3",
  "bottom-left": "",
  "bottom-center": "flex flex-col items-center gap-2",
  "bottom-right": "",
};

// =============================================================================
// OVERLAY SLOT COMPONENT
// =============================================================================

interface OverlaySlotProps {
  zone: OverlayZone;
  children: ReactNode;
  className?: string;
}

/**
 * Individual overlay slot that positions content in a specific zone.
 */
export function OverlaySlot({ zone, children, className }: OverlaySlotProps) {
  return (
    <div
      className={cn(
        ZONE_POSITIONS[zone],
        ZONE_DEFAULTS[zone],
        "pointer-events-auto",
        "canvas-zone",
        `canvas-zone--${zone}`,
        className,
      )}
      data-zone={zone}
    >
      {children}
    </div>
  );
}

// =============================================================================
// OVERLAY MANAGER COMPONENT
// =============================================================================

interface OverlayManagerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Overlay manager that contains and coordinates all overlay zones.
 * Provides consistent positioning and styling for canvas overlays.
 *
 * Usage:
 * ```tsx
 * <OverlayManager>
 *   <OverlaySlot zone="top-left">
 *     <Filters />
 *   </OverlaySlot>
 *   <OverlaySlot zone="bottom-right">
 *     <ShareButton />
 *   </OverlaySlot>
 * </OverlayManager>
 * ```
 */
export function OverlayManager({ children, className }: OverlayManagerProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 z-10", className)}>
      {children}
    </div>
  );
}

// =============================================================================
// CONVENIENCE COMPONENTS (Pre-styled slots for common patterns)
// =============================================================================

interface ZoneProps {
  children: ReactNode;
  className?: string;
}

/**
 * Top-left zone - typically for filters and controls
 */
export function TopLeftZone({ children, className }: ZoneProps) {
  return (
    <OverlaySlot zone="top-left" className={className}>
      {children}
    </OverlaySlot>
  );
}

/**
 * Top-right zone - typically for action buttons (alongside Sigma controls)
 * Has right-24 offset to avoid overlapping with Sigma's zoom controls
 */
export function TopRightZone({ children, className }: ZoneProps) {
  return (
    <OverlaySlot zone="top-right" className={className}>
      {children}
    </OverlaySlot>
  );
}

/**
 * Top-center zone - typically for alerts or focus mode indicators
 */
export function TopCenterZone({ children, className }: ZoneProps) {
  return (
    <OverlaySlot zone="top-center" className={className}>
      {children}
    </OverlaySlot>
  );
}

/**
 * Bottom-left zone - typically for legend and help
 */
export function BottomLeftZone({ children, className }: ZoneProps) {
  return (
    <OverlaySlot zone="bottom-left" className={className}>
      {children}
    </OverlaySlot>
  );
}

/**
 * Bottom-center zone - typically for selection panel and toasts
 */
export function BottomCenterZone({ children, className }: ZoneProps) {
  return (
    <OverlaySlot zone="bottom-center" className={className}>
      {children}
    </OverlaySlot>
  );
}

/**
 * Bottom-right zone - typically for share/export
 */
export function BottomRightZone({ children, className }: ZoneProps) {
  return (
    <OverlaySlot zone="bottom-right" className={className}>
      {children}
    </OverlaySlot>
  );
}
