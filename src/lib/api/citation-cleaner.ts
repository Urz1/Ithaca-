/**
 * Citation Cleaner Utility
 *
 * Removes bracketed and parenthetical academic citations from text.
 * E.g., "According to Smith et al. [1, 2], our results..." -> "According to Smith et al., our results..."
 */

export function cleanCitationSentence(rawText: string): string {
  if (!rawText) return "";
  let text = rawText;

  // Strip script and style tags completely
  text = text.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    " ",
  );
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Remove bracket citations like [1], [12, 13], [1-3]
  text = text.replace(/\[\s*\d+(?:[,\s–-]+\d+)*\s*\]/g, "");

  // Remove parenthetical author citations like (Smith et al., 2020) or (Smith & Doe, 2019)
  text = text.replace(
    /\((?:[A-Z][a-zA-Z]+(?:\s+et\s+al\.)?(?:,\s*\d{4}[a-z]?)*(?:;\s*)?)+\)/g,
    "",
  );

  // Normalize duplicate spaces and whitespace
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Clean and polish an extracted claim snippet for presentation in callouts and docks.
 * Strips boilerplate AI classifier intros, enumeration markers (e.g. '1. ', '[1]'),
 * and nested or unbalanced quotation marks.
 */
export function cleanClaimSnippet(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();

  // Strip boilerplate preamble prefixes added by classifiers
  text = text.replace(
    /^(?:authors\s+(?:challenge|contradict|refute|confirm|validate|extend|cite)\s+[^:]*:\s*)+/i,
    "",
  );

  // Strip leading list enumeration markers e.g. '1. "', '1. ', '[1] ', '(1) '
  text = text.replace(/^\s*(?:\d+[\.\)]|\[\d+\])\s*["“]?/g, "");

  // Strip surrounding quotes
  text = text.replace(/^["“'‘\s]+/, "").replace(/["”'’\s]+$/, "");

  // If the text contains multiple enumerated items e.g. '1. "..." 2. "..."', take the first complete one
  const secondEnumIndex = text.search(/\s+\d+[\.\)]\s*["“]/);
  if (secondEnumIndex > 20) {
    text = text.slice(0, secondEnumIndex).trim();
    text = text.replace(/["”'’\s]+$/, "");
  }

  // Final trim and whitespace normalization
  return text.replace(/\s+/g, " ").trim();
}
