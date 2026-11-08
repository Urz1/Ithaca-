import { describe, expect, it, beforeEach } from "vitest";
import { CANVAS_TUTORIAL, getTutorialTarget } from "./useTutorial";

describe("CANVAS_TUTORIAL — Configuration & Interactive Actions", () => {
  it("defines the 7 signature dialectic walkthrough steps", () => {
    expect(CANVAS_TUTORIAL.steps).toHaveLength(7);
    const stepIds = CANVAS_TUTORIAL.steps.map((s) => s.id);
    expect(stepIds).toEqual([
      "search",
      "curated-debates",
      "battlefield",
      "epistemic-spectrum",
      "ai-assistant",
      "selection-mode",
      "navigation-controls",
    ]);
  });

  it("assigns distinct categories and area marks for each step", () => {
    CANVAS_TUTORIAL.steps.forEach((step) => {
      expect(step.category).toBeTruthy();
      expect(step.category!.length).toBeGreaterThan(2);
      expect(step.title).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.target).toBeTruthy();
    });
  });

  it("equips every step with a live interactive action trigger", () => {
    CANVAS_TUTORIAL.steps.forEach((step) => {
      expect(step.interactiveAction).toBeDefined();
      expect(step.interactiveAction?.label).toBeTruthy();
      expect(step.interactiveAction?.eventId).toBeTruthy();
    });

    // Check specific event IDs and payloads
    const searchStep = CANVAS_TUTORIAL.steps.find((s) => s.id === "search");
    expect(searchStep?.interactiveAction?.eventId).toBe("open-command-bar");

    const debateStep = CANVAS_TUTORIAL.steps.find((s) => s.id === "curated-debates");
    expect(debateStep?.interactiveAction?.eventId).toBe("ithaca-tour-load-debate");
    expect(debateStep?.interactiveAction?.eventDetail?.topic).toContain("transformers");

    const battlefieldStep = CANVAS_TUTORIAL.steps.find((s) => s.id === "battlefield");
    expect(battlefieldStep?.interactiveAction?.eventId).toBe("ithaca-tour-set-perspective");
    expect(battlefieldStep?.interactiveAction?.eventDetail?.perspective).toBe("battlefield");

    const spectrumStep = CANVAS_TUTORIAL.steps.find((s) => s.id === "epistemic-spectrum");
    expect(spectrumStep?.interactiveAction?.eventId).toBe("ithaca-tour-set-focus");
    expect(spectrumStep?.interactiveAction?.eventDetail?.focus).toBe("contradicts");

    const aiStep = CANVAS_TUTORIAL.steps.find((s) => s.id === "ai-assistant");
    expect(aiStep?.interactiveAction?.eventId).toBe("ithaca-tour-toggle-chat");

    const selectionStep = CANVAS_TUTORIAL.steps.find((s) => s.id === "selection-mode");
    expect(selectionStep?.interactiveAction?.eventId).toBe("ithaca-tour-toggle-selection");

    const navStep = CANVAS_TUTORIAL.steps.find((s) => s.id === "navigation-controls");
    expect(navStep?.interactiveAction?.eventId).toBe("ithaca-tour-open-shortcuts");
  });
});

describe("getTutorialTarget — Precision Area Marking & DOM Resolution", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div data-tour="search" id="search-el">Search Deck</div>
      <div data-tour="curated-debates" id="debates-el">Curated Debates</div>
      <div data-tour="battlefield-mode" id="battlefield-el">Battlefield Mode</div>
      <div data-tour="relationship-filters" id="filters-el">Relationship Filters</div>
      <div data-tour="ai-chat" id="chat-el">AI Chat Dock</div>
      <div data-tour="selection-mode" id="selection-el">Selection Mode Tool</div>
      <div data-tour="zoom-controls" id="zoom-el">WebGL Canvas Footer</div>
    `;
  });

  it("resolves all 7 data-tour attributes correctly", () => {
    expect(getTutorialTarget("search")?.id).toBe("search-el");
    expect(getTutorialTarget("curated-debates")?.id).toBe("debates-el");
    expect(getTutorialTarget("battlefield-mode")?.id).toBe("battlefield-el");
    expect(getTutorialTarget("relationship-filters")?.id).toBe("filters-el");
    expect(getTutorialTarget("ai-chat")?.id).toBe("chat-el");
    expect(getTutorialTarget("selection-mode")?.id).toBe("selection-el");
    expect(getTutorialTarget("zoom-controls")?.id).toBe("zoom-el");
  });

  it("handles null or undefined targets gracefully", () => {
    expect(getTutorialTarget(undefined)).toBeNull();
  });
});
