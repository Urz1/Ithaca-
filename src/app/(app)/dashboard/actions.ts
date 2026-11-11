"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  getOrganizationContext,
  recordAuditEvent,
  requireOrganizationContext,
} from "@/lib/organization-context";
import { PLATFORM_LIMITS, enforceMaximum } from "@/lib/platform/limits";
import { isDurableJobsEnabled } from "@/modules/jobs/job-runtime";
import { enqueueMetadataReconciliation } from "@/modules/jobs/metadata-reconciliation-job";
import {
  assertOrganizationPermission,
  assertQuotaAvailable,
  scopeToOrganization,
} from "@/lib/tenancy-policy";
import {
  emitProductEventForOrganization,
  PRODUCT_EVENTS,
} from "@/lib/platform/product-events";
import {
  isGraphSnapshotPayload,
  type GraphSnapshotPayload,
} from "@/lib/graph-snapshot";
import {
  importPapers,
  linkPaperRecordsToCollection,
  persistImportedPapers,
  resolvePaperExploreTarget,
  type PaperImportFormat,
  type PaperImportResult,
} from "@/modules/papers";

async function getSessionUserId(): Promise<string | null> {
  return (await getOrganizationContext())?.userId ?? null;
}

async function getReadableOrganizationContext() {
  const context = await getOrganizationContext();
  if (context) assertOrganizationPermission(context.role, "domain:read");
  return context;
}

async function requireScopedProject(
  projectId: string | undefined,
  organizationId: string,
): Promise<void> {
  if (!projectId) return;
  const project = await prisma.project.findFirst({
    where: scopeToOrganization(organizationId, { id: projectId }),
    select: { id: true },
  });
  if (!project) throw new Error("Project not found");
}

// =============================================================================
// PROFILE
// =============================================================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  institution?: string;
  memberSince: string;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      department: true,
      institution: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name || "Researcher",
    email: user.email,
    avatar: user.image || undefined,
    department: user.department || undefined,
    institution: user.institution || undefined,
    memberSince: user.createdAt.getFullYear().toString(),
  };
}

export async function updateProfile(data: {
  name?: string;
  department?: string;
  institution?: string;
}): Promise<UserProfile | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      department: data.department,
      institution: data.institution,
    },
  });

  return getUserProfile();
}

// =============================================================================
// PROJECTS
// =============================================================================

export interface ProjectData {
  id: string;
  title: string;
  description: string;
  graphCount: number;
  collectionCount: number;
  lastModified: string;
  isFavorite: boolean;
  color: string;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getProjects(): Promise<ProjectData[]> {
  const context = await getReadableOrganizationContext();
  if (!context) return [];

  const projects = await prisma.project.findMany({
    where: { organizationId: context.organizationId },
    include: {
      _count: { select: { collections: true, savedGraphs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    graphCount: p._count.savedGraphs,
    collectionCount: p._count.collections,
    lastModified: formatRelativeDate(p.updatedAt),
    isFavorite: p.isFavorite,
    color: p.color,
  }));
}

export async function createProject(data: {
  title: string;
  description: string;
  color: string;
}): Promise<ProjectData> {
  const context = await requireOrganizationContext("domain:write");
  const projectCount = await prisma.project.count({
    where: { organizationId: context.organizationId },
  });
  assertQuotaAvailable(
    projectCount,
    context.organization.maxProjects,
    "project",
  );

  const project = await prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      color: data.color,
      userId: context.userId,
      organizationId: context.organizationId,
    },
    include: {
      _count: { select: { collections: true, savedGraphs: true } },
    },
  });
  await recordAuditEvent(context, {
    action: "project.created",
    entityType: "Project",
    entityId: project.id,
  });

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    graphCount: project._count.savedGraphs,
    collectionCount: project._count.collections,
    lastModified: "Just now",
    isFavorite: project.isFavorite,
    color: project.color,
  };
}

