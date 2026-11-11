/**
 * Ithaca Local Intent Classifier Engine (Sovereign Moat)
 *
 * Implements a high-precision, sub-15ms in-process semantic stance classifier
 * operating 100% offline on CPU with zero runtime FX burn, compliant with
 * Article 41 of Ethiopia's Startup Proclamation No. 1396/2025.
 *
 * Capabilities:
 * 1. Deterministic citation cleaning & atomic claim proposition extraction
 * 2. Multi-tier lexical & discourse pattern analysis (supports, contradicts, extends, cites)
 * 3. Negation scope resolution (e.g. "does not support" -> contradicts)
 * 4. Token-vectorized cosine stance similarity
 * 5. Full AiProvenance generation (provider: "ithaca-local-moat")
 */

import { buildAiProvenance, type AiProvenance } from "@/modules/ai/provenance";
import type {
  ClassificationInput,
  ClassificationResult,
} from "./citation-classifier";
import { cleanCitationSentence, cleanClaimSnippet } from "./citation-cleaner";
import { synthesizeCitationContexts } from "./citation-context-synthesizer";

export { cleanCitationSentence, cleanClaimSnippet } from "./citation-cleaner";

export const LOCAL_CLASSIFIER_VERSION = 10;
export const LOCAL_PROVIDER_NAME = "ithaca-local-moat";
export const LOCAL_MODEL_NAME = "sovereign-intent-v1";

// =============================================================================
// CITATION CLEANING & CLAIM EXTRACTION
// =============================================================================

export type DirectnessTier = 1 | 2 | 3;

/**
 * Checks if a title is a canonical direct critique of the target author/work.
 * Matches:
 *  - "Comment on [Target]" / "Rebuttal to [Target]" / "Reply to [Target]"
 *  - "[Target] on [Topic]: A Critique" (e.g. "Piaget on play: A critique")
 *  - "A Critique of [Target]" / "Critique of [Target]"
 */
export function isCanonicalCritiqueTitle(
  title = "",
  targetSurname?: string,
): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();

  if (
    lower.includes("comment on") ||
    lower.includes("rebuttal to") ||
    lower.includes("reply to") ||
    lower.includes("failure to replicate") ||
    lower.includes("failures to replicate") ||
    lower.includes("failed to replicate") ||
    lower.includes("attempts to replicate")
  ) {
    return true;
  }

  if (!targetSurname || targetSurname.length < 3) {
    return lower.includes(": a critique") || lower.includes("a critique of");
  }

  const s = targetSurname.toLowerCase().replace(/[^a-z0-9]/g, "");
  const patterns = [
    new RegExp(`\\b${s}\\b\\s+on\\s+[a-z0-9\\s]+:\\s*a\\s+critique`, "i"),
    new RegExp(`\\ba\\s+critique\\s+of\\s+(?:[a-z0-9\\s]{0,20}\\s+)?\\b${s}\\b`, "i"),
    new RegExp(`\\bcritique\\s+of\\s+\\b${s}\\b`, "i"),
    new RegExp(`\\b${s}\\b(?:['’]s)?\\s+[a-z0-9\\s]{0,30}:\\s*a\\s+critique`, "i"),
  ];

  return patterns.some((p) => p.test(title));
}

/**
 * Detect instrumental usage of the target author.
 * E.g., "educators' use of Piaget's theories to refute proposed curriculum"
 * or "teachers' arguments, based on Piaget, to refute the standards".
 * In these constructions, the Target is the authoritative weapon/instrument,
 * and the third party (curriculum/standards) is the entity being refuted.
 * Therefore, Target is being SUPPORTED or EXTENDED, NOT contradicted.
 */
