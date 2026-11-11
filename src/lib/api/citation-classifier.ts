/**
 * Citation Classifier
 *
 * Classifies the relationship between two academic papers as:
 * - supports: Paper A builds on, confirms, or validates Paper B
 * - contradicts: Paper A challenges, refutes, or disagrees with Paper B
 * - extends: Paper A applies Paper B to a new domain or generalizes it
 *
 * Uses LLM with database caching — each pair is classified once and cached forever.
 */

import { getLLMRouter, type LLMMessage } from "./llm-router";
import { prisma } from "@/lib/prisma";
import { classifyCitationLocally } from "./local-classifier";
import { cleanCitationSentence, cleanClaimSnippet } from "./citation-cleaner";

// =============================================================================
// TYPES
// =============================================================================

export interface ClassificationInput {
  citingId: string; // OpenAlex ID
  citedId: string; // OpenAlex ID
  citingTitle: string;
  citingAbstract: string;
  citedTitle: string;
  citedAbstract: string;
  // Semantic Scholar citation context enrichment (Phase 2)
  citationContexts?: string[]; // Actual sentences from citing paper referencing cited paper
  s2Intents?: string[]; // S2 intent labels: "Background", "Methodology", "ResultComparison"
  targetAuthorSurname?: string;
  targetYear?: number;
}

