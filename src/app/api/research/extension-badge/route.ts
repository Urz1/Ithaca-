import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-request-id",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: NextRequest) {
  const context = createApiContext(request);
  const { searchParams } = new URL(request.url);
  const doi = searchParams.get("doi")?.trim();
  const title = searchParams.get("title")?.trim();
  const version = searchParams.get("version")?.trim() || null;

  if (!doi && !title) {
    return apiError(
      "INVALID_REQUEST",
      "Either doi or title parameter is required",
      context,
      {
        headers: CORS_HEADERS,
      },
    );
  }

  try {
    // 1. Locate paper in database by DOI (indexed equality), then arXiv pattern or title fallback
    const arxivMatch = doi ? doi.match(/([0-9]{4}\.[0-9]{4,5})/i) : null;
    const arxivId = arxivMatch ? arxivMatch[1] : null;
    let paperRecords: Awaited<ReturnType<typeof prisma.paperRecord.findMany>> =
      [];
    if (doi) {
      paperRecords = await prisma.paperRecord.findMany({
        where: { doi: { equals: doi, mode: "insensitive" } },
        take: 5,
      });
    }

    if (paperRecords.length === 0 && (arxivId || title)) {
      paperRecords = await prisma.paperRecord.findMany({
        where: {
          OR: [
            ...(arxivId
              ? [{ doi: { contains: arxivId, mode: "insensitive" as const } }]
              : []),
            ...(title
              ? [{ title: { contains: title, mode: "insensitive" as const } }]
              : []),
          ],
        },
        take: 5,
      });
    }

    const paperRecord =
      paperRecords.find((r) => Boolean(r.openAlexId)) ??
      paperRecords[0] ??
      null;

    // 2. Resolve target IDs for citation stance lookup
    const targetIdsSet = new Set<string>();
    if (doi) {
      targetIdsSet.add(doi);
      targetIdsSet.add(doi.toLowerCase());
    }
    if (arxivId) {
      targetIdsSet.add(arxivId);
      targetIdsSet.add(`arXiv.${arxivId}`);
      targetIdsSet.add(`10.48550/arXiv.${arxivId}`);
      targetIdsSet.add(`10.48550/arxiv.${arxivId}`);
      if (version) {
        targetIdsSet.add(`${arxivId}${version}`);
        targetIdsSet.add(`arXiv.${arxivId}${version}`);
        targetIdsSet.add(`10.48550/arXiv.${arxivId}${version}`);
      }
    }
    for (const rec of paperRecords) {
      if (rec.id) targetIdsSet.add(rec.id);
      if (rec.openAlexId) targetIdsSet.add(rec.openAlexId);
      if (rec.doi) {
        targetIdsSet.add(rec.doi);
        targetIdsSet.add(rec.doi.toLowerCase());
      }
    }

    const targetIds = Array.from(targetIdsSet);
    let citations: {
      edgeType: string;
      snippet: string | null;
      confidence: number | null;
    }[] = [];
    if (targetIds.length > 0) {
      citations = await prisma.citationCache.findMany({
        where: {
          OR: [{ citedId: { in: targetIds } }, { citingId: { in: targetIds } }],
        },
        select: { edgeType: true, snippet: true, confidence: true },
        orderBy: { confidence: "desc" },
      });
    }

    // 3. Aggregate stance counts, epistemic weights & key snippets
    const supports = citations.filter((c) => c.edgeType === "supports").length;
    const contradicts = citations.filter(
      (c) => c.edgeType === "contradicts",
    ).length;
    const extendsCount = citations.filter(
      (c) => c.edgeType === "extends",
    ).length;
    const cites = citations.filter((c) => c.edgeType === "cites").length;
    const total = supports + contradicts + extendsCount + cites;

    // Calculate confidence-weighted epistemic stance score
    const weightedSupports = citations
      .filter((c) => c.edgeType === "supports")
      .reduce((acc, c) => acc + (c.confidence ?? 0.8), 0);
    const weightedContradicts = citations
      .filter((c) => c.edgeType === "contradicts")
      .reduce((acc, c) => acc + (c.confidence ?? 0.8), 0);
    const weightedExtends = citations
      .filter((c) => c.edgeType === "extends")
      .reduce((acc, c) => acc + (c.confidence ?? 0.8), 0);

    const highConfidenceDisputes = citations.filter(
      (c) => c.edgeType === "contradicts" && (c.confidence ?? 0) >= 0.85,
    ).length;

    const disputeSeverity: "critical" | "moderate" | "none" =
      highConfidenceDisputes > 0
        ? "critical"
        : contradicts > 0
          ? "moderate"
          : "none";

    const topDispute = citations.find(
      (c) => c.edgeType === "contradicts" && Boolean(c.snippet),
    );
    const topExtension = citations.find(
      (c) => c.edgeType === "extends" && Boolean(c.snippet),
    );

    const effectiveDoi = paperRecord?.doi ?? doi;
    let canonicalUrl = effectiveDoi
      ? `/explore?doi=${encodeURIComponent(effectiveDoi)}`
      : `/explore?q=${encodeURIComponent(title || "")}`;
    if (version) {
      canonicalUrl += `&version=${encodeURIComponent(version)}`;
    }

    return apiSuccess(
      {
        found: Boolean(paperRecord || total > 0),
        doi: paperRecord?.doi ?? doi ?? null,
        title: paperRecord?.title ?? title ?? null,
        queryVersion: version,
        supports,
        contradicts,
        extends: extendsCount,
        cites,
        total,
        weightedScore: {
          supports: Number(weightedSupports.toFixed(2)),
          contradicts: Number(weightedContradicts.toFixed(2)),
          extends: Number(weightedExtends.toFixed(2)),
        },
        disputeSeverity,
        highConfidenceDisputes,
        isSovereignIndex: paperRecord?.isSovereignIndex ?? false,
        canonicalUrl,
        topDisputeSnippet: topDispute?.snippet ?? null,
        topExtensionSnippet: topExtension?.snippet ?? null,
      },
      context,
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[research/extension-badge]", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to resolve extension badge data",
      context,
      {
        headers: CORS_HEADERS,
      },
    );
  }
}