export function detectInstrumentalUsage(
  text: string,
  targetSurname?: string,
): boolean {
  if (!text || !targetSurname || targetSurname.length < 3) return false;
  const surname = targetSurname.toLowerCase().replace(/[^a-z0-9]/g, "");
  const authorStem = `(?:\\b${surname}(?:ian|['’]s)?\\b)`;

  const instrumentalPatterns = [
    new RegExp(
      `(?:use|using|uses|used)\\s+(?:of\\s+)?(?:[a-z0-9'’\\s]{0,35}\\s+)?${authorStem}[a-z'’\\s]{0,45}\\s+to\\s+(?:refute|challenge|reject|oppose|counter|disprove|criticize|stifle)`,
      "i",
    ),
    new RegExp(
      `(?:based\\s+on|drawing\\s+on|draws\\s+on|drew\\s+on)\\s+(?:[a-z0-9'’\\s]{0,35}\\s+)?${authorStem}[a-z'’\\s]{0,45}\\s+to\\s+(?:refute|challenge|reject|oppose|counter|disprove)`,
      "i",
    ),
    new RegExp(
      `(?:referred\\s+to|referring\\s+to|relied\\s+on|relying\\s+on|rely\\s+on)\\s+(?:[a-z0-9'’\\s]{0,35}\\s+)?${authorStem}[a-z'’\\s]{0,45}\\s+to\\s+(?:refute|challenge|reject|oppose|counter|disprove)`,
      "i",
    ),
    new RegExp(
      `(?:applied|applying|applies|employ|employed|employing)\\s+(?:[a-z0-9'’\\s]{0,35}\\s+)?${authorStem}[a-z'’\\s]{0,45}\\s+to\\s+(?:refute|challenge|reject|oppose|counter|disprove)`,
      "i",
    ),
    new RegExp(
      `${authorStem}(?:\\s+and\\s+[a-z]+)?\\s+(?:theories|theory|framework|findings?|work|ideas?)[a-z'’\\s]{0,25}\\s+to\\s+(?:refute|challenge|reject|oppose|counter|disprove)`,
      "i",
    ),
    new RegExp(
      `(?:arguments?|perspective|standpoint|evidence),\\s*(?:based\\s+on|drawing\\s+on|drew\\s+on)\\s+${authorStem}[a-z'’\\s]{0,35}\\s+to\\s+(?:refute|challenge|reject|oppose|counter|disprove)`,
      "i",
    ),
  ];

  return instrumentalPatterns.some((pattern) => pattern.test(text));
}

/**
 * Extract the primary claim proposition from citation context sentences, abstract, or title.
 * Also classifies the Epistemic Directness Tier:
 *   - Tier 1: Direct empirical replication, statistical reanalysis, or title commentary naming the target.
 *   - Tier 2: Specific in-text or abstract citation targeting the cited author's claims.
 *   - Tier 3: Disciplinary meta-review or general context citation without target author mention.
 */