export interface ClassificationResult {
  citingId: string;
  citedId: string;
  edgeType: "supports" | "contradicts" | "extends" | "cites" | "unknown";
  confidence: number; // 0.0 - 1.0
  snippet: string; // Key sentence explaining the relationship
  provider: string; // Which LLM classified it
  cached: boolean; // Whether this was a cache hit
  /** What data the classifier actually had */
  signalSource:
    | "llm+contexts"
    | "llm+abstracts"
    | "llm+titles"
    | "heuristic"
    | "user-correction"
    | "ithaca-local-moat"
    | "default";
  /** S2 citation context sentences used as input (if any) */
  contexts?: string[];
  /** Version of the classifier that generated this result */
  classifierVersion?: number;
  /** Epistemic directness tier: 1 = direct replication/comment, 2 = finding critique, 3 = disciplinary context */
  directnessTier?: 1 | 2 | 3;
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

/**
 * Primary prompt — used when Semantic Scholar citation context sentences are available.
 *
 * Two-step approach:
 *   Step 1: Extract the specific claim the citing authors make about the cited paper.
 *   Step 2: Classify the rhetorical stance based on that claim.
 *
 * The snippet produced here is the extracted claim — grounded in an actual sentence
 * from the paper, not AI-generated text. This serves as the atom for Layer 2
 * (claim-level cross-paper matching).
 */
const CLASSIFICATION_PROMPT = `You are classifying the rhetorical stance of a citing paper toward a cited paper — specifically, what the citing authors claim about the cited work based on in-text citation sentences.

STEP 1 — Extract the claim:
From the CITATION CONTEXT SENTENCES below, identify the specific empirical claim the citing authors make about the cited paper's findings. Write it in one concise sentence (max 25 words) starting with "Authors claim..." or "Authors find...". If the sentence is purely background with no claim, write "Authors cite as background reference."

STEP 2 — Classify the stance:
Based on that extracted claim, classify as:
- "supports"    — Authors explicitly confirm, validate, or agree with the cited paper's specific finding
- "contradicts" — Authors explicitly challenge, refute, or present counter-evidence to the cited paper
- "extends"     — Authors apply the cited paper's method or framework to a meaningfully new domain or problem
- "cites"       — Routine background reference, method use, or no clear directional stance

Confidence rules:
- 0.8+ only when the citation sentence contains explicit agreement/disagreement language
- 0.5–0.7 for directional but ambiguous signals
- Use "cites" with 0.8 confidence when no clear stance is evident — do not guess

CRITICAL RULES:
- You MUST have strong, explicit evidence to classify as supports/contradicts/extends. Default to "cites".
- CITATION CONTEXT SENTENCES are your PRIMARY evidence.
- Proposing an alternative is NOT "contradicts" — there must be explicit disagreement with the cited finding.
- Using a method is NOT "extends" — extension requires applying it to a new domain with novel contribution.
- Pay attention to negation: "does not support", "no evidence for", "failed to replicate" = contradiction.
- CANONICAL CRITIQUE TITLES: If the citing paper's title explicitly indicates a critique or rebuttal of the cited author (e.g. "Piaget on play: A critique", "Comment on Bem", "A Critique of..."), this is a direct theoretical critique and MUST be classified as "contradicts" (confidence >= 0.85).
- INSTRUMENTAL CITATION FALLACY: Distinguish between using a cited author to refute a third-party target versus refuting the cited author themselves. For example, if authors use or apply the cited author's framework to refute school curriculum standards or another theory, the cited author is being SUPPORTED or EXTENDED as an authoritative framework, NOT contradicted.

Respond with ONLY valid JSON: {"edgeType": "...", "confidence": 0.0, "snippet": "Authors claim..."}`;

/**
 * Abstracts-only prompt — used when no S2 citation context is available.
 *
 * This is an inference from two summaries, not extraction from in-text evidence.
 * Confidence is capped at 0.55 (see maxConfidence below).
 * The UI surfaces an "Inferred from abstracts" warning for these edges.
 */
const ABSTRACTS_ONLY_PROMPT = `You are inferring the likely rhetorical relationship between two academic papers using only their titles and abstracts. No direct citation sentences are available.

STEP 1 — Summarize what each paper claims:
- Citing paper claims: [one sentence from its abstract's main finding]
- Cited paper claims: [one sentence from its abstract's main finding]

STEP 2 — Infer the relationship:
Based on these claims, which best describes the likely stance of the citing paper toward the cited paper:
- "supports"    — The citing paper's finding directly confirms the cited paper's finding
- "contradicts" — The citing paper's finding directly opposes the cited paper's finding
- "extends"     — The citing paper applies the cited paper's approach to a meaningfully new context
- "cites"       — No clear directional signal; the abstracts are unrelated or ambiguous

Confidence rules:
- Max 0.55 for any non-"cites" classification — this is inference, not observation
- EXCEPTION: If the citing title is an explicit comment, rebuttal, or replication of the cited paper (e.g. "Comment on [Author]", "Replication of [Author]"), confidence can be up to 0.95
- Use 0.8 for "cites" when genuinely no signal exists

IMPORTANT:
- You are INFERRING. It is acceptable to infer when the abstracts point in a direction, but label your snippet as inference.
- Start the snippet with: "Abstracts suggest authors..."
- Two papers on the same topic with similar methods are NOT automatically "supports" — they may be independent.
- Negative framing ("unlike previous work", "in contrast to") signals contradiction.
- If genuinely ambiguous, use "cites" — it is always better to be honest than to invent a relationship.

Respond with ONLY valid JSON: {"edgeType": "...", "confidence": 0.0, "snippet": "Abstracts suggest authors..."}`;

/**
 * High-precision batch classification prompt.
 * Evaluates multiple citation pairs in a single LLM invocation to slash latency,
 * eliminate rate limits, and provide consistent, few-shot calibrated reasoning.
 */
const BATCH_CLASSIFICATION_PROMPT = `You are an expert academic bibliometric and epistemological classifier mapping scientific consensus, theoretical extension, and active empirical debates.
You will evaluate a batch of numbered citations. For each citation [ID: N], determine the rhetorical stance of the CITING paper toward the CITED paper.

EVALUATION LABELS:
- "supports": Citing authors explicitly confirm, validate, replicate, or corroborate the cited paper's specific finding.
- "contradicts": Citing authors explicitly challenge, refute, fail to replicate, or present counter-evidence to the cited work.
- "extends": Citing authors apply the cited methodology or theoretical framework to a novel domain, or use the cited author as an authoritative weapon to attack another policy/framework.
- "cites": Routine background reference, method usage without extension, disciplinary meta-review, or no clear directional evaluation.

CRITICAL DISAMBIGUATION RULES (FEW-SHOT GROUNDING):
1. INSTRUMENTAL CITATION FALLACY: Distinguish between using a cited author to refute a third-party target versus refuting the cited author themselves.
   Example: If teachers use Piaget's developmental theories to refute state curriculum standards, Piaget is being EXTENDED/SUPPORTED as an authoritative framework, NOT contradicted. Classify as "extends" (or "cites"), NOT "contradicts".
2. NULL HYPOTHESIS REFUTATIONS: In empirical science, "supporting the null hypothesis" (H0) or finding "null effect" means the cited effect failed to appear.
   Example: Wagenmakers et al. finding that Bayesian analysis "supports the null hypothesis" of no precognition is an empirical REFUTATION of Bem. Classify as "contradicts" (confidence >= 0.90, directnessTier: 1).
3. CANONICAL THEORETICAL CRITIQUE TITLES: If the citing paper's title explicitly indicates a critique of the cited author (e.g. "Piaget on play: A critique", "Comment on Bem", "A Critique of [Target]"), this is a direct theoretical critique. Classify as "contradicts" (confidence >= 0.85, directnessTier: 1) even if the in-text context sentence is descriptive.
4. EPISTEMIC DIRECTNESS TIERS:
   - Tier 1: Direct empirical replication attempt or published critique targeting the cited work.
   - Tier 2: Specific finding evaluation or methodological extension.
   - Tier 3: General disciplinary context or meta-review without direct finding evaluation.
5. CLEAN SNIPPETS: Write a single, clean, polished analytical sentence (max 25 words). NEVER include raw enumeration markers (like "1. ", "[1] ") or redundant quotes.

Respond with ONLY valid JSON:
{
  "classifications": [
    {
      "id": 0,
      "edgeType": "supports" | "contradicts" | "extends" | "cites",
      "confidence": 0.85,
      "snippet": "Authors challenge or contradict cited finding: ...",
      "directnessTier": 1 | 2 | 3
    }
  ]
}`;

// =============================================================================
// JSON SANITIZER
// =============================================================================

/**
 * Sanitize LLM JSON output that may be wrapped in markdown code fences,
 * have trailing commas, or contain other common LLM formatting artifacts.
 */
function sanitizeJSON(raw: string): string {
  let s = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  s = s.replace(/^```(?:json|JSON)?\s*\n?/m, "").replace(/\n?\s*```\s*$/m, "");

  // Extract the first JSON object {...} or array [...] if surrounded by other text
  const match = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    s = match[1];
  }

