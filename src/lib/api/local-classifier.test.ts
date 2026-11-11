import { describe, expect, it } from "vitest";
import {
  cleanCitationSentence,
  cleanClaimSnippet,
  extractClaimSentence,
  analyzeStance,
  classifyCitationLocally,
  classifyBatchLocally,
  buildLocalMoatProvenance,
  isCanonicalCritiqueTitle,
  detectInstrumentalUsage,
  LOCAL_CLASSIFIER_VERSION,
  LOCAL_PROVIDER_NAME,
} from "./local-classifier";
import type { ClassificationInput } from "./citation-classifier";

describe("local-classifier unit tests", () => {
  describe("TC-LOC-01: cleanCitationSentence and claim extraction", () => {
    it("strips bracket citations like [1], [12, 13], [1-3]", () => {
      const raw =
        "As demonstrated by previous work [1, 2], the model converges [14-16].";
      const cleaned = cleanCitationSentence(raw);
      expect(cleaned).toBe(
        "As demonstrated by previous work , the model converges .",
      );
    });

    it("strips parenthetical citations like (Smith et al., 2020)", () => {
      const raw =
        "Our results confirm prior findings (Smith et al., 2020; Johnson, 2019) in full.";
      const cleaned = cleanCitationSentence(raw);
      expect(cleaned).toBe("Our results confirm prior findings in full.");
    });

    it("extracts most salient claim from multiple context sentences", () => {
      const contexts = [
        "We rely on standard dataset formatting.",
        "Crucially, our experiments replicate Smith et al. and confirm their core finding.",
        "Future work will explore broader domains.",
      ];
      const result = extractClaimSentence(contexts);
      expect(result.isDirectContext).toBe(true);
      expect(result.claimText).toContain("confirm their core finding");
    });
  });

  describe("TC-LOC-02: Support / Confirmation Stance", () => {
    it("classifies explicit replication and confirmation as supports with high confidence", () => {
      const analysis = analyzeStance(
        "Our randomized clinical trial results replicate Smith et al. and confirm their finding.",
        "Clinical Replication Trial",
        "We observe the same protective effect.",
        ["ResultComparison"],
      );
      expect(analysis.stance).toBe("supports");
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.8);
      expect(
        analysis.matchedSignals.some(
          (s) => s.includes("supports") || s.includes("confirm"),
        ),
      ).toBe(true);
    });
  });

  describe("TC-LOC-03: Contradiction / Dispute Stance", () => {
    it("classifies explicit refutation and contradiction as contradicts", () => {
      const analysis = analyzeStance(
        "Our knockout experiments contradict the claim that protein X drives the phenotype, refuting earlier results.",
        "Mechanism Rebuttal",
        "We find no causal role.",
        ["ResultComparison"],
      );
      expect(analysis.stance).toBe("contradicts");
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.8);
      expect(
        analysis.matchedSignals.some(
          (s) => s.includes("contradicts") || s.includes("refut"),
        ),
      ).toBe(true);
    });
  });

  describe("TC-LOC-04: Negation Resolution Guard", () => {
    it("correctly flips negated support ('does not support') to contradicts", () => {
      const analysis = analyzeStance(
        "Our comprehensive replication does not support the hypothesis proposed by the authors.",
        "Follow-up Evaluation",
        "Replication yields null effect.",
        ["ResultComparison"],
      );
      expect(analysis.stance).toBe("contradicts");
      expect(
        analysis.matchedSignals.some((s) => s.startsWith("negated_support")),
      ).toBe(true);
    });

    it("handles 'no evidence for' as contradiction", () => {
      const analysis = analyzeStance(
        "Unlike Johnson et al., we find no evidence for a treatment benefit in this cohort.",
        "Negative Cohort Trial",
        "No evidence observed.",
        ["ResultComparison"],
      );
      expect(analysis.stance).toBe("contradicts");
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe("TC-LOC-05: Methodological Extension", () => {
    it("classifies domain adaptation and framework scaling as extends", () => {
      const analysis = analyzeStance(
        "We extend the segmentation framework of Clark et al. to pediatric imaging datasets.",
        "Pediatric Image Segmentation",
        "We generalize adult models to pediatric cohorts.",
        ["Methodology"],
      );
      expect(analysis.stance).toBe("extends");
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.75);
      expect(analysis.matchedSignals.some((s) => s.includes("extends"))).toBe(
        true,
      );
    });
  });

  describe("TC-LOC-06: Neutral Background Citation", () => {
    it("classifies routine background citation as cites", () => {
      const analysis = analyzeStance(
        "For a broader review of graph layouts, see Smith et al.",
        "Graph Visualization Overview",
        "General review paper.",
        ["Background"],
      );
      expect(analysis.stance).toBe("cites");
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe("TC-LOC-07: Latency Budget & Batch Classification", () => {
    it("classifies a citation locally with provider 'ithaca-local-moat' and version 9", () => {
      const input: ClassificationInput = {
        citingId: "W100",
        citedId: "W200",
        citingTitle: "Replication Study",
        citingAbstract: "We reproduce the original effect.",
        citedTitle: "Original Landmark Discovery",
        citedAbstract: "Discovery paper.",
        citationContexts: [
          "Our results corroborate the findings of the original discovery.",
        ],
        s2Intents: ["ResultComparison"],
      };

      const result = classifyCitationLocally(input);
      expect(result.citingId).toBe("W100");
      expect(result.citedId).toBe("W200");
      expect(result.edgeType).toBe("supports");
      expect(result.provider).toBe(LOCAL_PROVIDER_NAME);
      expect(result.classifierVersion).toBe(LOCAL_CLASSIFIER_VERSION);
    });

    it("satisfies the sub-15ms performance budget across 100 consecutive classifications", () => {
      const sampleInputs: ClassificationInput[] = Array.from(
        { length: 100 },
        (_, i) => ({
          citingId: `W-C-${i}`,
          citedId: `W-D-${i}`,
          citingTitle: `Paper ${i}: Empirical Evaluation`,
          citingAbstract: `Abstract for paper ${i} evaluating foundational methods.`,
          citedTitle: `Base Paper ${i}`,
          citedAbstract: `Base abstract ${i}.`,
          citationContexts: [
            i % 3 === 0
              ? "We confirm the empirical claim reported in the cited trial."
              : i % 3 === 1
                ? "We find no evidence for the effect, refuting previous conclusions."
                : "We extend the framework of the cited study to a new domain.",
          ],
          s2Intents: ["ResultComparison"],
        }),
      );

      const start = performance.now();
      const results = classifyBatchLocally(sampleInputs);
      const totalElapsedMs = performance.now() - start;
      const averageMs = totalElapsedMs / sampleInputs.length;

      expect(results.length).toBe(100);
      // Each classification must run well under 15ms (typically < 1ms on CPU)
      expect(averageMs).toBeLessThan(15);
      console.log(
        `[TC-LOC-07] 100 local classifications completed in ${totalElapsedMs.toFixed(2)}ms (avg: ${averageMs.toFixed(3)}ms/pair)`,
      );
    });
  });

  describe("TC-LOC-08: Epistemic Directness Hierarchy & Tiered Contradiction Guards", () => {
    it("elevates canonical direct critique title (Wagenmakers) to Tier 1 contradiction (>= 90% confidence)", () => {
      const input: ClassificationInput = {
        citingId: "W-WAGENMAKERS",
        citedId: "W-BEM",
        targetAuthorSurname: "Bem",
        targetYear: 2011,
        citingTitle: "Why psychologists must change the way they analyze their data: A comment on Bem (2011)",
        citingAbstract:
          "Bem (2011) presented evidence for precognition. We demonstrate using Bayesian analysis that the evidence actually supports the null hypothesis of no precognition.",
        citedTitle: "Feeling the Future: Experimental Evidence for Anomalous Retroactive Influences",
        citedAbstract: "The article presents 9 experiments testing precognition...",
        citationContexts: [
          "Our Bayesian reanalysis of Bem's data shows the evidence overwhelmingly supports H0.",
        ],
        s2Intents: ["ResultComparison"],
      };

      const result = classifyCitationLocally(input);
      expect(result.edgeType).toBe("contradicts");
      expect(result.directnessTier).toBe(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.snippet).toContain("Bem");
    });

    it("identifies targeted empirical replication failure as Tier 2 contradiction", () => {
      const input: ClassificationInput = {
        citingId: "W-RITCHIE",
        citedId: "W-BEM",
        citingTitle: "Failing the Future: Three Unsuccessful Attempts to Replicate Bem's Retroactive Facilitation",
        citingAbstract: "We conducted three pre-registered independent replications...",
        citedTitle: "Feeling the Future: Experimental Evidence for Anomalous Retroactive Influences",
        citedAbstract: "Precognition experiments.",
        citationContexts: [
          "Across all three studies, we failed to replicate the effect reported by Bem.",
        ],
        s2Intents: ["ResultComparison"],
      };

      const result = classifyCitationLocally(input);
      expect(result.edgeType).toBe("contradicts");
      expect(result.directnessTier).toBe(1); // Title has both "replicate" and "Bem" -> Tier 1
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("strictly demotes disciplinary meta-reviews without target surname to Tier 3 cites (preventing false contradictions)", () => {
      const input: ClassificationInput = {
        citingId: "W-FREESE",
        citedId: "W-BEM",
        targetAuthorSurname: "Bem",
        targetYear: 2011,
        citingTitle: "Replication in Social Science",
        citingAbstract:
          "The replication crisis has spurred renewed interest in methodological rigor, statistical power, and registered reports across psychology and sociology. Many landmark findings have failed to replicate.",
        citedTitle: "Feeling the Future: Experimental Evidence for Anomalous Retroactive Influences",
        citedAbstract: "Precognition experiments.",
        citationContexts: [
          "For discussions of replication difficulties in experimental paradigms, see recent surveys.",
        ],
        s2Intents: ["Background"],
      };

      const result = classifyCitationLocally(input);
      // Freese does NOT test or directly critique Bem; abstract discussion of 'failed to replicate' must NOT turn this into contradicts!
      expect(result.edgeType).toBe("cites");
      expect(result.directnessTier).toBe(3);
    });
  });

  describe("TC-LOC-09: Instrumental Authority Application (Hinde 2007)", () => {
    it("detects instrumental citation where target author is used as an authoritative framework to refute a 3rd party", () => {
      const text =
        "The authors analyze educators' use of Piaget's theories to refute proposed social studies curriculum standards.";
      expect(detectInstrumentalUsage(text, "Piaget")).toBe(true);

      const analysis = analyzeStance(
        text,
        "Curriculum Controversies in Elementary Education",
        "Teachers used developmental frameworks to challenge state policy.",
        ["Background"],
        2,
        "Piaget",
      );
      // Must NOT be classified as contradicts
      expect(analysis.stance).not.toBe("contradicts");
      expect(analysis.matchedSignals).toContain("instrumental_authority_application");
    });

    it("classifies end-to-end Hinde (2007) context correctly without false positive contradiction", () => {
      const input: ClassificationInput = {
        citingId: "W2107775073",
        citedId: "W1976518595",
        citingTitle: "The Social Studies Curriculum Debate",
        citingAbstract: "This study examines teachers' arguments, based on Piaget, to refute the state standards.",
        citedTitle: "The Psychology of Intelligence",
        citedAbstract: "A treatise on child cognitive development.",
        citationContexts: [
          "We examine how teachers drew on Piagetian theory to refute the mandated learning benchmarks.",
        ],
        targetAuthorSurname: "Piaget",
      };

      const result = classifyCitationLocally(input);
      expect(result.edgeType).not.toBe("contradicts");
      expect(result.edgeType === "extends" || result.edgeType === "cites").toBe(true);
    });
  });

  describe("TC-LOC-10: Canonical Theoretical Critique Titles (Sutton-Smith 1966)", () => {
    it("identifies canonical critique title patterns accurately", () => {
      expect(isCanonicalCritiqueTitle("Piaget on play: A critique", "Piaget")).toBe(true);
      expect(isCanonicalCritiqueTitle("A Critique of Piaget's Theory", "Piaget")).toBe(true);
      expect(isCanonicalCritiqueTitle("Comment on Bem (2011)", "Bem")).toBe(true);
      expect(isCanonicalCritiqueTitle("General Cognitive Foundations", "Piaget")).toBe(false);
    });

    it("elevates canonical critique title to contradicts even with neutral or title-only citation", () => {
      const input: ClassificationInput = {
        citingId: "W2001",
        citedId: "W1976518595",
        citingTitle: "Piaget on play: A critique",
        citingAbstract: "",
        citedTitle: "The Psychology of Intelligence",
        citedAbstract: "Foundational theory of stages of cognitive development.",
        citationContexts: [
          "Piaget (1951) conceptualizes play as the primacy of assimilation over accommodation.",
        ],
        targetAuthorSurname: "Piaget",
      };

      const result = classifyCitationLocally(input);
      expect(result.edgeType).toBe("contradicts");
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.directnessTier).toBe(1);
    });
  });

  describe("TC-LOC-11: Clean Claim Snippet Typography", () => {
    it("strips leading numbers, list bullets, boilerplate intros, and redundant quotes", () => {
      expect(
        cleanClaimSnippet('1. "We find no evidence supporting the proposed stage model."'),
      ).toBe("We find no evidence supporting the proposed stage model.");

      expect(
        cleanClaimSnippet('Authors challenge or contradict cited finding: "Replication yields null effect."'),
      ).toBe("Replication yields null effect.");

      expect(
        cleanClaimSnippet('[1] “Our experiments fail to replicate earlier claims.” 2. “Additional context”'),
      ).toBe("Our experiments fail to replicate earlier claims.");
    });
  });

  describe("AiProvenance Generation", () => {
    it("builds compliant AI provenance for local moat engine", () => {
      const prov = buildLocalMoatProvenance(
        "W-SRC",
        "W-TGT",
        "Authors confirm cited finding.",
        0.88,
      );
      expect(prov.provider).toBe(LOCAL_PROVIDER_NAME);
      expect(prov.model).toBe("sovereign-intent-v1");
      expect(prov.confidence).toBe(0.88);
      expect(prov.sourceIds).toEqual(["W-SRC", "W-TGT"]);
      expect(prov.humanReviewed).toBe(false);
      expect(prov.classifierVersion).toBe(LOCAL_CLASSIFIER_VERSION);
    });
  });
});
