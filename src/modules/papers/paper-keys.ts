import type { ImportedPaper } from "./types";

export function buildPaperDedupeKey(paper: ImportedPaper): string {
  if (paper.identifiers.doi) {
    return `doi:${paper.identifiers.doi}`;
  }
  if (paper.identifiers.openAlex) {
    return `openalex:${paper.identifiers.openAlex}`;
  }

  const title = paper.title?.trim().toLowerCase() || "untitled";
  const year = paper.year ?? "unknown";
  return `title:${title}|year:${year}`;
}

export function resolvePaperExploreTarget(paper: {
  openAlexId?: string | null;
  doi?: string | null;
  id: string;
}): string | null {
  if (paper.openAlexId) return paper.openAlexId;
  if (paper.doi) return paper.doi;
  return null;
}