  // Remove trailing commas before closing braces/brackets: {"a": 1,} → {"a": 1}
  s = s.replace(/,\s*([\]}])/g, "$1");

  return s.trim();
}

// =============================================================================
// CLASSIFIER
// =============================================================================

/**
 * Current classifier version — bump when prompt or gate logic changes to invalidate stale cache.
 * v10: LLM-First Core Engine with Batch Prompting and Epistemic Calibration.
 */
export const CLASSIFIER_VERSION = 10;
export const USER_CORRECTION_VERSION = 999;

function isCacheEntryUsable(
  cached: {
    classifierVersion?: number;
    provider: string;
    confidence?: number;
    snippet?: string;
  },
  input?: ClassificationInput,
): boolean {
  if (cached.provider === "user-correction") return true;
  if (cached.classifierVersion !== CLASSIFIER_VERSION) return false;
  // If cached entry has low confidence / inferential abstract snippet, but input now has rich in-text contexts, upgrade it!
  if (
    (cached.confidence ?? 0) < 0.7 &&
    input?.citationContexts &&
    input.citationContexts.length > 0
  ) {
    return false;
  }
  return true;
}

/**
 * Classify a single citation relationship.
 * Uses evidence-gated logic:
 *   - S2 "Background" intent or no S2 data → "cites" (don't guess)
 *   - S2 "Methodology" only → "cites" (method use ≠ intellectual extension)
 *   - S2 "ResultComparison" or Methodology+ResultComparison → full LLM classification
 *   - Abstracts only (no S2) → LLM inference, confidence capped at 0.55
 *   - Titles only → always "cites"
 */
/**
 * Classify a chunk (e.g. 5–6 items) of citation pairs in a single LLM invocation.
 * Uses few-shot prompt calibrated for instrumental usage, null hypotheses, and theoretical critiques.
 */
