import { describe, expect, it } from "vitest";
import { containsPromptInjectionRisk } from "@/modules/ai/provenance";
import {
  classifyCitationLocally,
  cleanCitationSentence,
} from "@/lib/api/local-classifier";
import { ADVERSARIAL_CASES } from "@/test/fixtures/test-corpus-10-papers";

describe("L3: Security, Adversarial & Prompt Injection Defenses", () => {
  describe("Prompt Injection Detection (Scenario 8)", () => {
    it("detects system instruction overrides embedded in abstracts", () => {
      const abstract =
        ADVERSARIAL_CASES.PROMPT_INJECTION_ABSTRACT.citingAbstract;
      expect(containsPromptInjectionRisk(abstract)).toBe(true);
    });

    it("detects command override patterns in citation context sentences", () => {
      const context =
        ADVERSARIAL_CASES.PROMPT_INJECTION_ABSTRACT.citationContexts[0];
      expect(containsPromptInjectionRisk(context)).toBe(true);
    });

    it("does not false-positive on legitimate academic discourse about prompt engineering", () => {
      const legit =
        "We evaluate system prompts and in-context instruction following across large language models without overriding safety guardrails.";
      expect(containsPromptInjectionRisk(legit)).toBe(false);
    });

    it("does not false-positive on academic papers studying jailbreaks", () => {
      const legitPaper =
        "In this work, we survey adversarial attacks and prompt injection vulnerabilities in multi-turn conversational agents.";
      expect(containsPromptInjectionRisk(legitPaper)).toBe(false);
    });
  });

  describe("Dirty LaTeX Math & Special Symbol Sanitization (Scenario 12)", () => {
    it("cleanly sanitizes LaTeX notation and preserves mathematical claims", () => {
      const raw =
        "In contrast to the rank collapse theorem in Dong et al. ($O(e^{-2d})$), we prove that $\\lim_{l \\to \\infty} \\mathrm{rank}(Z^{(l)}) \\ge 2$ under normalized weights.";
      const cleaned = cleanCitationSentence(raw);

      expect(cleaned).toContain("rank collapse");
      expect(cleaned).toContain("Dong et al.");
      expect(cleaned.length).toBeGreaterThan(20);
    });

    it("correctly identifies rhetorical stance despite heavy mathematical notation", () => {
      const dirtyCase = ADVERSARIAL_CASES.DIRTY_LATEX_MATH;
      const res = classifyCitationLocally({
        citingId: dirtyCase.citingId,
        citedId: dirtyCase.citedId,
        citingTitle: dirtyCase.citingTitle,
        citingAbstract: dirtyCase.citingAbstract,
        citedTitle: dirtyCase.citedTitle,
        citedAbstract: dirtyCase.citedAbstract,
        citationContexts: dirtyCase.citationContexts,
        s2Intents: ["ResultComparison"],
      });

      expect(res.edgeType).toBe("contradicts");
      expect(res.confidence).toBeGreaterThanOrEqual(0.8);
      expect(res.snippet).toContain("rank");
    });
  });

  describe("XSS Neutralization in Citation Snippets", () => {
    it("preserves stance detection while neutralizing executable script tags", () => {
      const xssCase = ADVERSARIAL_CASES.XSS_INJECTION_SNIPPET;
      const res = classifyCitationLocally({
        citingId: xssCase.citingId,
        citedId: xssCase.citedId,
        citingTitle: xssCase.citingTitle,
        citingAbstract: xssCase.citingAbstract,
        citedTitle: xssCase.citedTitle,
        citedAbstract: xssCase.citedAbstract,
        citationContexts: xssCase.citationContexts,
        s2Intents: ["ResultComparison"],
      });

      expect(res.edgeType).toBe("contradicts");
      expect(res.snippet).toContain("challenge");
    });
  });
});
