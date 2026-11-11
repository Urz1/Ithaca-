import { describe, expect, it } from "vitest";
import {
  CORPUS_PAPERS,
  CORPUS_CITATIONS,
  buildClassificationInputs,
} from "../fixtures/test-corpus-10-papers";
import {
  classifyCitationLocally,
  cleanCitationSentence,
  extractClaimSentence,
} from "@/lib/api/local-classifier";
import { classifyCitation } from "@/lib/api/citation-classifier";

describe("Core Epistemic Pipeline: Stance Classification & Snippet Extraction", () => {
  it("TC-CORE-01: Correctly classifies all 11 pairwise relations in the Transformer corpus", () => {
    const inputs = buildClassificationInputs();
    const startTime = performance.now();

    const results = inputs.map((input) => classifyCitationLocally(input));
    const totalTimeMs = performance.now() - startTime;

    expect(results).toHaveLength(CORPUS_CITATIONS.length);
    const avgLatencyMs = totalTimeMs / results.length;
    expect(avgLatencyMs).toBeLessThan(15);

    for (let i = 0; i < CORPUS_CITATIONS.length; i++) {
      const expected = CORPUS_CITATIONS[i];
      const actual = results[i];

      expect(actual.citingId).toBe(expected.citingId);
      expect(actual.citedId).toBe(expected.citedId);
      expect(actual.edgeType).toBe(expected.expectedStance);

      // Verify confidence bounds
      expect(actual.confidence).toBeGreaterThanOrEqual(0.7);
      if (expected.expectedStance === "contradicts") {
        expect(actual.confidence).toBeGreaterThanOrEqual(0.8);
      }

      // Verify snippet contains meaningful claim context
      expect(actual.snippet).toBeDefined();
      expect(actual.snippet.length).toBeGreaterThan(15);
      expect(actual.provider).toBe("ithaca-local-moat");
      expect(actual.signalSource).toBe("llm+contexts");
    }
  });

  it("TC-CORE-02: Extracts clean atomic propositions without citation bracket artifacts", () => {
    const rawWithBrackets =
      "According to Vaswani et al. [1, 2], self-attention removes recurrent bottlenecks entirely [12-14].";
    const cleaned = cleanCitationSentence(rawWithBrackets);
    expect(cleaned).toBe(
      "According to Vaswani et al. , self-attention removes recurrent bottlenecks entirely .",
    );

    const rawWithParens =
      "As shown previously (Devlin et al., 2018; Liu et al., 2019), masked language models excel.";
    const cleanedParens = cleanCitationSentence(rawWithParens);
    expect(cleanedParens).toBe(
      "As shown previously , masked language models excel.",
    );
  });

  it("TC-CORE-03: Resolves discourse markers when selecting the most salient claim sentence", () => {
    const contexts = [
      "We build upon standard Transformer implementations.",
      "Our empirical results contradict the core efficiency hypothesis of Vaswani et al.",
      "We evaluate across four translation benchmarks.",
    ];

    const { claimText, isDirectContext } = extractClaimSentence(contexts);
    expect(isDirectContext).toBe(true);
    expect(claimText).toContain(
      "contradict the core efficiency hypothesis of Vaswani et al",
    );
  });

  it("TC-CORE-04: Enforces evidence gating defaults on low-signal uncached pairs", async () => {
    // Gate 1: Titles only -> always "cites"
    const titlesOnly = await classifyCitation({
      citingId: "TEST-EVAL-GATE-01",
      citedId: "TEST-EVAL-GATE-02",
      citingTitle: CORPUS_PAPERS.P2_DEVLIN_2018.title,
      citingAbstract: "",
      citedTitle: CORPUS_PAPERS.P1_VASWANI_2017.title,
      citedAbstract: "",
    });
    expect(titlesOnly.edgeType).toBe("cites");
    expect(titlesOnly.provider).toBe("evidence-gate");

    // Gate 2: S2 Background only -> always "cites"
    const backgroundOnly = await classifyCitation({
      citingId: "TEST-EVAL-GATE-03",
      citedId: "TEST-EVAL-GATE-04",
      citingTitle: CORPUS_PAPERS.P4_RAE_2019.title,
      citingAbstract: CORPUS_PAPERS.P4_RAE_2019.abstract,
      citedTitle: CORPUS_PAPERS.P1_VASWANI_2017.title,
      citedAbstract: CORPUS_PAPERS.P1_VASWANI_2017.abstract,
      s2Intents: ["Background"],
    });
    expect(backgroundOnly.edgeType).toBe("cites");
    expect(backgroundOnly.provider).toBe("evidence-gate/s2-background");

    // Gate 3: S2 Methodology only -> always "cites"
    const methodologyOnly = await classifyCitation({
      citingId: "TEST-EVAL-GATE-05",
      citedId: "TEST-EVAL-GATE-06",
      citingTitle: CORPUS_PAPERS.P8_BROWN_2020.title,
      citingAbstract: CORPUS_PAPERS.P8_BROWN_2020.abstract,
      citedTitle: CORPUS_PAPERS.P1_VASWANI_2017.title,
      citedAbstract: CORPUS_PAPERS.P1_VASWANI_2017.abstract,
      s2Intents: ["Methodology"],
    });
    expect(methodologyOnly.edgeType).toBe("cites");
    expect(methodologyOnly.provider).toBe("evidence-gate/s2-methodology-use");
  });
});