export async function classifyChunkWithLLM(
  chunk: ClassificationInput[],
): Promise<ClassificationResult[]> {
  if (chunk.length === 0) return [];

  const results: (ClassificationResult | undefined)[] = new Array(chunk.length);

  // 1. Sovereign Local Mode override
  if (process.env.CLASSIFIER_MODE === "local") {
    return Promise.all(
      chunk.map(async (input) => {
        const local = classifyCitationLocally(input);
        await cacheClassification(
          local,
          input.citationContexts,
          input.s2Intents,
        );
        return local;
      }),
    );
  }

  // 2. Evidence Gating: evaluate items that can be resolved deterministically
  for (let i = 0; i < chunk.length; i++) {
    const input = chunk[i];
    const hasContexts =
      Boolean(input.citationContexts && input.citationContexts.length > 0);
    const hasCitingAbstract =
      Boolean(input.citingAbstract && input.citingAbstract.length > 20);
    const hasCitedAbstract =
      Boolean(input.citedAbstract && input.citedAbstract.length > 20);
    const hasAbstracts = hasCitingAbstract || hasCitedAbstract;
    const intents = input.s2Intents ?? [];
    const hasS2Intents = intents.length > 0;
    const hasResultComparison = intents.includes("ResultComparison");
    const hasMethodology = intents.includes("Methodology");
    const hasBackgroundOnly =
      intents.length > 0 && intents.every((intent) => intent === "Background");

    // Gate 1: Titles only
    if (!hasContexts && !hasAbstracts) {
      const res: ClassificationResult = {
        citingId: input.citingId,
        citedId: input.citedId,
        edgeType: "cites",
        confidence: 0.9,
        snippet:
          "Citation relationship — insufficient evidence for detailed classification.",
        provider: "evidence-gate",
        cached: false,
        signalSource: "default",
      };
      results[i] = res;
      await cacheClassification(res, input.citationContexts, input.s2Intents);
      continue;
    }

    // Gate 2: S2 Background only
    if ((hasContexts || hasS2Intents) && hasBackgroundOnly) {
      const res: ClassificationResult = {
        citingId: input.citingId,
        citedId: input.citedId,
        edgeType: "cites",
        confidence: 0.85,
        snippet:
          "Background citation — referenced as prior work without explicit evaluation.",
        provider: "evidence-gate/s2-background",
        cached: false,
        signalSource: "llm+contexts",
        contexts: input.citationContexts,
      };
      results[i] = res;
      await cacheClassification(res, input.citationContexts, input.s2Intents);
      continue;
    }

    // Gate 3: S2 Methodology only without ResultComparison
    if ((hasContexts || hasS2Intents) && hasMethodology && !hasResultComparison) {
      const res: ClassificationResult = {
        citingId: input.citingId,
        citedId: input.citedId,
        edgeType: "cites",
        confidence: 0.8,
        snippet: "Methodology citation — uses methods from the cited work.",
        provider: "evidence-gate/s2-methodology-use",
        cached: false,
        signalSource: "llm+contexts",
        contexts: input.citationContexts,
      };
      results[i] = res;
      await cacheClassification(res, input.citationContexts, input.s2Intents);
      continue;
    }
  }

  // 3. Pending items that require LLM reasoning
  const pending: { input: ClassificationInput; index: number }[] = [];
  for (let i = 0; i < chunk.length; i++) {
    if (!results[i]) {
      pending.push({ input: chunk[i], index: i });
    }
  }

  if (pending.length === 0) {
    return results as ClassificationResult[];
  }

  // 4. Build single batch prompt for pending citations
  const promptItems = pending
    .map(({ input, index }) => {
      let itemStr = `[CITATION ID: ${index}]\nCITING PAPER: "${input.citingTitle}"\nCITING ABSTRACT: ${input.citingAbstract ? input.citingAbstract.slice(0, 600) : "No abstract available."}\nCITED PAPER: "${input.citedTitle}"\nCITED ABSTRACT: ${input.citedAbstract ? input.citedAbstract.slice(0, 600) : "No abstract available."}`;
      if (input.citationContexts && input.citationContexts.length > 0) {
        itemStr += `\nIN-TEXT CITATION CONTEXT SENTENCES:\n${input.citationContexts.map((ctx, cIdx) => `  (${cIdx + 1}) "${cleanCitationSentence(ctx)}"`).join("\n")}`;
      }
      if (input.s2Intents && input.s2Intents.length > 0) {
        itemStr += `\nSEMANTIC SCHOLAR INTENTS: ${input.s2Intents.join(", ")}`;
      }
      return itemStr;
    })
    .join("\n\n---\n\n");

  try {
    const router = getLLMRouter();
    const response = await router.chat(
      [
        { role: "system", content: BATCH_CLASSIFICATION_PROMPT },
        { role: "user", content: promptItems },
      ],
      true,
    );

    const sanitized = sanitizeJSON(response.content);
    const parsed = JSON.parse(sanitized);
    const rawList: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.classifications)
        ? parsed.classifications
        : Array.isArray(parsed?.results)
          ? parsed.results
          : typeof parsed === "object" && parsed !== null
            ? [parsed]
            : [];

    const parsedMap = new Map<number, any>();
    rawList.forEach((item, pos) => {
      const id = typeof item.id === "number" ? item.id : pending[pos]?.index;
      if (id !== undefined) parsedMap.set(id, item);
    });

    for (const { input, index } of pending) {
      const item = parsedMap.get(index);
      if (!item) {
        const local = classifyCitationLocally(input);
        results[index] = local;
        await cacheClassification(
          local,
          input.citationContexts,
          input.s2Intents,
        );
        continue;
      }

      const validTypes = [
        "supports",
        "contradicts",
        "extends",
        "cites",
      ] as const;
      let edgeType: "supports" | "contradicts" | "extends" | "cites" =
        validTypes.includes(item.edgeType) ? item.edgeType : "cites";
      if ((item.edgeType as string) === "unknown") edgeType = "cites";

      const hasContexts = Boolean(
        input.citationContexts && input.citationContexts.length > 0,
      );
      const citingTitleLower = (input.citingTitle || "").toLowerCase();
      const cleanSurname = input.targetAuthorSurname?.trim().toLowerCase();
      const isDirectTitleCritique =
        citingTitleLower.includes("comment on") ||
        citingTitleLower.includes("rebuttal to") ||
        citingTitleLower.includes("reply to") ||
        citingTitleLower.includes("response to") ||
        citingTitleLower.includes("failure to replicate") ||
        citingTitleLower.includes("failures to replicate") ||
        citingTitleLower.includes("failed to replicate") ||
        (Boolean(cleanSurname) &&
          cleanSurname!.length >= 3 &&
          citingTitleLower.includes(cleanSurname!));

      const maxConfidence =
        hasContexts || isDirectTitleCritique
          ? 1.0
          : input.s2Intents && input.s2Intents.length > 0
            ? 0.7
            : 0.55;

      const rawConfidence = Math.max(
        0,
        Math.min(1, Number(item.confidence) || 0.5),
      );
      const confidence =
        edgeType === "cites"
          ? Math.max(0.5, rawConfidence)
          : Math.min(maxConfidence, rawConfidence);

      const snippet = cleanClaimSnippet(
        item.snippet || "Citation relationship evaluated by AI.",
      );
      const directnessTier =
        item.directnessTier === 1 ||
        item.directnessTier === 2 ||
        item.directnessTier === 3
          ? item.directnessTier
          : undefined;

      const classification: ClassificationResult = {
        citingId: input.citingId,
        citedId: input.citedId,
        edgeType,
        confidence,
        snippet,
        provider: `${response.provider}/${response.model}`,
        cached: false,
        signalSource: hasContexts
          ? "llm+contexts"
          : input.s2Intents && input.s2Intents.length > 0
            ? "llm+contexts"
            : "llm+abstracts",
        contexts: input.citationContexts,
        directnessTier,
      };

      results[index] = classification;
      await cacheClassification(
        classification,
        input.citationContexts,
        input.s2Intents,
      );
    }
  } catch (err) {
    console.warn(
      "[classifyChunkWithLLM] Batch LLM classification failed, falling back to sovereign local moat:",
      err,
    );
    for (const { input, index } of pending) {
      const local = classifyCitationLocally(input);
      results[index] = local;
      await cacheClassification(
        local,
        input.citationContexts,
        input.s2Intents,
      );
    }
  }

  // Final sanity check: ensure no undefined slots
  for (let i = 0; i < chunk.length; i++) {
    if (!results[i]) {
      const local = classifyCitationLocally(chunk[i]);
      results[i] = local;
    }
  }

  return results as ClassificationResult[];
}

