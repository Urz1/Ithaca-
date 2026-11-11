import type { OrganizationPlan, OrganizationRole } from "@prisma/client";
import { getTestPrisma } from "./db";
import { planQuotaFields } from "@/lib/platform/org-plans";

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${Date.now()}`;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface TestMembership {
  user: TestUser;
  organization: TestOrganization;
  role: OrganizationRole;
}

export async function createTestUser(input?: {
  email?: string;
  name?: string;
}): Promise<TestUser> {
  const prisma = getTestPrisma();
  const email = input?.email ?? `${nextId("user")}@lab.edu`;
  const user = await prisma.user.create({
    data: {
      email,
      name: input?.name ?? "Test Researcher",
      emailVerified: true,
    },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? "Test Researcher",
  };
}

export async function createTestOrganization(input?: {
  name?: string;
  plan?: OrganizationPlan;
  maxMembers?: number;
  maxAiRequests?: number;
  allowedEmailDomains?: string[];
  billingCustomerId?: string;
  subscriptionStatus?: string;
  isSovereignExempt?: boolean;
}): Promise<TestOrganization> {
  const prisma = getTestPrisma();
  const slug = nextId("org");
  const plan = input?.plan ?? "SOLO";
  const quotas = planQuotaFields(plan);
  const organization = await prisma.organization.create({
    data: {
      name: input?.name ?? "Test Lab",
      slug,
      allowedEmailDomains: input?.allowedEmailDomains ?? [],
      billingCustomerId: input?.billingCustomerId,
      subscriptionStatus: input?.subscriptionStatus ?? "active",
      isSovereignExempt: input?.isSovereignExempt ?? false,
      ...quotas,
      ...(input?.maxMembers !== undefined
        ? { maxMembers: input.maxMembers }
        : {}),
      ...(input?.maxAiRequests !== undefined
        ? { maxAiRequests: input.maxAiRequests }
        : {}),
    },
  });
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  };
}

export async function createTestMembership(input: {
  user: TestUser;
  organization: TestOrganization;
  role?: OrganizationRole;
}): Promise<TestMembership> {
  const prisma = getTestPrisma();
  await prisma.membership.create({
    data: {
      userId: input.user.id,
      organizationId: input.organization.id,
      role: input.role ?? "OWNER",
    },
  });
  return {
    user: input.user,
    organization: input.organization,
    role: input.role ?? "OWNER",
  };
}

export async function createTestCollection(input: {
  user: TestUser;
  organization: TestOrganization;
  title?: string;
  watchEnabled?: boolean;
  paperIds?: string[];
}) {
  const prisma = getTestPrisma();
  return prisma.collection.create({
    data: {
      title: input.title ?? "Seed collection",
      userId: input.user.id,
      organizationId: input.organization.id,
      watchEnabled: input.watchEnabled ?? false,
      paperIds: input.paperIds ?? [],
    },
  });
}

export async function createTestPaperRecord(input: {
  user: TestUser;
  organization: TestOrganization;
  openAlexId?: string;
  title?: string;
}) {
  const prisma = getTestPrisma();
  const openAlexId = input.openAlexId ?? "W999";
  return prisma.paperRecord.create({
    data: {
      organizationId: input.organization.id,
      userId: input.user.id,
      dedupeKey: `openalex:${openAlexId}`,
      openAlexId,
      title: input.title ?? "Integration test paper",
      authors: ["Test Author"],
      year: 2024,
    },
  });
}

export async function createTestStoredArtifact(input: {
  organization: TestOrganization;
  artifactId?: string;
  filename?: string;
}) {
  const prisma = getTestPrisma();
  const id = input.artifactId ?? nextId("artifact");
  return prisma.storedArtifact.create({
    data: {
      id,
      organizationId: input.organization.id,
      filename: input.filename ?? "export.json",
      contentType: "application/json",
      pathname: `/artifacts/${id}`,
      url: `https://blob.test/${id}`,
      sizeBytes: 128,
    },
  });
}

export async function createTestSavedGraph(input: {
  user: TestUser;
  organization: TestOrganization;
  title?: string;
}) {
  const prisma = getTestPrisma();
  return prisma.savedGraph.create({
    data: {
      title: input.title ?? "Frozen debate map",
      query: "test-query",
      nodeCount: 2,
      edgeCount: 1,
      userId: input.user.id,
      organizationId: input.organization.id,
      config: {
        version: 1,
        nodes: [{ id: "n1" }],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      },
    },
  });
}

export async function createTestEdgeComment(input: {
  user: TestUser;
  organization: TestOrganization;
  citingId?: string;
  citedId?: string;
  body?: string;
}) {
  const prisma = getTestPrisma();
  return prisma.edgeComment.create({
    data: {
      organizationId: input.organization.id,
      actorId: input.user.id,
      citingId: input.citingId ?? "W111",
      citedId: input.citedId ?? "W222",
      body: input.body ?? "Team note on this edge",
    },
  });
}

export async function createTestBackgroundJob(input: {
  user: TestUser;
  organization: TestOrganization;
  type?: string;
}) {
  const prisma = getTestPrisma();
  return prisma.backgroundJob.create({
    data: {
      organizationId: input.organization.id,
      userId: input.user.id,
      type: input.type ?? "graph_export",
      idempotencyKey: nextId("job"),
      status: "QUEUED",
    },
  });
}

export async function createTwoOrganizationFixture() {
  const ownerA = await createTestUser({
    email: `owner-a-${Date.now()}@lab.edu`,
  });
  const ownerB = await createTestUser({
    email: `owner-b-${Date.now()}@college.edu`,
  });
  const orgA = await createTestOrganization({ name: "Lab Alpha" });
  const orgB = await createTestOrganization({ name: "Lab Beta" });
  const membershipA = await createTestMembership({
    user: ownerA,
    organization: orgA,
    role: "OWNER",
  });
  const membershipB = await createTestMembership({
    user: ownerB,
    organization: orgB,
    role: "OWNER",
  });
  return { ownerA, ownerB, orgA, orgB, membershipA, membershipB };
}