export async function deleteProject(id: string): Promise<void> {
  const context = await requireOrganizationContext("domain:write");

  const deleted = await prisma.project.deleteMany({
    where: scopeToOrganization(context.organizationId, { id }),
  });
  if (deleted.count) {
    await recordAuditEvent(context, {
      action: "project.deleted",
      entityType: "Project",
      entityId: id,
    });
  }
}

export async function toggleProjectFavorite(id: string): Promise<void> {
  const context = await requireOrganizationContext("domain:write");

  const project = await prisma.project.findFirst({
    where: scopeToOrganization(context.organizationId, { id }),
    select: { isFavorite: true },
  });
  if (!project) return;

  await prisma.project.updateMany({
    where: scopeToOrganization(context.organizationId, { id }),
    data: { isFavorite: !project.isFavorite },
  });
  await recordAuditEvent(context, {
    action: "project.favorite_toggled",
    entityType: "Project",
    entityId: id,
  });
}

// =============================================================================
// COLLECTIONS
// =============================================================================

export interface CollectionData {
  id: string;
  projectId?: string;
  title: string;
  paperCount: number;
  watchEnabled: boolean;
  lastDigestAt: string | null;
  createdAt: string;
}

export async function getCollections(
  projectId?: string,
): Promise<CollectionData[]> {
  const context = await getReadableOrganizationContext();
  if (!context) return [];

  const collections = await prisma.collection.findMany({
    where: scopeToOrganization(context.organizationId, {
      ...(projectId ? { projectId } : {}),
    }),
    orderBy: { createdAt: "desc" },
  });

  return collections.map((c) => ({
    id: c.id,
    projectId: c.projectId || undefined,
    title: c.title,
    paperCount: c.paperIds.length,
    watchEnabled: c.watchEnabled,
    lastDigestAt: c.lastDigestAt ? c.lastDigestAt.toISOString() : null,
    createdAt: c.createdAt.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  }));
}

export async function setCollectionWatch(
  collectionId: string,
  enabled: boolean,
): Promise<void> {
  const context = await requireOrganizationContext("domain:write");
  const updated = await prisma.collection.updateMany({
    where: scopeToOrganization(context.organizationId, { id: collectionId }),
    data: { watchEnabled: enabled },
  });
  if (!updated.count) throw new Error("Collection not found");

  await recordAuditEvent(context, {
    action: enabled ? "collection.watch_enabled" : "collection.watch_disabled",
    entityType: "Collection",
    entityId: collectionId,
  });
}

export async function createCollection(data: {
  title: string;
  projectId?: string;
}): Promise<CollectionData> {
  const context = await requireOrganizationContext("domain:write");
  await requireScopedProject(data.projectId, context.organizationId);
  const collectionCount = await prisma.collection.count({
    where: { organizationId: context.organizationId },
  });
  assertQuotaAvailable(
    collectionCount,
    context.organization.maxCollections,
    "collection",
  );

  const collection = await prisma.collection.create({
    data: {
      title: data.title,
      projectId: data.projectId,
      userId: context.userId,
      organizationId: context.organizationId,
    },
  });
  await recordAuditEvent(context, {
    action: "collection.created",
    entityType: "Collection",
    entityId: collection.id,
  });

  return {
    id: collection.id,
    projectId: collection.projectId || undefined,
    title: collection.title,
    paperCount: 0,
    watchEnabled: false,
    lastDigestAt: null,
    createdAt: collection.createdAt.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  };
}

export async function addPaperToCollection(
  collectionId: string,
  paperId: string,
): Promise<void> {
  const context = await requireOrganizationContext("domain:write");

  const collection = await prisma.collection.findFirst({
    where: scopeToOrganization(context.organizationId, { id: collectionId }),
    select: { paperIds: true },
  });
  if (!collection) return;
  if (collection.paperIds.includes(paperId)) return;

  await prisma.collection.updateMany({
    where: scopeToOrganization(context.organizationId, { id: collectionId }),
    data: { paperIds: { push: paperId } },
  });
  await recordAuditEvent(context, {
    action: "collection.paper_added",
    entityType: "Collection",
    entityId: collectionId,
    metadata: { paperId },
  });
}