export async function classifyCitation(
  input: ClassificationInput,
): Promise<ClassificationResult> {
  // 1. Check cache — skip stale entries from old classifier versions
  const cached = await getCachedClassification(input.citingId, input.citedId);
  if (cached && isCacheEntryUsable(cached, input)) {
    return { ...cached, cached: true, contexts: input.citationContexts };
  }

  const [result] = await classifyChunkWithLLM([input]);
  return result;
}


// =============================================================================
// HEURISTIC CLASSIFIER (local fallback when LLM is unavailable)
// =============================================================================

/**
 * Negation prefixes that flip a support signal into a contradiction.
 * E.g., "does not support" should NOT count as support.
 */
const NEGATION_PREFIXES = [
  "no ",
  "not ",
  "does not ",
  "do not ",
  "did not ",
  "cannot ",
  "failed to ",
  "lack of ",
  "absence of ",
  "without ",
  "insufficient ",
  "little ",
  "unable to ",
  "hardly ",
  "neither ",
  "never ",
];

/**
 * Phrases that strongly signal contradiction/refutation.
 * Order matters — longer/more specific phrases first to avoid substring issues.
 */
const CONTRADICT_SIGNALS: { phrase: string; weight: number }[] = [
  // Strong explicit refutation signals (weight 3)
  { phrase: "fail to replicate", weight: 3 },
  { phrase: "failed to replicate", weight: 3 },
  { phrase: "could not replicate", weight: 3 },
  { phrase: "not replicated", weight: 3 },
  { phrase: "does not support", weight: 3 },
  { phrase: "do not support", weight: 3 },
  { phrase: "did not support", weight: 3 },
  { phrase: "no evidence", weight: 3 },
  { phrase: "no association", weight: 3 },
  { phrase: "no correlation", weight: 3 },
  { phrase: "no causal", weight: 3 },
  { phrase: "no link", weight: 3 },
  { phrase: "no relationship", weight: 3 },
  { phrase: "no connection", weight: 3 },
  { phrase: "no significant", weight: 2 },
  { phrase: "no effect", weight: 2 },
  { phrase: "no benefit", weight: 2 },
  { phrase: "not effective", weight: 2 },
  { phrase: "not associated", weight: 3 },
  { phrase: "not related", weight: 3 },
  // Direct contradiction verbs (weight 2)
  { phrase: "contradict", weight: 2 },
  { phrase: "refute", weight: 3 },
  { phrase: "disprove", weight: 3 },
  { phrase: "debunk", weight: 3 },
  { phrase: "rebut", weight: 3 },
  { phrase: "retract", weight: 3 },
  { phrase: "retracted", weight: 3 },
  { phrase: "fraudulent", weight: 3 },
  { phrase: "fabricat", weight: 3 },
  { phrase: "misconduct", weight: 3 },
  { phrase: "reject", weight: 2 },
  { phrase: "invalidate", weight: 2 },
  { phrase: "overturned", weight: 2 },
  // Disagreement language (weight 1–2)
  { phrase: "inconsistent with", weight: 2 },
  { phrase: "contrary to", weight: 2 },
  { phrase: "in contrast to", weight: 1 },
  { phrase: "disagree", weight: 2 },
  { phrase: "dispute", weight: 2 },
  { phrase: "flawed", weight: 2 },
  { phrase: "erroneous", weight: 2 },
  { phrase: "incorrect", weight: 2 },
  { phrase: "ineffective", weight: 2 },
  { phrase: "no improvement", weight: 1 },
  { phrase: "did not improve", weight: 1 },
  { phrase: "negative results", weight: 1 },
  { phrase: "opposite", weight: 1 },
  { phrase: "reverses", weight: 1 },
  { phrase: "undermines", weight: 2 },
  { phrase: "questionable", weight: 1 },
  { phrase: "unreliable", weight: 2 },
  { phrase: "unfounded", weight: 2 },
  { phrase: "unsubstantiated", weight: 2 },
  { phrase: "false", weight: 1 },
  { phrase: "myth", weight: 2 },
  { phrase: "safety of", weight: 1 }, // "safety of vaccines" = refuting danger claims
];