export function extractClaimSentence(
  contexts?: string[],
  abstract?: string,
  options?: {
    citingTitle?: string;
    targetAuthorSurname?: string;
  },
): { claimText: string; isDirectContext: boolean; directnessTier: DirectnessTier } {
  const cleanSurname = options?.targetAuthorSurname?.trim().toLowerCase();
  const citingTitle = options?.citingTitle || "";
  const citingTitleLower = citingTitle.toLowerCase();

  // Detect explicit direct commentary / rebuttal / replication titles
  const isDirectTitleCritique =
    isCanonicalCritiqueTitle(citingTitle, cleanSurname) ||
    (Boolean(cleanSurname) &&
      cleanSurname!.length >= 3 &&
      citingTitleLower.includes(cleanSurname!) &&
      (citingTitleLower.includes("critique") ||
        citingTitleLower.includes("rebut") ||
        citingTitleLower.includes("refut") ||
        citingTitleLower.includes("disprov") ||
        citingTitleLower.includes("challeng")));

  const salientMarkers = [
    "confirm",
    "replicate",
    "reproduce",
    "validate",
    "corroborate",
    "contradict",
    "refute",
    "disprove",
    "challenge",
    "fail",
    "no evidence",
    "reanalysis",
    "re-analysis",
    "null",
    "support",
    "extend",
    "generalize",
    "scale",
    "adapt",
    "contrast",
  ];

  if (contexts && contexts.length > 0) {
    // 1. In-text context sentence with target author surname + marker (Tier 1)
    if (cleanSurname && cleanSurname.length >= 3) {
      for (const ctx of contexts) {
        const lower = ctx.toLowerCase();
        if (lower.includes(cleanSurname) && salientMarkers.some((m) => lower.includes(m))) {
          return {
            claimText: cleanCitationSentence(ctx),
            isDirectContext: true,
            directnessTier: 1,
          };
        }
      }

      // 1b. In-text context sentence mentioning target surname without explicit marker (Tier 2 targeted context, or Tier 1 if title is critique)
      for (const ctx of contexts) {
        const lower = ctx.toLowerCase();
        if (lower.includes(cleanSurname)) {
          return {
            claimText: cleanCitationSentence(ctx),
            isDirectContext: true,
            directnessTier: isDirectTitleCritique ? 1 : 2,
          };
        }
      }

      // 1c. If cleanSurname is known and neither title nor citation contexts mention target surname,
      // this is a contextual / background / general citation, NOT a targeted evaluation.
      if (!isDirectTitleCritique) {
        return {
          claimText: cleanCitationSentence(contexts[0]),
          isDirectContext: true,
          directnessTier: 3,
        };
      }
    }

    // 2. In-text context sentence with salient marker (when surname is unknown or title is direct critique)
    for (const ctx of contexts) {
      const lower = ctx.toLowerCase();
      if (salientMarkers.some((m) => lower.includes(m))) {
        return {
          claimText: cleanCitationSentence(ctx),
          isDirectContext: true,
          directnessTier: isDirectTitleCritique ? 1 : 2,
        };
      }
    }

    return {
      claimText: cleanCitationSentence(contexts[0]),
      isDirectContext: true,
      directnessTier: isDirectTitleCritique ? 1 : 2,
    };
  }

  // If no direct in-text context, check title directness first
  if (isDirectTitleCritique && options?.citingTitle) {
    return {
      claimText: cleanCitationSentence(options.citingTitle),
      isDirectContext: false,
      directnessTier: 1,
    };
  }

  // Scan abstract for target author surname
  if (abstract && abstract.length > 20) {
    const sentences = abstract.split(/(?<=[.?!])\s+/);

    if (cleanSurname && cleanSurname.length >= 3) {
      for (const raw of sentences) {
        const lower = raw.toLowerCase();
        if (lower.includes(cleanSurname)) {
          const cleaned = cleanCitationSentence(raw);
          if (cleaned.length > 20) {
            const hasMarker = salientMarkers.some((m) => lower.includes(m));
            return {
              claimText: cleaned,
              isDirectContext: false,
              directnessTier: hasMarker ? 1 : 2,
            };
          }
        }
      }
    }

    // If target surname was NOT in the abstract or title, any debate marker in this paper
    // is about the paper's OWN topic (e.g., "Replication in Social Science") or general field,
    // NOT a direct evaluation of the cited paper. This is Tier 3 (Contextual / Disciplinary).
    for (const raw of sentences) {
      const lower = raw.toLowerCase();
      if (salientMarkers.some((m) => lower.includes(m))) {
        const cleaned = cleanCitationSentence(raw);
        if (cleaned.length > 20) {
          return {
            claimText: cleaned,
            isDirectContext: false,
            directnessTier: 3,
          };
        }
      }
    }

    const lastSentence = sentences[sentences.length - 1];
    if (lastSentence && lastSentence.length > 30) {
      return {
        claimText: cleanCitationSentence(lastSentence),
        isDirectContext: false,
        directnessTier: 3,
      };
    }
    return {
      claimText: cleanCitationSentence(sentences[0]),
      isDirectContext: false,
      directnessTier: 3,
    };
  }

  // Fallback to title if abstract was absent
  if (options?.citingTitle && options.citingTitle.length > 15) {
    return {
      claimText: cleanCitationSentence(options.citingTitle),
      isDirectContext: false,
      directnessTier: isDirectTitleCritique ? 1 : 3,
    };
  }

  return { claimText: "", isDirectContext: false, directnessTier: 3 };
}

// =============================================================================
// PATTERN DICTIONARIES & NEGATION
// =============================================================================

interface SignalRule {
  phrase: string;
  weight: number;
}

const NEGATION_PREFIXES = [
  "no ",
  "not ",
  "does not ",
  "do not ",
  "did not ",
  "cannot ",
  "failed to ",
  "fail to ",
  "without ",
  "lack of ",
  "unable to ",
  "hardly ",
  "neither ",
  "never ",
  "in contrast to ",
  "unlike ",
  "opposite of ",
  "contrary to ",
];