// =============================================================================
// PAPER IMPORTS
// =============================================================================

export interface PaperRecordSummary {
  id: string;
  title: string | null;
  authors: string[];
  year: number | null;
  doi: string | null;
  openAlexId: string | null;
}

export interface ImportPapersToCollectionResult {
  import: PaperImportResult;
  createdCount: number;
  updatedCount: number;
  linkedCount: number;
  collectionPaperCount: number;
}

export async function importPapersToCollection(input: {
  collectionId: string;
  format: PaperImportFormat;
  content: string;
  source?: string;
}): Promise<ImportPapersToCollectionResult> {
  const context = await requireOrganizationContext("domain:write");
  const byteLimit = enforceMaximum(
    Buffer.byteLength(input.content, "utf8"),
    PLATFORM_LIMITS.imports.maxBytes,
    "Import payload",
  );
  if (!byteLimit.allowed) {
    throw new Error(byteLimit.message);
  }

  const collection = await prisma.collection.findFirst({
    where: scopeToOrganization(context.organizationId, {
      id: input.collectionId,
    }),
    select: { id: true, paperIds: true },
  });
  if (!collection) throw new Error("Collection not found");

  const importResult = importPapers(input.format, input.content, {
    source: input.source ?? input.format,
  });
  const recordLimit = enforceMaximum(
    importResult.papers.length,
    PLATFORM_LIMITS.imports.maxRecords,
    "Imported records",
  );
  if (!recordLimit.allowed) {
    throw new Error(recordLimit.message);
  }

  const existingPaperCount = await prisma.paperRecord.count({
    where: { organizationId: context.organizationId },
  });
  assertQuotaAvailable(
    existingPaperCount + importResult.papers.length,
    context.organization.maxPaperRecords,
    "paper record",
  );

  const persisted = await prisma.$transaction(async (tx) => {
    const saved = await persistImportedPapers(tx, {
      organizationId: context.organizationId,
      userId: context.userId,
      papers: importResult.papers,
    });
    const linked = await linkPaperRecordsToCollection(tx, {
      organizationId: context.organizationId,
      collectionId: input.collectionId,
      paperRecordIds: saved.records.map((record) => record.id),
    });
    return { saved, linked };
  });

  if (isDurableJobsEnabled()) {
    const paperRecordIds = persisted.saved.records
      .filter((record) => record.doi && !record.openAlexId)
      .map((record) => record.id);
    if (paperRecordIds.length > 0) {
      await enqueueMetadataReconciliation({
        organizationId: context.organizationId,
        requestedByUserId: context.userId,
        paperRecordIds,
      }).catch((error) => {
        console.warn("[import] metadata reconciliation enqueue failed", error);
      });
    }
  }

  await recordAuditEvent(context, {
    action: "collection.papers_imported",
    entityType: "Collection",
    entityId: input.collectionId,
    metadata: {
      format: input.format,
      imported: importResult.papers.length,
      created: persisted.saved.createdCount,
      updated: persisted.saved.updatedCount,
      linked: persisted.linked.linkedCount,
      errors: importResult.errors.length,
    },
  });

  await emitProductEventForOrganization(
    {
      name: PRODUCT_EVENTS.searchCompleted,
      anonymousId: context.userId,
      properties: {
        resultCount: importResult.papers.length,
        format: input.format,
        source: "import",
      },
    },
    context.organizationId,
  );

  return {
    import: importResult,
    createdCount: persisted.saved.createdCount,
    updatedCount: persisted.saved.updatedCount,
    linkedCount: persisted.linked.linkedCount,
    collectionPaperCount: persisted.linked.paperIds.length,
  };
}

