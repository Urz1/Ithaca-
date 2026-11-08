import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TutorialOverlay } from "./canvas-tutorial";
import { CANVAS_TUTORIAL } from "@/hooks/useTutorial";

describe("TutorialOverlay — Precision Area Mark & Live Interactive Reticle", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    document.body.innerHTML = `
      <div data-tour="search" style="width: 400px; height: 50px;">
        <input placeholder="Search literature..." />
      </div>
    `;

    const target = document.querySelector("[data-tour='search']");
    if (target) {
      vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
        top: 20,
        bottom: 70,
        left: 100,
        right: 500,
        width: 400,
        height: 50,
        x: 100,
        y: 20,
        toJSON: () => {},
      });
    }
  });

  it("renders the SVG spotlight mask with crystal-clear cutout", () => {
    const step = CANVAS_TUTORIAL.steps[0];
    const { container } = render(
      <TutorialOverlay
        isActive={true}
        step={step}
        stepIndex={0}
        totalSteps={CANVAS_TUTORIAL.steps.length}
        progress={14}
        isLastStep={false}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    // Check SVG mask existence
    const mask = container.querySelector("#ithaca-tour-mask");
    expect(mask).toBeTruthy();

    // Check category badge
    expect(screen.getByText("COMMAND DECK")).toBeDefined();
    expect(screen.getByText(step.title)).toBeDefined();
    expect(screen.getByText(step.description)).toBeDefined();
  });

  it("dispatches live interactive action event when 'Try Live' button is clicked", () => {
    const step = CANVAS_TUTORIAL.steps[0];
    const eventSpy = vi.fn();
    window.addEventListener("open-command-bar", eventSpy);

    render(
      <TutorialOverlay
        isActive={true}
        step={step}
        stepIndex={0}
        totalSteps={CANVAS_TUTORIAL.steps.length}
        progress={14}
        isLastStep={false}
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        onSkip={vi.fn()}
      />,
    );

    const tryLiveButton = screen.getByText(/Try Live/i);
    expect(tryLiveButton).toBeDefined();

    fireEvent.click(tryLiveButton);
    expect(eventSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Triggered Live!/i)).toBeDefined();

    window.removeEventListener("open-command-bar", eventSpy);
  });

  it("navigates forward and backward via callback controls", () => {
    const step = CANVAS_TUTORIAL.steps[1];
    const onNextMock = vi.fn();
    const onPreviousMock = vi.fn();
    const onSkipMock = vi.fn();

    render(
      <TutorialOverlay
        isActive={true}
        step={step}
        stepIndex={1}
        totalSteps={CANVAS_TUTORIAL.steps.length}
        progress={28}
        isLastStep={false}
        onNext={onNextMock}
        onPrevious={onPreviousMock}
        onSkip={onSkipMock}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);
    expect(onNextMock).toHaveBeenCalledTimes(1);

    const prevBtn = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(prevBtn);
    expect(onPreviousMock).toHaveBeenCalledTimes(1);
  });
});
