/**
 * Citation Context Synthesizer
 *
 * Extracts and synthesizes grounded in-text citation context sentences
 * directly from citing papers' titles and abstracts when external APIs
 * (like Semantic Scholar) are rate-limited, offline, or lack coverage.
 */

import { cleanCitationSentence } from "./citation-cleaner";

export interface ContextSynthesisInput {
  citingTitle: string;
  citingAbstract?: string;
  targetAuthorSurname?: string;
  targetYear?: number;
  targetTitle?: string;
}

export interface ContextSynthesisResult {
  contexts: string[];
  intents: string[];
  source: "title-mention" | "abstract-mention" | "discourse-sentence" | "none";
}

const DEBATE_DISCOURSE_KEYWORDS = [
  "fail",
  "failing",
  "failure",
  "unsuccessful",
  "replicate",
  "replication",
  "reproduced",
  "reproduce",
  "reproducibility",
  "failure to replicate",
  "failed to replicate",
  "failed to find",
  "fail to find",
  "no evidence",
  "no support",
  "contradict",
  "contradiction",
  "refute",
  "refutation",
  "disprove",
  "challenge",
  "dispute",
  "comment on",
  "critique",
  "re-analysis",
  "reanalysis",
  "flawed",
  "confirm",
  "confirmation",
  "corroborate",
  "validate",
  "support",
  "extend",
  "generalize",
];

/**
 * Synthesizes grounded citation context sentences from a citing paper's
 * title and abstract by detecting direct author cross-mentions and rhetorical debate signals.
 */
export function synthesizeCitationContexts(
  input: ContextSynthesisInput,
): ContextSynthesisResult {
  const {
    citingTitle,
    citingAbstract = "",
    targetAuthorSurname,
    targetYear,
  } = input;

  const contexts: string[] = [];
  const intents: string[] = [];
  let detectedSource: ContextSynthesisResult["source"] = "none";

  const cleanSurname = targetAuthorSurname?.trim().toLowerCase();
  const surnameRegex = cleanSurname
    ? new RegExp(`\\b${escapeRegExp(cleanSurname)}(?:\\s*et\\s*al\\.?)?(?:\\s*\\(${targetYear || "\\d{4}"}\\))?\\b`, "i")
    : null;

  // 1. Check Citing Title for Direct Author Mention or Dispute Keywords
  let titleHasSurname = false;
  if (citingTitle && citingTitle.length > 10) {
    const titleLower = citingTitle.toLowerCase();
    titleHasSurname = surnameRegex ? surnameRegex.test(citingTitle) : false;
    const hasDebateKeyword = DEBATE_DISCOURSE_KEYWORDS.some((kw) =>
      titleLower.includes(kw),
    );

    if (titleHasSurname || hasDebateKeyword) {
      const cleaned = cleanCitationSentence(citingTitle);
      if (cleaned.length > 15) {
        contexts.push(cleaned);
        detectedSource = titleHasSurname ? "title-mention" : "discourse-sentence";
        if (hasDebateKeyword) {
          intents.push("ResultComparison");
        }
      }
    }
  }

  // 2. Check Citing Abstract for Sentences Referencing Target Author
  if (citingAbstract && citingAbstract.length > 20) {
    const sentences = citingAbstract.split(/(?<=[.?!])\s+/);

    for (const rawSentence of sentences) {
      const sentence = cleanCitationSentence(rawSentence);
      if (sentence.length < 25) continue;

      const sentenceLower = sentence.toLowerCase();
      const mentionsSurname = surnameRegex ? surnameRegex.test(sentence) : false;
      const hasDebateKeyword = DEBATE_DISCOURSE_KEYWORDS.some((kw) =>
        sentenceLower.includes(kw),
      );

      // Highest priority: mentions the author surname directly
      if (mentionsSurname) {
        if (!contexts.includes(sentence)) {
          // If title didn't explicitly mention the surname, abstract is primary
          if (!titleHasSurname) {
            detectedSource = "abstract-mention";
          }
          contexts.unshift(sentence);
          if (hasDebateKeyword && !intents.includes("ResultComparison")) {
            intents.push("ResultComparison");
          }
        }
      } else if (hasDebateKeyword && contexts.length === 0) {
        // Fallback: sentence contains strong empirical debate signals
        if (!contexts.includes(sentence)) {
          contexts.push(sentence);
          if (detectedSource === "none") detectedSource = "discourse-sentence";
          if (!intents.includes("ResultComparison")) {
            intents.push("ResultComparison");
          }
        }
      }
    }
  }

  // Assign default intent if none detected but contexts found
  if (contexts.length > 0 && intents.length === 0) {
    intents.push("Background");
  }

  return {
    contexts: contexts.slice(0, 3), // Cap at top 3 most relevant sentences
    intents,
    source: detectedSource,
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts the first author's surname from an author list string or label.
 * Handles formats:
 * - "Daryl J. Bem, John Doe" -> "Bem"
 * - "Bem, Daryl J." -> "Bem"
 * - "Bem (2011)" -> "Bem"
 * - "Vaswani et al." -> "Vaswani"
 * - "Ashish Vaswani, Noam Shazeer" -> "Vaswani"
 * - "LeCun, Y." -> "LeCun"
 */
export function extractFirstAuthorSurname(
  authors?: string,
  label?: string,
): string | undefined {
  if (label) {
    const labelMatch = label.match(
      /^([A-Za-z\u00C0-\u024F\-]+)\s*(?:et\s*al\.?)?\s*\(\d{4}\)/i,
    );
    if (labelMatch) {
      return labelMatch[1].trim();
    }
  }

  if (!authors || !authors.trim()) return undefined;

  const clean = authors.trim();

  // If format is "Surname, Firstname..."
  if (clean.includes(",")) {
    const parts = clean.split(",");
    const firstPart = parts[0].trim();
    // If firstPart contains no spaces (e.g. "Bem"), it is likely the surname
    if (!firstPart.includes(" ") && firstPart.length > 1) {
      return firstPart.replace(/[^\w\-\u00C0-\u024F]/g, "");
    }
    // If firstPart contains spaces, e.g. "Daryl J. Bem" in "Daryl J. Bem, John Doe"
    const words = firstPart
      .split(/\s+/)
      .filter(
        (w) =>
          !w.toLowerCase().includes("et") && !w.toLowerCase().includes("al"),
      );
    if (words.length > 0) {
      return words[words.length - 1].replace(/[^\w\-\u00C0-\u024F]/g, "");
    }
  }

  // No comma: e.g. "Daryl J. Bem" or "Vaswani et al."
  const words = clean
    .split(/\s+/)
    .filter(
      (w) =>
        !w.toLowerCase().includes("et") && !w.toLowerCase().includes("al"),
    );
  if (words.length > 0) {
    return words[words.length - 1].replace(/[^\w\-\u00C0-\u024F]/g, "");
  }

  return undefined;
}
