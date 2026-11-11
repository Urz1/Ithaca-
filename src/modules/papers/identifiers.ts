const DOI_PATTERN = /^10\.\d{4,9}\/\S+$/i;
const OPENALEX_PATTERN = /^W\d+$/i;

function trimIdentifier(value: string): string {
  return value.trim().replace(/[.,;]+$/, "");
}

export function canonicalizeDoi(value: string): string | undefined {
  const canonical = trimIdentifier(value)
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .toLowerCase();

  return DOI_PATTERN.test(canonical) ? canonical : undefined;
}

export function canonicalizeOpenAlexId(value: string): string | undefined {
  const canonical = trimIdentifier(value)
    .replace(/^https?:\/\/openalex\.org\//i, "")
    .toUpperCase();

  return OPENALEX_PATTERN.test(canonical) ? canonical : undefined;
}