export async function getCollectionPapers(
  collectionId: string,
): Promise<PaperRecordSummary[]> {
  const context = await getReadableOrganizationContext();
  if (!context) return [];

  const collection = await prisma.collection.findFirst({
    where: scopeToOrganization(context.organizationId, { id: collectionId }),
    select: { paperIds: true },
  });
  if (!collection || collection.paperIds.length === 0) return [];

  const records = await prisma.paperRecord.findMany({
    where: {
      organizationId: context.organizationId,
      id: { in: collection.paperIds },
    },
    orderBy: { importedAt: "desc" },
  });

  return records.map((record) => ({
    id: record.id,
    title: record.title,
    authors: record.authors,
    year: record.year,
    doi: record.doi,
    openAlexId: record.openAlexId,
  }));
}

export async function getCollectionExploreTarget(
  collectionId: string,
): Promise<{ collectionTitle: string; target: string | null } | null> {
  const context = await getReadableOrganizationContext();
  if (!context) return null;

  const collection = await prisma.collection.findFirst({
    where: scopeToOrganization(context.organizationId, { id: collectionId }),
    select: { title: true, paperIds: true },
  });
  if (!collection) return null;

  if (collection.paperIds.length === 0) {
    return { collectionTitle: collection.title, target: null };
  }

  const records = await prisma.paperRecord.findMany({
    where: {
      organizationId: context.organizationId,
      id: { in: collection.paperIds },
    },
    select: { id: true, doi: true, openAlexId: true },
  });
  const recordById = new Map(records.map((record) => [record.id, record]));

  for (const paperId of collection.paperIds) {
    const record = recordById.get(paperId);
    if (!record) continue;
    const target = resolvePaperExploreTarget(record);
    if (target) {
      return { collectionTitle: collection.title, target };
    }
  }

  return { collectionTitle: collection.title, target: null };
}

// =============================================================================
// STATS
// =============================================================================

export interface DashboardStats {
  savedGraphs: number;
  savedGraphsChange?: string;
  collections: number;
  edgesCorrected: number;
  edgesCorrectedChange?: string;
}

export interface CalibrationStats {
  totalClassifications: number;
  corrections: number;
  correctionRate: number;
  lowConfidenceUnresolved: number;
  highConfidenceUntouched: number;
  agreementProxy: number;
}