/**
 * Phrases that signal support/confirmation.
 * Using full phrases to avoid false positives (e.g., "support" alone matching "does not support").
 */
const SUPPORT_SIGNALS: { phrase: string; weight: number }[] = [
  { phrase: "confirms", weight: 2 },
  { phrase: "confirmed", weight: 2 },
  { phrase: "validates", weight: 2 },
  { phrase: "validated", weight: 2 },
  { phrase: "replicated successfully", weight: 2 },
  { phrase: "successfully reproduced", weight: 2 },
  { phrase: "corroborate", weight: 2 },
  { phrase: "consistent with", weight: 1 },
  { phrase: "in agreement with", weight: 2 },
  { phrase: "in line with", weight: 1 },
  { phrase: "builds on", weight: 1 },
  { phrase: "building on", weight: 1 },
  { phrase: "as shown by", weight: 1 },
  { phrase: "demonstrated by", weight: 1 },
  { phrase: "verified", weight: 2 },
  { phrase: "strengthens", weight: 2 },
  { phrase: "reinforces", weight: 2 },
  { phrase: "lends support", weight: 2 },
  { phrase: "provides evidence for", weight: 2 },
  { phrase: "further evidence for", weight: 2 },
  { phrase: "supports the", weight: 2 },
  { phrase: "supporting the", weight: 2 },
  { phrase: "provides support for", weight: 2 },
];

/**
 * Check if a phrase match is negated by a preceding negation word.
 * Returns true if the match is negated (i.e., should flip meaning).
 */
function isNegated(text: string, matchIndex: number): boolean {
  // Look at the 30 chars before the match for negation prefixes
  const preceding = text.substring(Math.max(0, matchIndex - 30), matchIndex);
  return NEGATION_PREFIXES.some((neg) => preceding.includes(neg));
}

/**
 * Heuristic keyword-based classification — runs locally with no API.
 *
 * Key design decisions:
 * 1. ONLY citing paper text is scanned — the cited paper's own language
 *    (e.g., negative-result papers describing their own findings) must NOT
 *    influence the classification of how ANOTHER paper cites them.
 * 2. Citation context sentences (from S2) are the strongest signal if available.
 * 3. Negation detection — "does not support" counts as contradiction, not support.
 * 4. Weighted signals — "refute" is stronger than "challenge".
 * 5. Phrase-based matching — "support" alone won't match; "supports the" will.
 * 6. Defaults to "extends" with low confidence when no signals found (unknown).
 */
export function heuristicClassify(
  input: ClassificationInput,
): ClassificationResult {
  // Build text from citing paper ONLY — cited paper text is excluded
  // to prevent directionality errors
  const citingText = [input.citingTitle, input.citingAbstract]
    .join(" ")
    .toLowerCase();

  // Citation context sentences are the most reliable signal
  const contextText = input.citationContexts
    ? input.citationContexts.join(" ").toLowerCase()
    : "";

  let contradictScore = 0;
  let supportScore = 0;
  let contradictSnippet = "";
  let supportSnippet = "";

  // Helper: scan text for signals
  function scanSignals(text: string, multiplier: number) {
    for (const signal of CONTRADICT_SIGNALS) {
      const idx = text.indexOf(signal.phrase);
      if (idx !== -1) {
        contradictScore += signal.weight * multiplier;
        if (!contradictSnippet) contradictSnippet = signal.phrase;
      }
    }

    for (const signal of SUPPORT_SIGNALS) {
      const idx = text.indexOf(signal.phrase);
      if (idx !== -1) {
        // Check for negation — "does not support the" should flip to contradiction
        if (isNegated(text, idx)) {
          contradictScore += signal.weight * multiplier;
          if (!contradictSnippet)
            contradictSnippet = `negated: ${signal.phrase}`;
        } else {
          supportScore += signal.weight * multiplier;
          if (!supportSnippet) supportSnippet = signal.phrase;
        }
      }
    }
  }

  // Citation contexts get highest weight (3x) — these are actual in-text sentences
  if (contextText) {
    scanSignals(contextText, 3);
  }

  // Citing paper abstract gets standard weight (2x)
  scanSignals(citingText, 2);

  // NOTE: cited paper text is NOT scanned — it causes directionality errors

  let edgeType: "supports" | "contradicts" | "extends" | "cites";
  let confidence: number;
  let snippet: string;

  // Threshold-based decision with clear hierarchy
  if (contradictScore >= 4 || (contradictScore >= 2 && supportScore === 0)) {
    edgeType = "contradicts";
    confidence = Math.min(0.5 + contradictScore * 0.05, 0.9);
    snippet = `Likely contradicts — detected signals: "${contradictSnippet}" (heuristic)`;
  } else if (contradictScore > supportScore && contradictScore >= 2) {
    edgeType = "contradicts";
    confidence = Math.min(0.4 + (contradictScore - supportScore) * 0.05, 0.8);
    snippet = `Likely contradicts — detected signals: "${contradictSnippet}" (heuristic)`;
  } else if (
    supportScore >= 4 ||
    (supportScore >= 2 && contradictScore === 0)
  ) {
    edgeType = "supports";
    confidence = Math.min(0.4 + supportScore * 0.05, 0.8);
    snippet = `Likely supports — detected signals: "${supportSnippet}" (heuristic)`;
  } else if (supportScore > contradictScore && supportScore >= 2) {
    edgeType = "supports";
    confidence = Math.min(0.35 + (supportScore - contradictScore) * 0.05, 0.7);
    snippet = `Likely supports — detected signals: "${supportSnippet}" (heuristic)`;
  } else {
    // No strong signals — neutral citation (was "unknown", now "cites")
    edgeType = "cites";
    confidence = 0.7;
    snippet =
      "Citation relationship — no strong directional signals detected (heuristic)";
  }

  return {
    citingId: input.citingId,
    citedId: input.citedId,
    edgeType,
    confidence,
    snippet,
    provider: "heuristic",
    cached: false,
    signalSource: "heuristic" as const,
  };
}

