"use client";

import { useState, useCallback, useEffect } from "react";
import { debug } from "@/lib/debug";

/**
 * Tutorial step definition with interactive capabilities
 */
export interface TutorialStep {
  /** Unique identifier for the step */
  id: string;
  /** Category badge displayed at top of card */
  category?: string;
  /** Title displayed in the tooltip */
  title: string;
  /** Conversational walkthrough instructions */
  description: string;
  /** Target selector or key */
  target?: string | "canvas" | "search" | "curated-debates" | "battlefield-mode" | "relationship-filters" | "ai-chat" | "selection-mode" | "zoom-controls";
  /** Position of the tooltip relative to target */
  position?: "top" | "bottom" | "left" | "right" | "center";
  /** Optional action that triggers auto-advance */
  advanceOn?: "click" | "next" | "auto";
  /** Delay before auto-advance (if advanceOn is "auto") */
  autoAdvanceDelay?: number;
  /** Whether to highlight the entire canvas */
  highlightCanvas?: boolean;
  /** Custom spotlight dimensions (optional) */
  spotlightPadding?: number;
  /** Live interactive action button displayed inside card */
  interactiveAction?: {
    label: string;
    description?: string;
    icon?: string;
    eventId: string;
    eventDetail?: Record<string, unknown>;
  };
}

/**
 * Tutorial configuration
 */
export interface TutorialConfig {
  /** Unique identifier for this tutorial */
  id: string;
  /** Display name of the tutorial */
  name: string;
  /** Steps in the tutorial */
  steps: TutorialStep[];
  /** Whether to show skip button */
  showSkip?: boolean;
  /** Whether to show progress indicator */
  showProgress?: boolean;
  /** Callback when tutorial completes */
  onComplete?: () => void;
}

/**
 * Default interactive canvas exploration tutorial
 */
export const CANVAS_TUTORIAL: TutorialConfig = {
  id: "canvas-exploration",
  name: "Interactive Dialectic Tour",
  showSkip: true,
  showProgress: true,
  steps: [
    {
      id: "search",
      category: "COMMAND DECK",
      title: "Universal Literature Search",
      description:
        "Look up here: This is your command deck. Press ⌘K anywhere to search over 250 million papers, map author citation trees, or paste a DOI directly.",
      target: "search",
      position: "bottom",
      spotlightPadding: 8,
      advanceOn: "next",
      interactiveAction: {
        label: "Open Command Palette (⌘K)",
        description: "Opens instant keyboard search",
        icon: "Search",
        eventId: "open-command-bar",
      },
    },
    {
      id: "curated-debates",
      category: "DIALECTIC STARTERS",
      title: "1-Click Debate Topologies",
      description:
        "Notice these starter debate crucibles. Each card maps an active scientific controversy with live dispute intensity metrics—so you can inspect debate topologies with zero setup.",
      target: "curated-debates",
      position: "top",
      spotlightPadding: 12,
      advanceOn: "next",
      interactiveAction: {
        label: "⚡ Load 'Transformer Attention' Debate",
        description: "Loads live 42-node debate network into WebGL physics",
        icon: "Sparkles",
        eventId: "ithaca-tour-load-debate",
        eventDetail: { topic: "How do transformers handle long context?" },
      },
    },
    {
      id: "battlefield",
      category: "CRUCIBLE FILTER",
      title: "Battlefield Mode",
      description:
        "This is Ithaca's signature crucible. Battlefield Mode cuts through hundreds of neutral citations to isolate only the papers actively refuting, challenging, and contradicting each other.",
      target: "battlefield-mode",
      position: "top",
      spotlightPadding: 8,
      advanceOn: "next",
      interactiveAction: {
        label: "⚔️ Toggle Battlefield Crucible",
        description: "Filters out upstream noise to focus on clashes",
        icon: "Flame",
        eventId: "ithaca-tour-set-perspective",
        eventDetail: { perspective: "battlefield" },
      },
    },
    {
      id: "epistemic-spectrum",
      category: "TRI-PARTITE MODEL",
      title: "The Epistemic Stance Spectrum",
      description:
        "Down here is your dialectic spectrum. Every edge is classified into our Tri-Partite Model: Green confirms findings, Red refutes methodology, and Purple extends the theory.",
      target: "relationship-filters",
      position: "top",
      spotlightPadding: 8,
      advanceOn: "next",
      interactiveAction: {
        label: "🔴 Isolate Direct Refutations",
        description: "Filters graph to show only contradictions",
        icon: "Filter",
        eventId: "ithaca-tour-set-focus",
        eventDetail: { focus: "contradicts" },
      },
    },
    {
      id: "ai-assistant",
      category: "AI REASONING",
      title: "Grounded AI Literature Assistant",
      description:
        "Over here on your right dock: The AI Assistant is grounded directly in the active graph's citation network. Ask it to synthesize disputes, contrast methodology, or find consensus gaps.",
      target: "ai-chat",
      position: "left",
      spotlightPadding: 8,
      advanceOn: "next",
      interactiveAction: {
        label: "💬 Open AI Literature Assistant",
        description: "Slides out dialectic synthesis drawer",
        icon: "Sparkles",
        eventId: "ithaca-tour-toggle-chat",
      },
    },
    {
      id: "selection-mode",
      category: "MULTI-PAPER COMPARISON",
      title: "Selection & Conflict Paths",
      description:
        "Click Select Nodes or press 'S' to lasso and compare multiple papers. Calculate conflict paths, export subgraphs, or inspect shared methodological citations.",
      target: "selection-mode",
      position: "left",
      spotlightPadding: 8,
      advanceOn: "next",
      interactiveAction: {
        label: "🎯 Toggle Selection Mode (S)",
        description: "Enables multi-node selection & pathfinding",
        icon: "GitFork",
        eventId: "ithaca-tour-toggle-selection",
      },
    },
    {
      id: "navigation-controls",
      category: "WEBGL ENGINE",
      title: "Navigation & Keyboard Controls",
      description:
        "You're in command! Drag to pan, scroll to zoom, and click any paper node to open its passage-level evidence quotes. Press '?' at any time for keyboard shortcuts.",
      target: "zoom-controls",
      position: "top",
      spotlightPadding: 8,
      advanceOn: "next",
      interactiveAction: {
        label: "⌨️ View Keyboard Shortcuts (?)",
        description: "Displays complete shortcuts cheat-sheet",
        icon: "Keyboard",
        eventId: "ithaca-tour-open-shortcuts",
      },
    },
  ],
};

