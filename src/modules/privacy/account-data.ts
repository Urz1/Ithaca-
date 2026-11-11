import { prisma } from "@/lib/prisma";
import { scopeToOrganization } from "@/lib/tenancy-policy";

export interface UserDataExport {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    department: string | null;
    institution: string | null;
    createdAt: string;
  };
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    role: string;
  }>;
  projects: Array<{ id: string; title: string; description: string }>;
  collections: Array<{ id: string; title: string; paperCount: number }>;
  savedGraphs: Array<{ id: string; title: string; query: string }>;
  paperRecords: Array<{
    id: string;
    title: string | null;
    doi: string | null;
    openAlexId: string | null;
  }>;
  corrections: Array<{
    citingId: string;
    citedId: string;
    edgeType: string;
    createdAt: string;
  }>;
}

export async function exportUserData(userId: string): Promise<UserDataExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      department: true,
      institution: true,
      createdAt: true,
      memberships: {
        include: { organization: { select: { id: true, name: true } } },
      },
      projects: {
        select: {
          id: true,
          title: true,
          description: true,
          organizationId: true,
        },
      },
      collections: {
        select: { id: true, title: true, paperIds: true, organizationId: true },
      },
      savedGraphs: {
        select: { id: true, title: true, query: true, organizationId: true },
      },
      paperRecords: {
        select: {
          id: true,
          title: true,
          doi: true,
          openAlexId: true,
          organizationId: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const organizationIds = user.memberships.map(
    (membership) => membership.organizationId,
  );

  const corrections =
    organizationIds.length > 0
      ? await prisma.citationCache.findMany({
          where: { provider: "user-correction" },
          orderBy: { createdAt: "desc" },
          take: 500,
        })
      : [];

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      institution: user.institution,
      createdAt: user.createdAt.toISOString(),
    },
    memberships: user.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      role: membership.role,
    })),
    projects: user.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
    })),
    collections: user.collections.map((collection) => ({
      id: collection.id,
      title: collection.title,
      paperCount: collection.paperIds.length,
    })),
    savedGraphs: user.savedGraphs.map((graph) => ({
      id: graph.id,
      title: graph.title,
      query: graph.query,
    })),
    paperRecords: user.paperRecords.map((record) => ({
      id: record.id,
      title: record.title,
      doi: record.doi,
      openAlexId: record.openAlexId,
    })),
    corrections: corrections.map((correction) => ({
      citingId: correction.citingId,
      citedId: correction.citedId,
      edgeType: correction.edgeType,
      createdAt: correction.createdAt.toISOString(),
    })),
  };
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id: true,
          personalOwnerId: true,
          memberships: { select: { id: true, userId: true, role: true } },
        },
      },
    },
  });

  for (const membership of memberships) {
    const organization = membership.organization;
    const owners = organization.memberships.filter(
      (entry) => entry.role === "OWNER",
    );
    const isPersonalOrg = organization.personalOwnerId === userId;
    const isLastOwner =
      membership.role === "OWNER" &&
      owners.length === 1 &&
      owners[0]?.userId === userId;

    if (!isPersonalOrg && isLastOwner) {
      throw new Error(
        "Transfer organization ownership before deleting your account",
      );
    }
  }

  await prisma.user.delete({
    where: { id: userId },
  });
}

export async function deleteOrganizationDataForUser(
  userId: string,
  organizationId: string,
): Promise<void> {
  await prisma.project.deleteMany({
    where: scopeToOrganization(organizationId, { userId }),
  });
  await prisma.collection.deleteMany({
    where: scopeToOrganization(organizationId, { userId }),
  });
  await prisma.savedGraph.deleteMany({
    where: scopeToOrganization(organizationId, { userId }),
  });
}