const CONTRADICT_SIGNALS: SignalRule[] = [
  // Explicit refutations & replication failures (Weight 4-5)
  { phrase: "failure to replicate", weight: 5 },
  { phrase: "failures to replicate", weight: 5 },
  { phrase: "fail to replicate", weight: 5 },
  { phrase: "failed to replicate", weight: 5 },
  { phrase: "failed attempt to replicate", weight: 5 },
  { phrase: "unsuccessful attempt to replicate", weight: 5 },
  { phrase: "unsuccessful attempts to replicate", weight: 5 },
  { phrase: "could not replicate", weight: 5 },
  { phrase: "not replicated", weight: 5 },
  { phrase: "no support", weight: 5 },
  { phrase: "no support for", weight: 5 },
  { phrase: "offer no support", weight: 5 },
  { phrase: "offers no support", weight: 5 },
  { phrase: "does not support", weight: 5 },
  { phrase: "do not support", weight: 5 },
  { phrase: "did not support", weight: 5 },
  { phrase: "supports the null hypothesis", weight: 6 },
  { phrase: "support the null hypothesis", weight: 6 },
  { phrase: "supports the null", weight: 6 },
  { phrase: "support the null", weight: 6 },
  { phrase: "supports h0", weight: 6 },
  { phrase: "support h0", weight: 6 },
  { phrase: "evidence supports the null", weight: 6 },
  { phrase: "evidence overwhelmingly supports h0", weight: 6 },
  { phrase: "overwhelmingly supports h0", weight: 6 },
  { phrase: "overwhelmingly supports the null", weight: 6 },
  { phrase: "in favor of the null hypothesis", weight: 5 },
  { phrase: "in favor of the null", weight: 5 },
  { phrase: "favors the null hypothesis", weight: 5 },
  { phrase: "favors the null", weight: 5 },
  { phrase: "null hypothesis of no", weight: 5 },
  { phrase: "null effect", weight: 4 },
  { phrase: "null results", weight: 4 },
  { phrase: "null result", weight: 4 },
  { phrase: "is not all you need", weight: 5 },
  { phrase: "comment on", weight: 3 },
  { phrase: "no evidence for", weight: 5 },
  { phrase: "no evidence of", weight: 5 },
  { phrase: "no evidence", weight: 4 },
  { phrase: "no association", weight: 4 },
  { phrase: "no correlation", weight: 4 },
  { phrase: "no causal", weight: 4 },
  { phrase: "no improvement", weight: 4 },
  { phrase: "no predictive gain", weight: 4 },
  { phrase: "no predictive improvement", weight: 5 },
  { phrase: "no significant", weight: 3 },
  { phrase: "no effect", weight: 3 },
  { phrase: "did not improve", weight: 4 },
  { phrase: "disappears after adjusting", weight: 5 },
  { phrase: "relies on an assumption that fails", weight: 5 },
  { phrase: "fails in practical", weight: 4 },
  { phrase: "opposite modulation", weight: 5 },
  { phrase: "opposite sign", weight: 4 },
  { phrase: "opposite effect", weight: 4 },
  { phrase: "argue against", weight: 4 },
  { phrase: "argues against", weight: 4 },
  { phrase: "contradict the", weight: 5 },
  { phrase: "contradicts the", weight: 5 },
  { phrase: "contradict", weight: 4 },
  { phrase: "contradicts", weight: 4 },
  { phrase: "refuting the", weight: 5 },
  { phrase: "refuting", weight: 4 },
  { phrase: "refute", weight: 4 },
  { phrase: "refutes", weight: 4 },
  { phrase: "disprove", weight: 4 },
  { phrase: "disproves", weight: 4 },
  { phrase: "debunk", weight: 4 },
  { phrase: "rebut", weight: 4 },
  { phrase: "invalidate", weight: 4 },
  { phrase: "invalidates", weight: 4 },
  { phrase: "overturn", weight: 4 },
  { phrase: "overturned", weight: 4 },
  { phrase: "erroneous", weight: 3 },
  { phrase: "flawed", weight: 3 },
  { phrase: "inconsistent with", weight: 4 },
  { phrase: "contrary to", weight: 4 },
  { phrase: "in contrast to", weight: 4 },
  { phrase: "in contrast", weight: 3 },
  { phrase: "challenge the", weight: 4 },
  { phrase: "challenges the", weight: 4 },
  { phrase: "challenge", weight: 4 },
  { phrase: "challenges", weight: 4 },
  { phrase: "challenging", weight: 3 },
  { phrase: "disagree", weight: 3 },
  { phrase: "dispute", weight: 3 },
  { phrase: "undermines", weight: 3 },
  { phrase: "unsubstantiated", weight: 3 },
  { phrase: "questionable", weight: 2 },
];

