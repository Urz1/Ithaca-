import { describe, expect, it } from "vitest";
import {
  synthesizeCitationContexts,
  extractFirstAuthorSurname,
} from "./citation-context-synthesizer";

describe("citation-context-synthesizer", () => {
  it("extracts direct author critique from citing paper title", () => {
    const result = synthesizeCitationContexts({
      citingTitle:
        "Why psychologists must change the way they analyze their data: The case of psi: Comment on Bem (2011)",
      citingAbstract: "We analyze hypothesis testing in social psychology.",
      targetAuthorSurname: "Bem",
      targetYear: 2011,
    });

    expect(result.contexts.length).toBeGreaterThan(0);
    expect(result.contexts[0]).toContain("Comment on Bem");
    expect(result.source).toBe("title-mention");
    expect(result.intents).toContain("ResultComparison");
  });

  it("extracts explicit replication failure sentence from citing abstract", () => {
    const result = synthesizeCitationContexts({
      citingTitle: "A Replication Study",
      citingAbstract:
        "We investigated anomalous retroactive effects. Across two pre-registered experiments, we attempted to replicate Bem's (2011) findings. Our experiments failed to replicate the precognition effect (p = .72). We conclude that the original effect is not robust.",
      targetAuthorSurname: "Bem",
      targetYear: 2011,
    });

    expect(result.contexts.length).toBeGreaterThan(0);
    expect(
      result.contexts.some((c) => c.includes("replicate Bem")),
    ).toBe(true);
    expect(result.source).toBe("abstract-mention");
    expect(result.intents).toContain("ResultComparison");
  });

  it("extracts sentences with salient debate markers even if surname is slightly modified", () => {
    const result = synthesizeCitationContexts({
      citingTitle: "Failing the future: three unsuccessful attempts",
      citingAbstract:
        "This article presents three pre-registered replication experiments. All three failed to find any evidence of retroactive recall.",
      targetAuthorSurname: "Bem",
      targetYear: 2011,
    });

    expect(result.contexts.length).toBeGreaterThan(0);
    expect(result.contexts[0]).toContain("Failing the future");
    expect(result.intents).toContain("ResultComparison");
  });

  it("returns none if no mentions or debate keywords exist", () => {
    const result = synthesizeCitationContexts({
      citingTitle: "A generic textbook on standard variance analysis",
      citingAbstract:
        "We discuss linear algebra and matrix decomposition in applied settings.",
      targetAuthorSurname: "Bem",
      targetYear: 2011,
    });

    expect(result.contexts).toHaveLength(0);
    expect(result.source).toBe("none");
  });

  describe("extractFirstAuthorSurname", () => {
    it("extracts surname from various author string and label formats", () => {
      expect(extractFirstAuthorSurname("Daryl J. Bem, John Doe")).toBe("Bem");
      expect(extractFirstAuthorSurname("Bem, Daryl J.")).toBe("Bem");
      expect(extractFirstAuthorSurname(undefined, "Bem (2011)")).toBe("Bem");
      expect(
        extractFirstAuthorSurname("Ashish Vaswani, Noam Shazeer, Niki Parmar"),
      ).toBe("Vaswani");
      expect(extractFirstAuthorSurname("Vaswani et al.")).toBe("Vaswani");
      expect(extractFirstAuthorSurname("LeCun, Yann")).toBe("LeCun");
      expect(extractFirstAuthorSurname(undefined, "Vaswani et al. (2017)")).toBe(
        "Vaswani",
      );
    });
  });
});
