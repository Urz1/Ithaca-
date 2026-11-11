"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Search,
  Flame,
  Filter,
  GitFork,
  Keyboard,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TutorialStep } from "@/hooks/useTutorial";
import { getTutorialTarget } from "@/hooks/useTutorial";

interface TutorialOverlayProps {
  /** Whether the tutorial is active */
  isActive: boolean;
  /** Current step to display */
  step: TutorialStep | null;
  /** Current step index */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Progress percentage */
  progress: number;
  /** Whether this is the last step */
  isLastStep: boolean;
  /** Whether to show skip button */
  showSkip?: boolean;
  /** Whether to show progress */
  showProgress?: boolean;
  /** Go to next step */
  onNext: () => void;
  /** Go to previous step */
  onPrevious: () => void;
  /** Skip/close the tutorial */
  onSkip: () => void;
}

interface TooltipPosition {
  top?: number | string;
  left?: number | string;
  bottom?: number | string;
  right?: number | string;
  arrowPlacement?: "top" | "bottom" | "left" | "right";
  transform?: string;
}

/**
 * Interactive Live Walkthrough & Spotlight Overlay
 */
export function TutorialOverlay({
  isActive,
  step,
  stepIndex,
  totalSteps,
  progress,
  isLastStep,
  showSkip = true,
  showProgress = true,
  onNext,
  onPrevious,
  onSkip,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({});
  const [actionTriggered, setActionTriggered] = useState(false);
  const isMobile = useIsMobile();

  // Reset action trigger status when step changes
  useEffect(() => {
    setActionTriggered(false);
  }, [step?.id]);

  // Find and track target element
  useEffect(() => {
    if (!isActive || !step) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const target = getTutorialTarget(step.target);
      if (target) {
        // Smoothly scroll target into view if needed
        try {
          target.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
          });
        } catch {
          // Ignore unsupported scroll options
        }
        setTargetRect(target.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateTargetRect();

    // Re-check after brief delay in case DOM is still animating or mounting
    const timer = setTimeout(updateTargetRect, 200);

    const handleUpdate = () => requestAnimationFrame(updateTargetRect);
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isActive, step]);

  // Calculate high-precision tooltip position relative to target element
  useEffect(() => {
    if (!isActive || !step) return;

    if (isMobile) {
      setTooltipPos({
        bottom: 24,
        left: 16,
        transform: "none",
        arrowPlacement: "bottom",
      });
      return;
    }

    if (!targetRect || step.position === "center") {
      setTooltipPos({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const tooltipWidth = 400;
    const estimatedHeight = 440;
    const margin = 16;
    const padding = step.spotlightPadding || 8;

    const targetCenterY = targetRect.top + targetRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const windowH = window.innerHeight;
    const windowW = window.innerWidth;

    let computed: TooltipPosition = {};

    // Smart auto-orientation based on target position on screen
    if (step.position === "top" || (!step.position && targetCenterY > windowH / 2)) {
      // Place above target
      const idealTop = targetRect.top - padding - estimatedHeight - 12;
      computed = {
        top: Math.max(margin, Math.min(idealTop, windowH - estimatedHeight - margin)),
        left: Math.max(margin, Math.min(targetCenterX - tooltipWidth / 2, windowW - tooltipWidth - margin)),
        arrowPlacement: "bottom",
      };
    } else if (step.position === "bottom" || (!step.position && targetCenterY <= windowH / 2)) {
      // Place below target
      computed = {
        top: Math.max(margin, Math.min(windowH - estimatedHeight - margin, targetRect.bottom + padding + 12)),
        left: Math.max(margin, Math.min(targetCenterX - tooltipWidth / 2, windowW - tooltipWidth - margin)),
        arrowPlacement: "top",
      };
    } else if (step.position === "left") {
      computed = {
        top: Math.max(margin, Math.min(targetCenterY - estimatedHeight / 2, windowH - estimatedHeight - margin)),
        left: Math.max(margin, targetRect.left - padding - tooltipWidth - margin),
        arrowPlacement: "right",
      };
    } else if (step.position === "right") {
      computed = {
        top: Math.max(margin, Math.min(targetCenterY - estimatedHeight / 2, windowH - estimatedHeight - margin)),
        left: Math.min(windowW - tooltipWidth - margin, targetRect.right + padding + margin),
        arrowPlacement: "left",
      };
    }

    setTooltipPos(computed);
  }, [isActive, step, targetRect, isMobile]);

  const handleNext = useCallback(() => {
    window.dispatchEvent(new Event("close-command-bar"));
    onNext();
  }, [onNext]);

  const handlePrevious = useCallback(() => {
    window.dispatchEvent(new Event("close-command-bar"));
    onPrevious();
  }, [onPrevious]);

  const handleSkip = useCallback(() => {
    window.dispatchEvent(new Event("close-command-bar"));
    onSkip();
  }, [onSkip]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const dialogOpen = document.querySelector("[role='dialog']");
        if (dialogOpen) {
          // Dialog is open: let the dialog dismiss itself without closing the walkthrough
          return;
        }
        handleSkip();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft" && stepIndex > 0) {
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, stepIndex, handleNext, handlePrevious, handleSkip]);

  // Execute interactive action live on the site
  const handleTriggerAction = useCallback(() => {
    if (!step?.interactiveAction) return;
    const { eventId, eventDetail } = step.interactiveAction;

    if (eventId === "open-command-bar") {
      window.dispatchEvent(new Event("open-command-bar"));
    } else {
      window.dispatchEvent(
        new CustomEvent(eventId, {
          detail: eventDetail || {},
        }),
      );
    }

    setActionTriggered(true);
  }, [step]);

  if (!isActive || !step) return null;

  const spotlightPadding = step.spotlightPadding || 8;
  const targetX = targetRect ? Math.max(0, targetRect.left - spotlightPadding) : 0;
  const targetY = targetRect ? Math.max(0, targetRect.top - spotlightPadding) : 0;
  const targetW = targetRect ? targetRect.width + spotlightPadding * 2 : 0;
  const targetH = targetRect ? targetRect.height + spotlightPadding * 2 : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9990] overflow-hidden">
        {/* Full Viewport SVG Cutout Mask */}
        <svg
          className="fixed inset-0 h-full w-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="ithaca-tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetX}
                  y={targetY}
                  width={targetW}
                  height={targetH}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(3, 7, 18, 0.72)"
            mask="url(#ithaca-tour-mask)"
            className="backdrop-blur-[2px]"
          />
        </svg>

        {/* Highlighted Area Mark & Neon Reticle */}
        {targetRect && (
          <div
            className="pointer-events-none fixed z-[9995] transition-all duration-300 ease-out"
            style={{
              top: targetY,
              left: targetX,
              width: targetW,
              height: targetH,
            }}
          >
            {/* Luminous Pulsing Border Ring */}
            <div className="absolute -inset-1 rounded-2xl border-2 border-primary/90 shadow-[0_0_35px_rgba(139,92,246,0.45)] ring-4 ring-primary/25 animate-pulse" />

            {/* Corner Focus Brackets */}
            <div className="absolute -top-1 -left-1 size-3.5 border-t-2 border-l-2 border-white" />
            <div className="absolute -top-1 -right-1 size-3.5 border-t-2 border-r-2 border-white" />
            <div className="absolute -bottom-1 -left-1 size-3.5 border-b-2 border-l-2 border-white" />
            <div className="absolute -bottom-1 -right-1 size-3.5 border-b-2 border-r-2 border-white" />

            {/* Floating Area Mark Beacon */}
            <div className="absolute -top-3.5 left-3 flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary px-2.5 py-0.5 text-[10px] font-black tracking-widest text-primary-foreground shadow-lg uppercase">
              <span className="size-1.5 rounded-full bg-white animate-ping" />
              AREA MARK: {step.category || "ACTIVE CONTROL"}
            </div>

            {/* Click-through transparent zone for live user interaction */}
            <div
              className="pointer-events-auto h-full w-full cursor-pointer rounded-xl"
              title="Click directly to interact with this control"
            />
          </div>
        )}

        {/* Walkthrough Guide Card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={tooltipPos}
          className={cn(
            "fixed z-[10000] w-full max-w-[calc(100vw-32px)] md:w-[400px]",
            "max-h-[calc(100vh-32px)] overflow-y-auto",
            "rounded-2xl border border-primary/30 bg-card/95 p-6 shadow-2xl backdrop-blur-xl",
            "ring-1 ring-border/80 text-foreground",
          )}
        >
          {/* Category & Step Header */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-primary uppercase">
                <Sparkles className="size-3" />
                {step.category || "TOUR GUIDE"}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Step {stepIndex + 1} of {totalSteps}
              </span>
            </div>

            {showSkip && (
              <button
                onClick={handleSkip}
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Skip walkthrough"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Step Title */}
          <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground">
            {step.title}
          </h3>

          {/* Conversational Walking Description */}
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>

          {/* Live Interactive Action Bar */}
          {step.interactiveAction && (
            <div className="mb-5 rounded-xl border border-primary/25 bg-primary/5 p-3.5 transition-all">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 fill-primary" />
                  INTERACTIVE ACTION
                </span>
                {actionTriggered && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                    <CheckCircle2 className="size-3.5" />
                    Triggered Live!
                  </span>
                )}
              </div>

              <Button
                size="sm"
                className={cn(
                  "w-full justify-between font-bold shadow-md transition-all",
                  actionTriggered
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground",
                )}
                onClick={handleTriggerAction}
              >
                <span className="truncate pr-2">
                  {step.interactiveAction.label}
                </span>
                <span className="shrink-0 text-xs font-semibold opacity-90">
                  {actionTriggered ? "Re-trigger ↺" : "Try Live ➜"}
                </span>
              </Button>
              {step.interactiveAction.description && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {step.interactiveAction.description}
                </p>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {showProgress && (
            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary via-indigo-500 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleSkip}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  className="gap-1 border-border/80 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="gap-1 px-4 text-xs font-bold"
              >
                {isLastStep ? "Finish Tour" : "Next Area"}
                {!isLastStep && <ChevronRight className="size-3.5" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Tutorial Start / Restart Button
 */
export function TutorialStartButton({
  onClick,
  onRestart,
  hasSeenTutorial,
}: {
  onClick: () => void;
  onRestart?: () => void;
  hasSeenTutorial: boolean;
}) {
  const handleClick = () => {
    if (hasSeenTutorial && onRestart) {
      onRestart();
    }
    onClick();
  };

  if (!hasSeenTutorial) {
    return (
      <motion.button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2",
          "bg-primary text-primary-foreground",
          "rounded-lg shadow-lg",
          "text-sm font-medium",
          "hover:bg-primary/90 transition-colors",
        )}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.3 }}
      >
        <Sparkles className="h-4 w-4" />
        Interactive Tour
      </motion.button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center",
        "bg-card/90 border-border border backdrop-blur-sm",
        "rounded-lg shadow-lg",
        "hover:bg-muted transition-colors",
        "group",
      )}
      title="Restart interactive tour"
      aria-label="Restart interactive tour"
    >
      <Sparkles className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors" />
    </button>
  );
}