export async function getStats(): Promise<DashboardStats> {
  const context = await getReadableOrganizationContext();
  if (!context) {
    return { savedGraphs: 0, collections: 0, edgesCorrected: 0 };
  }

  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [graphCount, collectionCount, correctionCount, newGraphsThisWeek] =
    await Promise.all([
      prisma.savedGraph.count({
        where: { organizationId: context.organizationId },
      }),
      prisma.collection.count({
        where: { organizationId: context.organizationId },
      }),
      prisma.citationCache.count({ where: { provider: "user-correction" } }),
      prisma.savedGraph.count({
        where: {
          organizationId: context.organizationId,
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

  return {
    savedGraphs: graphCount,
    savedGraphsChange:
      newGraphsThisWeek > 0 ? `+${newGraphsThisWeek} this week` : undefined,
    collections: collectionCount,
    edgesCorrected: correctionCount,
  };
}

/**
 * Lab-facing classifier trust metrics from CitationCache.
 * Agreement is a proxy: share of high-confidence non-corrected rows.
 */
export async function getCalibrationStats(): Promise<CalibrationStats> {
  const context = await getReadableOrganizationContext();
  if (!context) {
    return {
      totalClassifications: 0,
      corrections: 0,
      correctionRate: 0,
      lowConfidenceUnresolved: 0,
      highConfidenceUntouched: 0,
      agreementProxy: 0,
    };
  }

  const [
    totalClassifications,
    corrections,
    lowConfidenceUnresolved,
    highConfidence,
  ] = await Promise.all([
    prisma.citationCache.count(),
    prisma.citationCache.count({ where: { provider: "user-correction" } }),
    prisma.citationCache.count({
      where: {
        provider: { not: "user-correction" },
        confidence: { lt: 0.5 },
      },
    }),
    prisma.citationCache.count({
      where: {
        provider: { not: "user-correction" },
        confidence: { gte: 0.7 },
      },
    }),
  ]);

  const correctionRate =
    totalClassifications === 0 ? 0 : corrections / totalClassifications;
  const agreementProxy =
    highConfidence + corrections === 0
      ? 0
      : highConfidence / (highConfidence + corrections);

  return {
    totalClassifications,
    corrections,
    correctionRate,
    lowConfidenceUnresolved,
    highConfidenceUntouched: highConfidence,
    agreementProxy,
  };
}

// =============================================================================
// RECENT ACTIVITY
// =============================================================================

export interface RecentActivity {
  id: string;
  title: string;
  type: "graph" | "collection" | "correction";
  updated: string;
  tags: string[];
  nodeCount?: number;
  paperCount?: number;
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
  const context = await getReadableOrganizationContext();
  if (!context) return [];

  const [recentGraphs, recentCollections] = await Promise.all([
    prisma.savedGraph.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        nodeCount: true,
        updatedAt: true,
        query: true,
      },
    }),
    prisma.collection.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        paperIds: true,
        updatedAt: true,
      },
    }),
  ]);

  const items: RecentActivity[] = [
    ...recentGraphs.map((g) => ({
      id: g.id,
      title: g.title,
      type: "graph" as const,
      updated: formatRelativeDate(g.updatedAt),
      tags: ["Graph"],
      nodeCount: g.nodeCount,
    })),
    ...recentCollections.map((c) => ({
      id: c.id,
      title: c.title,
      type: "collection" as const,
      updated: formatRelativeDate(c.updatedAt),
      tags: ["Collection"],
      paperCount: c.paperIds.length,
    })),
  ];

  items.sort((a, b) => {
    const timeA = parseRelativeTime(a.updated);
    const timeB = parseRelativeTime(b.updated);
    return timeA - timeB;
  });

  return items.slice(0, 10);
}

function parseRelativeTime(s: string): number {
  if (s === "Just now") return 0;
  const match = s.match(/^(\d+)(m|h|d)/);
  if (!match) return Infinity;
  const n = parseInt(match[1]);
  switch (match[2]) {
    case "m":
      return n;
    case "h":
      return n * 60;
    case "d":
      return n * 1440;
    default:
      return Infinity;
  }
}

// =============================================================================
// CORRECTIONS (from CitationCache)
// =============================================================================

export interface CorrectionData {
  id: string;
  citingId: string;
  citedId: string;
  edgeType: string;
  date: string;
}