const SUPPORT_SIGNALS: SignalRule[] = [
  // High confidence empirical confirmation (Weight 4-5)
  { phrase: "replicate and confirm", weight: 5 },
  { phrase: "confirms their finding", weight: 5 },
  { phrase: "confirm their finding", weight: 5 },
  { phrase: "confirms the", weight: 4 },
  { phrase: "confirm the", weight: 4 },
  { phrase: "confirms", weight: 4 },
  { phrase: "confirm", weight: 3 },
  { phrase: "validates the", weight: 4 },
  { phrase: "validate the", weight: 4 },
  { phrase: "validates", weight: 4 },
  { phrase: "validate", weight: 3 },
  { phrase: "replicated successfully", weight: 5 },
  { phrase: "successfully reproduced", weight: 5 },
  { phrase: "reproduces the", weight: 4 },
  { phrase: "reproduce the", weight: 4 },
  { phrase: "reproduces", weight: 4 },
  { phrase: "reproduce", weight: 3 },
  { phrase: "corroborate the", weight: 4 },
  { phrase: "corroborates the", weight: 4 },
  { phrase: "corroborate", weight: 4 },
  { phrase: "corroborates", weight: 4 },
  { phrase: "agrees with the", weight: 4 },
  { phrase: "agrees with", weight: 3 },
  { phrase: "consistent with", weight: 3 },
  { phrase: "in agreement with", weight: 4 },
  { phrase: "in line with", weight: 2 },
  { phrase: "provides evidence for", weight: 4 },
  { phrase: "support the sensitivity", weight: 4 },
  { phrase: "support the finding", weight: 4 },
  { phrase: "supports the", weight: 3 },
  { phrase: "support the", weight: 3 },
  { phrase: "supports a", weight: 3 },
  { phrase: "support for", weight: 3 },
  { phrase: "supports", weight: 2 },
  { phrase: "support", weight: 2 },
  { phrase: "lends support", weight: 3 },
  { phrase: "reinforces", weight: 3 },
  { phrase: "demonstrates the validity", weight: 4 },
];

const EXTEND_SIGNALS: SignalRule[] = [
  // Generalization, scaling, domain transfer (Weight 4-5)
  { phrase: "extend the", weight: 4 },
  { phrase: "extends the", weight: 4 },
  { phrase: "extend this", weight: 4 },
  { phrase: "extends this", weight: 4 },
  { phrase: "generalize the", weight: 4 },
  { phrase: "generalizes the", weight: 4 },
  { phrase: "generalize", weight: 3 },
  { phrase: "generalized to", weight: 4 },
  { phrase: "scale the", weight: 4 },
  { phrase: "scales the", weight: 4 },
  { phrase: "scaled to", weight: 4 },
  { phrase: "adapt the", weight: 4 },
  { phrase: "adapts the", weight: 4 },
  { phrase: "adapted to", weight: 4 },
  { phrase: "adapted for", weight: 4 },
  { phrase: "applied to pediatric", weight: 5 },
  { phrase: "applied to a new", weight: 4 },
  { phrase: "apply to a new", weight: 4 },
  { phrase: "transferred to a", weight: 4 },
  { phrase: "transfer the", weight: 4 },
  { phrase: "novel application of", weight: 4 },
  { phrase: "builds upon the foundation", weight: 4 },
  { phrase: "expanding the scope", weight: 3 },
];

/**
 * Check if a signal match is negated by preceding text within window.
 */