/**
 * Storage key for tutorial completion state
 */
const TUTORIAL_STORAGE_KEY = "ithaca_tutorials_completed";

/**
 * Hook for managing tutorial state
 */
export function useTutorial(config: TutorialConfig) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  // Check if user has already completed this tutorial
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (storedData) {
        const completed = JSON.parse(storedData) as string[];
        if (completed.includes(config.id)) {
          setHasSeenTutorial(true);
        }
      }
    } catch (e) {
      debug.error("Failed to check tutorial state:", e);
    }
  }, [config.id]);

  const currentStep = config.steps[currentStepIndex] || null;
  const isLastStep = currentStepIndex === config.steps.length - 1;
  const progress =
    config.steps.length > 0
      ? ((currentStepIndex + 1) / config.steps.length) * 100
      : 0;

  const start = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
    debug.log("Tutorial started:", config.id);
  }, [config.id]);

  const next = useCallback(() => {
    if (isLastStep) {
      complete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [isLastStep]);

  const previous = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < config.steps.length) {
        setCurrentStepIndex(index);
      }
    },
    [config.steps.length],
  );

  const skip = useCallback(() => {
    setIsActive(false);
    debug.log("Tutorial skipped:", config.id);
  }, [config.id]);

  const complete = useCallback(() => {
    setIsActive(false);
    setHasSeenTutorial(true);

    try {
      const storedData = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      const completed = storedData ? (JSON.parse(storedData) as string[]) : [];
      if (!completed.includes(config.id)) {
        completed.push(config.id);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(completed));
      }
    } catch (e) {
      debug.error("Failed to save tutorial completion:", e);
    }

    config.onComplete?.();
    debug.log("Tutorial completed:", config.id);
  }, [config]);

  const reset = useCallback(() => {
    setHasSeenTutorial(false);
    setCurrentStepIndex(0);

    try {
      const storedData = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (storedData) {
        const completed = JSON.parse(storedData) as string[];
        const filtered = completed.filter((id) => id !== config.id);
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      debug.error("Failed to reset tutorial:", e);
    }
  }, [config.id]);

  return {
    isActive,
    currentStep,
    currentStepIndex,
    isLastStep,
    progress,
    hasSeenTutorial,
    totalSteps: config.steps.length,

    start,
    next,
    previous,
    goToStep,
    skip,
    complete,
    reset,
  };
}

/**
 * Get target element for a step with broad fallback resolution
 */
export function getTutorialTarget(
  target?: TutorialStep["target"],
): HTMLElement | null {
  if (!target) return null;

  switch (target) {
    case "search":
      return (
        (document.querySelector("[data-tour='search']") as HTMLElement) ||
        (document.querySelector("[data-tutorial='search']") as HTMLElement) ||
        (document.querySelector("[cmdk-root]") as HTMLElement)
      );
    case "curated-debates":
      return (
        (document.querySelector("[data-tour='curated-debates']") as HTMLElement) ||
        (document.querySelector(".curated-debates-container") as HTMLElement)
      );
    case "battlefield-mode":
      return (
        (document.querySelector("[data-tour='battlefield-mode']") as HTMLElement) ||
        (document.querySelector("[data-perspective='battlefield']") as HTMLElement)
      );
    case "relationship-filters":
      return (
        (document.querySelector("[data-tour='relationship-filters']") as HTMLElement) ||
        (document.querySelector("[data-tutorial='filters']") as HTMLElement)
      );
    case "ai-chat":
      return (
        (document.querySelector("[data-tour='ai-chat']") as HTMLElement) ||
        (document.querySelector("[data-tutorial='chat']") as HTMLElement)
      );
    case "selection-mode":
      return (
        (document.querySelector("[data-tour='selection-mode']") as HTMLElement)
      );
    case "zoom-controls":
      return (
        (document.querySelector("[data-tour='zoom-controls']") as HTMLElement) ||
        (document.querySelector("[data-tutorial='share']") as HTMLElement)
      );
    case "canvas":
      return (
        (document.querySelector(".react-sigma") as HTMLElement) ||
        (document.querySelector("[data-tour='curated-debates']") as HTMLElement)
      );
    default:
      return document.querySelector(target) as HTMLElement;
  }
}