export async function getCorrections(): Promise<CorrectionData[]> {
  const corrections = await prisma.citationCache.findMany({
    where: { provider: "user-correction" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      citingId: true,
      citedId: true,
      edgeType: true,
      createdAt: true,
    },
  });

  return corrections.map((c) => ({
    id: c.id,
    citingId: c.citingId,
    citedId: c.citedId,
    edgeType: c.edgeType,
    date: c.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));
}

// =============================================================================
// SAVED GRAPHS
// =============================================================================

export interface SavedGraphData {
  id: string;
  title: string;
  query: string;
  nodeCount: number;
  edgeCount: number;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveGraph(data: {
  title: string;
  query: string;
  nodeCount: number;
  edgeCount: number;
  config?: Record<string, unknown>;
  projectId?: string;
}): Promise<SavedGraphData> {
  const context = await requireOrganizationContext("domain:write");
  await requireScopedProject(data.projectId, context.organizationId);
  const graphCount = await prisma.savedGraph.count({
    where: { organizationId: context.organizationId },
  });
  assertQuotaAvailable(
    graphCount,
    context.organization.maxSavedGraphs,
    "saved graph",
  );

  const graph = await prisma.savedGraph.create({
    data: {
      title: data.title,
      query: data.query,
      nodeCount: data.nodeCount,
      edgeCount: data.edgeCount,
      config: (data.config as Prisma.InputJsonValue) ?? undefined,
      projectId: data.projectId || undefined,
      userId: context.userId,
      organizationId: context.organizationId,
    },
  });
  await recordAuditEvent(context, {
    action: "saved_graph.created",
    entityType: "SavedGraph",
    entityId: graph.id,
  });

  await emitProductEventForOrganization(
    {
      name: PRODUCT_EVENTS.graphSaved,
      anonymousId: context.userId,
      properties: {
        nodeCount: data.nodeCount,
        edgeCount: data.edgeCount,
      },
    },
    context.organizationId,
  );

  if (graphCount === 0) {
    await emitProductEventForOrganization(
      {
        name: PRODUCT_EVENTS.firstGraphReady,
        anonymousId: context.userId,
        properties: {
          nodeCount: data.nodeCount,
          edgeCount: data.edgeCount,
        },
      },
      context.organizationId,
    );
  }

  let projectTitle: string | undefined;
  if (graph.projectId) {
    const project = await prisma.project.findFirst({
      where: scopeToOrganization(context.organizationId, {
        id: graph.projectId,
      }),
      select: { title: true },
    });
    projectTitle = project?.title;
  }

  return {
    id: graph.id,
    title: graph.title,
    query: graph.query,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    projectId: graph.projectId || undefined,
    projectTitle,
    createdAt: formatRelativeDate(graph.createdAt),
    updatedAt: formatRelativeDate(graph.updatedAt),
  };
}

export async function deleteSavedGraph(id: string): Promise<void> {
  const context = await requireOrganizationContext("domain:write");

  const deleted = await prisma.savedGraph.deleteMany({
    where: scopeToOrganization(context.organizationId, { id }),
  });
  if (deleted.count) {
    await recordAuditEvent(context, {
      action: "saved_graph.deleted",
      entityType: "SavedGraph",
      entityId: id,
    });
  }
}

/**
 * Persist a frozen graph snapshot that can be reopened via /explore?graph=<id>.
 */
export async function createGraphSnapshot(input: {
  title: string;
  query: string;
  snapshot: GraphSnapshotPayload;
}): Promise<SavedGraphData> {
  return saveGraph({
    title: input.title,
    query: input.query || "snapshot",
    nodeCount: input.snapshot.nodes.length,
    edgeCount: input.snapshot.edges.length,
    config: input.snapshot as unknown as Record<string, unknown>,
  });
}

export async function getGraphSnapshot(id: string): Promise<{
  id: string;
  title: string;
  query: string;
  snapshot: GraphSnapshotPayload | null;
} | null> {
  const context = await getReadableOrganizationContext();
  if (!context) return null;

  const graph = await prisma.savedGraph.findFirst({
    where: scopeToOrganization(context.organizationId, { id }),
  });
  if (!graph) return null;

  return {
    id: graph.id,
    title: graph.title,
    query: graph.query,
    snapshot: isGraphSnapshotPayload(graph.config) ? graph.config : null,
  };
}

export async function getSavedGraphs(): Promise<SavedGraphData[]> {
  const context = await getReadableOrganizationContext();
  if (!context) return [];

  const graphs = await prisma.savedGraph.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { updatedAt: "desc" },
  });

  const projectIds = [
    ...new Set(graphs.map((g) => g.projectId).filter(Boolean) as string[]),
  ];
  const projects =
    projectIds.length > 0
      ? await prisma.project.findMany({
          where: scopeToOrganization(context.organizationId, {
            id: { in: projectIds },
          }),
          select: { id: true, title: true },
        })
      : [];
  const projectMap = new Map(projects.map((p) => [p.id, p.title]));

  return graphs.map((g) => ({
    id: g.id,
    title: g.title,
    query: g.query,
    nodeCount: g.nodeCount,
    edgeCount: g.edgeCount,
    projectId: g.projectId || undefined,
    projectTitle: g.projectId ? projectMap.get(g.projectId) : undefined,
    createdAt: formatRelativeDate(g.createdAt),
    updatedAt: formatRelativeDate(g.updatedAt),
  }));
}