/**
 * Classify multiple citation relationships in parallel using batch LLM prompting.
 * Cache-first: only calls LLM for uncached pairs, grouping uncached into chunks of 5.
 */
export async function classifyBatch(
  inputs: ClassificationInput[],
  concurrency = 5,
): Promise<ClassificationResult[]> {
  if (inputs.length === 0) return [];

  // 1. Bulk cache lookup
  const cachedMap = await getCachedClassifications(
    inputs.map((i) => ({ citingId: i.citingId, citedId: i.citedId })),
  );

  const results: (ClassificationResult | undefined)[] = new Array(inputs.length);
  const uncached: { input: ClassificationInput; originalIndex: number }[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const key = `${input.citingId}->${input.citedId}`;
    const cached = cachedMap.get(key);
    if (cached && isCacheEntryUsable(cached, input)) {
      results[i] = {
        ...cached,
        cached: true,
        contexts: input.citationContexts ?? cached.contexts,
      };
    } else {
      uncached.push({ input, originalIndex: i });
    }
  }

  // 2. Process uncached in LLM batch chunks of 5
  const chunkSize = Math.max(1, concurrency);
  for (let i = 0; i < uncached.length; i += chunkSize) {
    const chunkSlice = uncached.slice(i, i + chunkSize);
    const chunkInputs = chunkSlice.map((x) => x.input);
    const chunkResults = await classifyChunkWithLLM(chunkInputs);

    for (let k = 0; k < chunkSlice.length; k++) {
      results[chunkSlice[k].originalIndex] = chunkResults[k];
    }

    if (i + chunkSize < uncached.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Safety fallback for any missed entries
  for (let i = 0; i < inputs.length; i++) {
    if (!results[i]) {
      results[i] = classifyCitationLocally(inputs[i]);
    }
  }

  return results as ClassificationResult[];
}

/**
 * Retrieve multiple cached classifications in a single query.
 * Filters out stale cache entries from prior classifier versions.
 */
export async function getCachedClassifications(
  pairs: { citingId: string; citedId: string }[],
): Promise<Map<string, ClassificationResult>> {
  const result = new Map<string, ClassificationResult>();
  if (pairs.length === 0) return result;

  try {
    const cachedEntries = await prisma.citationCache.findMany({
      where: {
        OR: pairs.map((p) => ({
          citingId: p.citingId,
          citedId: p.citedId,
        })),
      },
    });

    for (const cached of cachedEntries) {
      const isUsable =
        cached.provider === "user-correction" ||
        cached.classifierVersion === CLASSIFIER_VERSION;

      if (!isUsable) continue;

      const key = `${cached.citingId}->${cached.citedId}`;
      result.set(key, {
        citingId: cached.citingId,
        citedId: cached.citedId,
        edgeType: cached.edgeType as ClassificationResult["edgeType"],
        confidence: cached.confidence,
        snippet: cached.snippet,
        provider: cached.provider,
        cached: true,
        signalSource: (cached.provider === "user-correction"
          ? "user-correction"
          : "default") as ClassificationResult["signalSource"],
        contexts: cached.contexts
          ? (JSON.parse(cached.contexts) as string[])
          : undefined,
        classifierVersion: cached.classifierVersion ?? 1,
      });
    }
  } catch (err) {
    console.warn("[getCachedClassifications] DB cache query failed:", err);
  }

  return result;
}

/**
 * Stream citation classifications in chunks.
 * Immediate flush for cached entries, then batch LLM prompts for uncached pairs.
 */
export async function classifyBatchStream(
  inputs: ClassificationInput[],
  onChunk: (results: ClassificationResult[]) => Promise<void> | void,
  concurrency = 5,
  signal?: AbortSignal,
): Promise<{
  total: number;
  cached: number;
  classified: number;
  failed: number;
}> {
  // 1. Bulk cache lookup
  const cachedMap = await getCachedClassifications(
    inputs.map((i) => ({ citingId: i.citingId, citedId: i.citedId })),
  );

  const uncachedInputs: ClassificationInput[] = [];
  const initialChunk: ClassificationResult[] = [];

  for (const input of inputs) {
    const key = `${input.citingId}->${input.citedId}`;
    const cached = cachedMap.get(key);
    if (cached && isCacheEntryUsable(cached, input)) {
      initialChunk.push({
        ...cached,
        cached: true,
        contexts: input.citationContexts ?? cached.contexts,
      });
    } else {
      uncachedInputs.push(input);
    }
  }

  let cachedCount = initialChunk.length;
  let classifiedCount = 0;
  let failedCount = 0;

  if (initialChunk.length > 0) {
    await onChunk(initialChunk);
  }

  if (signal?.aborted) {
    return {
      total: inputs.length,
      cached: cachedCount,
      classified: classifiedCount,
      failed: failedCount,
    };
  }

  // 2. Process uncached in LLM batch chunks
  const batchSize = Math.max(1, concurrency);
  const queue = [...uncachedInputs];
  while (queue.length > 0) {
    if (signal?.aborted) break;

    const chunk = queue.splice(0, batchSize);
    const chunkResults = await classifyChunkWithLLM(chunk);

    for (const res of chunkResults) {
      if (res.cached) {
        cachedCount++;
      } else if (res.provider === "fallback") {
        failedCount++;
      } else {
        classifiedCount++;
      }
    }

    if (chunkResults.length > 0) {
      await onChunk(chunkResults);
    }

    if (queue.length > 0 && !signal?.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    total: inputs.length,
    cached: cachedCount,
    classified: classifiedCount,
    failed: failedCount,
  };
}

// =============================================================================
// DATABASE CACHE
// =============================================================================

async function getCachedClassification(
  citingId: string,
  citedId: string,
): Promise<
  (Omit<ClassificationResult, "cached"> & { classifierVersion: number }) | null
> {
  try {
    const cached = await prisma.citationCache.findUnique({
      where: {
        citingId_citedId: { citingId, citedId },
      },
    });

    if (!cached) return null;

    return {
      citingId: cached.citingId,
      citedId: cached.citedId,
      edgeType: cached.edgeType as ClassificationResult["edgeType"],
      confidence: cached.confidence,
      snippet: cached.snippet,
      provider: cached.provider,
      signalSource: (cached.provider === "user-correction"
        ? "user-correction"
        : "default") as ClassificationResult["signalSource"],
      contexts: cached.contexts
        ? (JSON.parse(cached.contexts) as string[])
        : undefined,
      classifierVersion: cached.classifierVersion ?? 1,
    };
  } catch {
    // If DB is not set up yet or table doesn't exist, skip cache
    return null;
  }
}

async function cacheClassification(
  result: ClassificationResult,
  citationContexts?: string[],
  s2Intents?: string[],
): Promise<void> {
  try {
    const existing = await prisma.citationCache.findUnique({
      where: {
        citingId_citedId: {
          citingId: result.citingId,
          citedId: result.citedId,
        },
      },
      select: { provider: true },
    });
    if (existing?.provider === "user-correction") {
      return;
    }

    await prisma.citationCache.upsert({
      where: {
        citingId_citedId: {
          citingId: result.citingId,
          citedId: result.citedId,
        },
      },
      update: {
        edgeType: result.edgeType,
        confidence: result.confidence,
        snippet: result.snippet,
        provider: result.provider,
        contexts: citationContexts ? JSON.stringify(citationContexts) : null,
        s2Intents: s2Intents ? s2Intents.join(",") : null,
        classifierVersion: CLASSIFIER_VERSION,
      },
      create: {
        citingId: result.citingId,
        citedId: result.citedId,
        edgeType: result.edgeType,
        confidence: result.confidence,
        snippet: result.snippet,
        provider: result.provider,
        contexts: citationContexts ? JSON.stringify(citationContexts) : null,
        s2Intents: s2Intents ? s2Intents.join(",") : null,
        classifierVersion: CLASSIFIER_VERSION,
      },
    });
  } catch {
    // Cache write failure is non-fatal — next time it'll re-classify
    console.warn(
      "[Citation Cache] Failed to write cache, will retry next time",
    );
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get cache statistics for monitoring.
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  byType: Record<string, number>;
  byProvider: Record<string, number>;
}> {
  try {
    const [total, supports, contradicts, extends_] = await Promise.all([
      prisma.citationCache.count(),
      prisma.citationCache.count({ where: { edgeType: "supports" } }),
      prisma.citationCache.count({ where: { edgeType: "contradicts" } }),
      prisma.citationCache.count({ where: { edgeType: "extends" } }),
    ]);

    return {
      totalCached: total,
      byType: { supports, contradicts, extends: extends_ },
      byProvider: {}, // Could add groupBy query if needed
    };
  } catch {
    return { totalCached: 0, byType: {}, byProvider: {} };
  }
}
