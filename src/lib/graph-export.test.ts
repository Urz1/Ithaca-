import Graph from "graphology";
import { describe, expect, it, vi } from "vitest";
import {
  getTopDebateClashes,
  drawDirectionalArrow,
  drawDebateCalloutCard,
  exportAsSVG,
  computeEpistemicSalience,
} from "@/lib/graph-export";

describe("graph-export visual overhaul (Takeaway 4)", () => {
  it("extracts top dialectic clashes sorted by confidence", () => {
    const graph = new Graph({ multi: false, type: "directed" });

    graph.addNode("bem-2011", {
      label: "Bem (2011)",
      title: "Feeling the Future: Experimental Evidence for Anomalous Retroactive Influences",
      year: 2011,
      controversyScore: 3,
    });

    graph.addNode("ritchie-2012", {
      label: "Ritchie et al. (2012)",
      title: "Failing the Future: Three Unsuccessful Attempts to Replicate Bem's Retroactive Facilitation",
      year: 2012,
    });

    graph.addNode("galak-2012", {
      label: "Galak et al. (2012)",
      title: "Correcting the Past: Failures to Replicate Psi",
      year: 2012,
    });

    graph.addNode("mossbridge-2012", {
      label: "Mossbridge (2012)",
      title: "Predictive Physiological Anticipation Preceding Seemingly Unpredictable Stimuli",
      year: 2012,
    });

    // Add refutations
    graph.addEdge("ritchie-2012", "bem-2011", {
      edgeType: "contradicts",
      confidence: 95,
      snippet: "Failed to replicate Bem's findings across 3 pre-registered experiments (p > .05).",
    });

    graph.addEdge("galak-2012", "bem-2011", {
      edgeType: "contradicts",
      confidence: 91,
      snippet: "Meta-analysis of 7 replication attempts revealed an effect size not significantly different from zero.",
    });

    // Add supportive edge (must NOT appear in clashes)
    graph.addEdge("mossbridge-2012", "bem-2011", {
      edgeType: "supports",
      confidence: 88,
      snippet: "Corroborates anomalous anticipation effects.",
    });

    const clashes = getTopDebateClashes(graph, 3);

    expect(clashes).toHaveLength(2);
    // Ritchie must be first (95% > 91%)
    expect(clashes[0].confidence).toBe(95);
    expect(clashes[0].citingTitle).toContain("Ritchie");
    expect(clashes[0].targetTitle).toContain("Bem");
    expect(clashes[0].snippet).toContain("Failed to replicate");

    expect(clashes[1].confidence).toBe(91);
    expect(clashes[1].citingTitle).toContain("Galak");
  });

  it("draws directional arrows with target radius perimeter offset and luminous halo for contradictions", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      setLineDash: vi.fn(),
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 0,
      lineCap: "",
      shadowColor: "",
      shadowBlur: 0,
    } as unknown as CanvasRenderingContext2D;

    drawDirectionalArrow(
      mockCtx,
      0,
      0,
      100,
      0, // from (0,0) to (100,0)
      10, // target node radius = 10
      "#f43f5e",
      4.0,
      true, // isContradiction
      1,
    );

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.setLineDash).toHaveBeenCalledWith([]);
    expect(mockCtx.shadowBlur).toBe(8);
    expect(mockCtx.shadowColor).toBe("rgba(244, 63, 94, 0.75)");

    // Arrowhead tip must stop before target center: 100 - (10 + 2.5) = 87.5
    expect(mockCtx.lineTo).toHaveBeenCalledWith(87.5, 0);

    // Test with isTargetControversial = true: 100 - (10 + 10.5) = 79.5
    drawDirectionalArrow(
      mockCtx,
      0,
      0,
      100,
      0,
      10,
      "#f43f5e",
      4.0,
      true,
      1,
      true, // isTargetControversial
    );
    expect(mockCtx.lineTo).toHaveBeenCalledWith(79.5, 0);
  });

  it("renders debate callout card with exact claim quotes in canvas", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 6 })),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
      textBaseline: "",
      shadowColor: "",
      shadowBlur: 0,
    } as unknown as CanvasRenderingContext2D;

    const clashes = [
      {
        id: "e1",
        citingTitle: "Ritchie (2012)",
        citingYear: 2012,
        targetTitle: "Bem (2011)",
        targetYear: 2011,
        snippet: "Failed to replicate retroactive facilitation findings",
        confidence: 95,
      },
    ];

    const result = drawDebateCalloutCard(mockCtx, clashes, 50, 50, 300, true, 1);

    expect(result.width).toBe(300);
    expect(result.height).toBeGreaterThan(50);
    expect(mockCtx.roundRect).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalledWith(
      expect.stringContaining("EMPIRICAL CONTROVERSIES"),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("generates publication-grade SVG with arrow markers, halos and debate callout", async () => {
    const graph = new Graph({ multi: false, type: "directed" });

    graph.addNode("n1", {
      label: "Bem (2011)",
      title: "Feeling the Future",
      year: 2011,
      x: 100,
      y: 100,
      size: 10,
      controversyScore: 2,
    });

    graph.addNode("n2", {
      label: "Ritchie (2012)",
      title: "Failing the Future",
      year: 2012,
      x: 200,
      y: 200,
      size: 8,
    });

    graph.addEdge("n2", "n1", {
      edgeType: "contradicts",
      confidence: 95,
      snippet: "Failed to replicate",
    });

    const mockSigma = {
      getDimensions: () => ({ width: 1000, height: 700 }),
    } as any;

    // In Node.js testing environment, mock Blob and URL
    const originalBlob = globalThis.Blob;
    const originalURL = globalThis.URL;

    try {
      let createdSvg = "";
      globalThis.Blob = class MockBlob {
        constructor(parts: any[]) {
          createdSvg = parts.join("");
        }
      } as any;

      globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-svg");
      globalThis.URL.revokeObjectURL = vi.fn();

      await exportAsSVG(mockSigma, graph, {
        filename: "test.svg",
        includeHeader: true,
        includeLegend: true,
        includeFooter: true,
      });

      expect(createdSvg).toContain('<marker id="arrow-contradicts"');
      expect(createdSvg).toContain('<marker id="arrow-supports"');
      expect(createdSvg).toContain('stroke="#f43f5e"');
      expect(createdSvg).toContain('marker-end="url(#arrow-contradicts)"');
      expect(createdSvg).toContain('filter="url(#crimson-glow)"');
      // Contested node halo
      expect(createdSvg).toContain('stroke="rgba(244, 63, 94, 0.35)"');
      // Controversy badge
      expect(createdSvg).toContain("⚔️ 2");
      // Embedded debate callout card
      expect(createdSvg).toContain('id="debate-callout"');
      expect(createdSvg).toContain("EMPIRICAL CONTROVERSIES");
      expect(createdSvg).toContain("Ritchie (2012)");
      expect(createdSvg).toContain("Failed to replicate");
    } finally {
      globalThis.Blob = originalBlob;
      globalThis.URL = originalURL;
    }
  });

  it("computes epistemic salience ensuring canonical critiques outrank peripheral citations", () => {
    // Wagenmakers direct critique with high citations
    const wagenmakersSalience = computeEpistemicSalience(
      {
        citingTitle: "Why psychologists must change the way they analyze their data: A comment on Bem (2011)",
        targetTitle: "Feeling the Future: Experimental Evidence for Anomalous Retroactive Influences",
        confidence: 95,
        snippet: "Bayesian reanalysis supports the null hypothesis",
      },
      { citations: 450, title: "A comment on Bem (2011)" },
      { title: "Feeling the Future", label: "Bem (2011)" },
    );

    // Peripheral citation with low citations and no direct target match
    const peripheralSalience = computeEpistemicSalience(
      {
        citingTitle: "General methodological notes",
        targetTitle: "Feeling the Future",
        confidence: 90,
        snippet: "General review of paradigms",
      },
      { citations: 2, title: "General notes" },
      { title: "Feeling the Future", label: "Bem (2011)" },
    );

    // Wagenmakers must have a significantly higher epistemic salience score
    expect(wagenmakersSalience).toBeGreaterThan(peripheralSalience * 3);
  });

  it("supports layoutMode: hemispheric in SVG export without mutating original graph", async () => {
    const graph = new Graph({ multi: false, type: "directed" });
    graph.addNode("root1", { label: "Foundation (2000)", year: 2000, x: 0, y: 0, size: 10 });
    graph.addNode("center1", { label: "Bem (2011)", year: 2011, x: 100, y: 100, size: 15, controversyScore: 2 });
    graph.addNode("rebuttal1", { label: "Wagenmakers (2011)", year: 2011, x: 200, y: 200, size: 10 });

    graph.addEdge("center1", "root1", { edgeType: "cites" });
    graph.addEdge("rebuttal1", "center1", { edgeType: "contradicts", confidence: 95, snippet: "Bayesian refutation" });

    const originalX = graph.getNodeAttribute("root1", "x");

    const mockSigma = {
      getDimensions: () => ({ width: 1000, height: 700 }),
    } as any;

    const originalBlob = globalThis.Blob;
    const originalURL = globalThis.URL;

    try {
      let createdSvg = "";
      globalThis.Blob = class MockBlob {
        constructor(parts: any[]) {
          createdSvg = parts.join("");
        }
      } as any;
      globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-svg");
      globalThis.URL.revokeObjectURL = vi.fn();

      await exportAsSVG(mockSigma, graph, {
        filename: "hemispheric.svg",
        layoutMode: "hemispheric",
      });

      expect(createdSvg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(createdSvg).toContain('marker-end="url(#arrow-contradicts)"');
      // Original graph must not be mutated
      expect(graph.getNodeAttribute("root1", "x")).toBe(originalX);
    } finally {
      globalThis.Blob = originalBlob;
      globalThis.URL = originalURL;
    }
  });
});