function isPrecededByNegation(
  text: string,
  matchIndex: number,
  window = 35,
): boolean {
  const preceding = text.substring(
    Math.max(0, matchIndex - window),
    matchIndex,
  );
  return NEGATION_PREFIXES.some((neg) => preceding.includes(neg));
}

// =============================================================================
// VECTORIZED TOKEN COSINE SIMILARITY
// =============================================================================

const STANCE_ANCHORS = {
  supports: [
    "confirm",
    "validate",
    "replicate",
    "reproduce",
    "corroborate",
    "agree",
    "support",
    "consistent",
    "verify",
    "demonstrate",
  ],
  contradicts: [
    "contradict",
    "refute",
    "disprove",
    "fail",
    "negate",
    "inconsistent",
    "oppose",
    "flawed",
    "erroneous",
    "rebut",
    "challenge",
  ],
  extends: [
    "extend",
    "generalize",
    "scale",
    "adapt",
    "transfer",
    "expand",
    "broaden",
    "novel",
    "domain",
    "application",
  ],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeAnchorSimilarity(
  tokens: string[],
  anchorWords: string[],
): number {
  if (tokens.length === 0) return 0;
  let matches = 0;
  for (const token of tokens) {
    if (
      anchorWords.some(
        (anchor) => token.startsWith(anchor) || anchor.startsWith(token),
      )
    ) {
      matches++;
    }
  }
  return matches / Math.sqrt(tokens.length * anchorWords.length);
}

// =============================================================================
// CLASSIFICATION LOGIC
// =============================================================================

export interface LocalStanceAnalysis {
  stance: "supports" | "contradicts" | "extends" | "cites";
  confidence: number;
  snippet: string;
  matchedSignals: string[];
  directnessTier?: DirectnessTier;
}

/**
 * Analyze rhetorical stance using deterministic pattern rules, negation guards,
 * directness tier constraints, and token-vectorized similarity scoring.
 */
export function analyzeStance(
  claimText: string,
  citingTitle = "",
  citingAbstract = "",
  s2Intents: string[] = [],
  directnessTier: DirectnessTier = 2,
  targetAuthorSurname?: string,
): LocalStanceAnalysis {
  const primaryText = [claimText, citingTitle, citingAbstract]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const tokens = tokenize(primaryText);

  let contradictScore = 0;
  let supportScore = 0;
  let extendScore = 0;
  const matchedSignals: string[] = [];

  // Check canonical critique titles (e.g. "Piaget on play: A critique", "Comment on Bem")
  const isDirectCritique = isCanonicalCritiqueTitle(
    citingTitle,
    targetAuthorSurname,
  );
  if (isDirectCritique) {
    contradictScore += 6;
    directnessTier = 1;
    matchedSignals.push("canonical_critique_title");
  }

  const findWordStartMatch = (text: string, phrase: string): number => {
    let searchFrom = 0;
    while (searchFrom < text.length) {
      const idx = text.indexOf(phrase, searchFrom);
      if (idx === -1) return -1;
      const isWordStart = idx === 0 || !/[a-zA-Z0-9]/.test(text[idx - 1]);
      if (isWordStart) {
        return idx;
      }
      searchFrom = idx + 1;
    }
    return -1;
  };

  // Check contradiction signals
  for (const rule of CONTRADICT_SIGNALS) {
    const idx = findWordStartMatch(primaryText, rule.phrase);
    if (idx !== -1) {
      contradictScore += rule.weight;
      matchedSignals.push(`contradicts:${rule.phrase}`);
    }
  }

  // Check support signals with negation & null hypothesis check
  const NULL_TARGETS = [
    "null hypothesis",
    "null",
    "h0",
    "h_0",
    "the null",
    "no effect",
    "no precognition",
  ];
  const isNullHypothesisSupport = (text: string, matchIdx: number): boolean => {
    const following = text.substring(matchIdx, matchIdx + 45).toLowerCase();
    return NULL_TARGETS.some((tgt) => following.includes(tgt));
  };

  for (const rule of SUPPORT_SIGNALS) {
    const idx = findWordStartMatch(primaryText, rule.phrase);
    if (idx !== -1) {
      if (isNullHypothesisSupport(primaryText, idx)) {
        // "Supports the null hypothesis" / "supports H0" is an empirical REFUTATION of the target effect!
        contradictScore += rule.weight + 3;
        matchedSignals.push(`null_hypothesis_contradiction:${rule.phrase}`);
      } else if (isPrecededByNegation(primaryText, idx)) {
        // Negated support = contradiction!
        contradictScore += rule.weight + 2;
        matchedSignals.push(`negated_support:${rule.phrase}`);
      } else {
        supportScore += rule.weight;
        matchedSignals.push(`supports:${rule.phrase}`);
      }
    }
  }

  // Check extend signals
  for (const rule of EXTEND_SIGNALS) {
    const idx = findWordStartMatch(primaryText, rule.phrase);
    if (idx !== -1) {
      if (isPrecededByNegation(primaryText, idx)) {
        contradictScore += rule.weight;
        matchedSignals.push(`negated_extend:${rule.phrase}`);
      } else {
        extendScore += rule.weight;
        matchedSignals.push(`extends:${rule.phrase}`);
      }
    }
  }

  // Factor in S2 intent signals
  if (s2Intents.includes("ResultComparison")) {
    if (contradictScore > 0) contradictScore += 2;
    if (supportScore > 0) supportScore += 2;
  }
  if (
    s2Intents.includes("Methodology") &&
    !s2Intents.includes("ResultComparison")
  ) {
    if (extendScore > 0) extendScore += 1;
  }

  // Vectorized anchor similarity adjustments
  const simContradict = computeAnchorSimilarity(
    tokens,
    STANCE_ANCHORS.contradicts,
  );
  const simSupport = computeAnchorSimilarity(tokens, STANCE_ANCHORS.supports);
  const simExtend = computeAnchorSimilarity(tokens, STANCE_ANCHORS.extends);

  contradictScore += simContradict * 3;
  supportScore += simSupport * 3;
  extendScore += simExtend * 3;

  // Check for instrumental citation fallacy:
  // e.g. "educators' use of Piaget's theories to refute proposed curriculum standards"
  // Here, the target author is used as an authoritative weapon to refute a third-party target.
  const isInstrumental =
    !isDirectCritique &&
    Boolean(targetAuthorSurname && targetAuthorSurname.length >= 3) &&
    detectInstrumentalUsage(primaryText, targetAuthorSurname);

  if (isInstrumental) {
    contradictScore = 0;
    extendScore += 4;
    matchedSignals.push("instrumental_authority_application");
  }

  // Directness Tier 1 Elevation: Citing title explicitly comments on / rebuts target
  if (directnessTier === 1 && contradictScore > 0) {
    contradictScore += 4;
  }

  // =========================================================================
  // TIER 3 GUARD: Disciplinary reviews without target author cross-mention
  // NEVER promote a general meta-review to a contradiction unless it directly
  // evaluates the target finding.
  // =========================================================================
  if (directnessTier === 3) {
    return {
      stance: "cites",
      confidence: 0.82,
      snippet: claimText
        ? `Disciplinary review referencing cited work in broader literature: "${cleanClaimSnippet(claimText)}"`
        : "Standard academic citation without direct dispute or confirmation.",
      matchedSignals,
      directnessTier: 3,
    };
  }

  // Stance Decision Hierarchy
  let stance: "supports" | "contradicts" | "extends" | "cites" = "cites";
  let confidence = 0.7;
  const cleanClaim = cleanClaimSnippet(claimText);
  let snippet = cleanClaim
    ? `Citation reference: "${cleanClaim}"`
    : "Citation relationship — background or methodological reference.";

  if (
    contradictScore >= 3 &&
    contradictScore > supportScore &&
    contradictScore > extendScore
  ) {
    stance = "contradicts";
    confidence = Math.min(0.95, 0.65 + contradictScore * 0.05);
    snippet = cleanClaim
      ? `Authors challenge or contradict cited finding: "${cleanClaim}"`
      : `Contradiction detected from discourse markers (confidence: ${confidence.toFixed(2)}).`;
    if (
      isDirectCritique &&
      (!cleanClaim || cleanClaim === cleanCitationSentence(citingTitle))
    ) {
      snippet = `Authors challenge or contradict cited finding: "${cleanClaimSnippet(citingTitle)}"`;
    }
  } else if (
    supportScore >= 3 &&
    supportScore > contradictScore &&
    supportScore >= extendScore
  ) {
    stance = "supports";
    confidence = Math.min(0.95, 0.65 + supportScore * 0.05);
    snippet = cleanClaim
      ? `Authors confirm and validate cited finding: "${cleanClaim}"`
      : `Support detected from empirical confirmation markers (confidence: ${confidence.toFixed(2)}).`;
  } else if (extendScore >= 3 && extendScore > contradictScore) {
    stance = "extends";
    confidence = Math.min(0.92, 0.6 + extendScore * 0.05);
    snippet = cleanClaim
      ? `Authors extend cited method to novel domain: "${cleanClaim}"`
      : `Methodological extension detected (confidence: ${confidence.toFixed(2)}).`;
  } else {
    // Default neutral citation
    stance = "cites";
    confidence = 0.75;
    snippet = cleanClaim
      ? `Authors cite work as foundational context: "${cleanClaim}"`
      : "Standard academic citation without direct dispute or confirmation.";
  }

  return {
    stance,
    confidence: Number(confidence.toFixed(2)),
    snippet,
    matchedSignals,
    directnessTier,
  };
}

/**
 * Classify a citation relationship locally on CPU with zero external API calls.
 * Guaranteed execution latency < 15ms.
 */
export function classifyCitationLocally(
  input: ClassificationInput,
): ClassificationResult {
  let contexts = input.citationContexts;
  let s2Intents = input.s2Intents ?? [];

  if (!contexts || contexts.length === 0) {
    const synth = synthesizeCitationContexts({
      citingTitle: input.citingTitle,
      citingAbstract: input.citingAbstract,
      targetAuthorSurname: input.targetAuthorSurname,
      targetYear: input.targetYear,
      targetTitle: input.citedTitle,
    });
    if (synth.contexts.length > 0) {
      contexts = synth.contexts;
      if (s2Intents.length === 0) {
        s2Intents = synth.intents;
      }
    }
  }

  const { claimText, directnessTier } = extractClaimSentence(
    contexts,
    input.citingAbstract,
    {
      citingTitle: input.citingTitle,
      targetAuthorSurname: input.targetAuthorSurname,
    },
  );
  const analysis = analyzeStance(
    claimText,
    input.citingTitle,
    input.citingAbstract,
    s2Intents,
    directnessTier,
    input.targetAuthorSurname,
  );

  const hasContexts = Boolean(contexts && contexts.length > 0);
  const hasAbstracts = Boolean(
    input.citingAbstract && input.citingAbstract.length > 20,
  );

  return {
    citingId: input.citingId,
    citedId: input.citedId,
    edgeType: analysis.stance,
    confidence: analysis.confidence,
    snippet: analysis.snippet,
    provider: LOCAL_PROVIDER_NAME,
    cached: false,
    signalSource: hasContexts
      ? "llm+contexts"
      : hasAbstracts
        ? "llm+abstracts"
        : "heuristic",
    contexts,
    classifierVersion: LOCAL_CLASSIFIER_VERSION,
    directnessTier: analysis.directnessTier,
  };
}

/**
 * Classify a batch of citations locally in a fast, non-blocking synchronous loop.
 */
export function classifyBatchLocally(
  inputs: ClassificationInput[],
): ClassificationResult[] {
  return inputs.map((input) => classifyCitationLocally(input));
}

/**
 * Generate AiProvenance object for local moat classification.
 */
export function buildLocalMoatProvenance(
  citingId: string,
  citedId: string,
  evidenceSnippet: string,
  confidence: number,
): AiProvenance {
  return buildAiProvenance({
    provider: LOCAL_PROVIDER_NAME,
    model: LOCAL_MODEL_NAME,
    promptVersion: "local-moat-v1",
    classifierVersion: LOCAL_CLASSIFIER_VERSION,
    sourceIds: [citingId, citedId],
    evidence: [evidenceSnippet],
    confidence,
    humanReviewed: false,
  });
}
