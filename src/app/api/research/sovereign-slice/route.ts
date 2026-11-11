import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import {
  requireApiAuth,
  checkApiRateLimit,
  isRejection,
} from "@/lib/api/api-auth";
import { getOptionalOrganizationContextFromRequest } from "@/lib/api/request-organization";
import { SOVEREIGN_REPOSITORIES } from "@/lib/api/oai-pmh-client";

const sovereignSliceQuerySchema = z.object({
  institution: z.string().optional().default("all"),
  query: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(request: NextRequest) {
  const context = createApiContext(request);
  const orgContext = await getOptionalOrganizationContextFromRequest(request);

  // Auth check
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) {
    return authResult;
  }

  // Rate limit
  const rateLimitResult = await checkApiRateLimit(
    authResult.user.id,
    "sovereign-slice",
    60,
    context,
    orgContext?.organizationId,
  );
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const { searchParams } = new URL(request.url);
  const parseResult = sovereignSliceQuerySchema.safeParse({
    institution: searchParams.get("institution") || "all",
    query: searchParams.get("query") || undefined,
    limit: searchParams.get("limit") || 50,
  });

  if (!parseResult.success) {
    return apiError(
      "INVALID_REQUEST",
      parseResult.error.errors[0]?.message || "Invalid query parameters",
      context,
    );
  }

  const { institution, query, limit } = parseResult.data;

  // Build filter
  const whereClause: Record<string, unknown> = {
    isSovereignIndex: true,
  };

  if (institution && institution !== "all") {
    whereClause.institutionSlug = institution.toLowerCase();
  }

  if (query && query.trim()) {
    whereClause.OR = [
      { title: { contains: query.trim(), mode: "insensitive" } },
      { abstract: { contains: query.trim(), mode: "insensitive" } },
      { authors: { has: query.trim() } },
    ];
  }

  // If scoped to org, allow either global sovereign or org-specific
  if (orgContext?.organizationId) {
    whereClause.organizationId = orgContext.organizationId;
  }

  // Fetch sovereign records
  const records = await prisma.paperRecord.findMany({
    where: whereClause,
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  // Calculate institutional breakdown across available records
  const allSovereignCount = await prisma.paperRecord.count({
    where: { isSovereignIndex: true },
  });

  const institutionCounts = await prisma.paperRecord.groupBy({
    by: ["institutionSlug"],
    where: { isSovereignIndex: true },
    _count: { id: true },
  });

  const breakdown: Record<string, number> = {};
  institutionCounts.forEach((item) => {
    if (item.institutionSlug) {
      breakdown[item.institutionSlug] = item._count.id;
    }
  });

  // Build lightweight canvas-compatible graph nodes
  const nodes = records.map((r, index) => {
    const inst = r.institutionSlug
      ? SOVEREIGN_REPOSITORIES[r.institutionSlug]
      : null;
    return {
      id: r.id,
      paperId: r.id,
      label: r.title ? r.title.slice(0, 36) + "..." : "Sovereign Thesis",
      title: r.title || "Untitled Sovereign Research",
      authors: r.authors.join(", "),
      year: r.year || new Date().getFullYear(),
      venue: r.venue || inst?.name || "Ethiopian National Repository",
      abstract: r.abstract || undefined,
      openAccessUrl: r.repositoryHandle || r.pdfUrl || undefined,
      isSovereignIndex: true,
      institutionSlug: r.institutionSlug || "aau",
      institutionName: inst?.name || "Ethiopian Academic Archive",
      repositoryHandle: r.repositoryHandle || undefined,
      advisors: r.advisorNames,
      citations: 0,
      references: 0,
      supports: 0,
      refutes: 0,
      cluster: 0,
      x: Math.cos((index / records.length) * 2 * Math.PI) * 150,
      y: Math.sin((index / records.length) * 2 * Math.PI) * 150,
      size: 15,
      color: "#059669", // Emerald green for sovereign national literature
    };
  });

  return apiSuccess(
    {
      institution: institution || "all",
      count: records.length,
      totalSovereignInDb: allSovereignCount,
      institutionBreakdown: breakdown,
      papers: records.map((r) => ({
        id: r.id,
        title: r.title,
        authors: r.authors,
        advisors: r.advisorNames,
        year: r.year,
        abstract: r.abstract,
        institutionSlug: r.institutionSlug,
        repositoryHandle: r.repositoryHandle,
        pdfUrl: r.pdfUrl,
        doi: r.doi,
        importedAt: r.importedAt,
      })),
      nodes,
      edges: [],
    },
    context,
  );
}
