#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..", "..");
const seedDir = join(rootDir, "e2e", ".seed");
const authDir = join(rootDir, "e2e", ".auth");

const PILOT_EMAIL = "pilot-owner@ithaca.test";
const PILOT_PASSWORD = "PilotPass123!";
const MEMBER_EMAIL = "pilot-member@ithaca.test";
const VIEWER_EMAIL = "pilot-viewer@ithaca.test";
const ONBOARDING_EMAIL = "pilot-onboarding@ithaca.test";
const SHARED_PASSWORD = "PilotPass123!";

const GRAPH_SNAPSHOT = {
  kind: "ithaca-graph-snapshot",
  version: 1,
  query: "pilot-seed-debate",
  capturedAt: new Date().toISOString(),
  nodes: [
    {
      id: "W100",
      label: "Pilot citing paper",
      title: "Pilot citing paper",
      x: 0,
      y: 0,
      size: 8,
      year: 2024,
    },
    {
      id: "W200",
      label: "Pilot cited paper",
      title: "Pilot cited paper",
      x: 120,
      y: 0,
      size: 8,
      year: 2023,
    },
  ],
  edges: [
    {
      id: "e-pilot-1",
      source: "W100",
      target: "W200",
      edgeType: "contradicts",
      label: "contradicts",
      confidence: 0.62,
      snippet: "These findings conflict with the cited work.",
    },
  ],
};

async function upsertCredentialUser(prisma, input) {
  const hashed = await hashPassword(input.password);
  const hasCompletedOnboarding = input.hasCompletedOnboarding ?? true;
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      emailVerified: true,
      hasCompletedOnboarding,
    },
    create: {
      email: input.email,
      name: input.name,
      emailVerified: true,
      hasCompletedOnboarding,
    },
  });

  await prisma.account.deleteMany({
    where: { userId: user.id, providerId: "credential" },
  });
  await prisma.account.create({
    data: {
      userId: user.id,
      providerId: "credential",
      accountId: input.email,
      password: hashed,
    },
  });

  return user;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed pilot e2e data");
  }

  const prisma = new PrismaClient();
  try {
    const owner = await upsertCredentialUser(prisma, {
      email: PILOT_EMAIL,
      password: PILOT_PASSWORD,
      name: "Pilot Owner",
    });
    const member = await upsertCredentialUser(prisma, {
      email: MEMBER_EMAIL,
      password: SHARED_PASSWORD,
      name: "Pilot Member",
    });
    const viewer = await upsertCredentialUser(prisma, {
      email: VIEWER_EMAIL,
      password: SHARED_PASSWORD,
      name: "Pilot Viewer",
    });
    const onboardingUser = await upsertCredentialUser(prisma, {
      email: ONBOARDING_EMAIL,
      password: SHARED_PASSWORD,
      name: "Pilot Onboarding",
      hasCompletedOnboarding: false,
    });

    const org = await prisma.organization.upsert({
      where: { slug: "pilot-lab-e2e" },
      update: {
        plan: "LAB",
        maxMembers: 15,
        maxAiRequests: 2000,
      },
      create: {
        name: "Pilot Lab E2E",
        slug: "pilot-lab-e2e",
        plan: "LAB",
        maxMembers: 15,
        maxProjects: 50,
        maxCollections: 200,
        maxSavedGraphs: 200,
        maxPaperRecords: 25_000,
        maxAiRequests: 2000,
        maxApiRequests: 5000,
      },
    });

    for (const [user, role] of [
      [owner, "OWNER"],
      [member, "MEMBER"],
      [viewer, "VIEWER"],
      [onboardingUser, "MEMBER"],
    ]) {
      await prisma.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: user.id,
          },
        },
        update: { role },
        create: {
          organizationId: org.id,
          userId: user.id,
          role,
        },
      });
    }

    const paperRecord = await prisma.paperRecord.upsert({
      where: {
        organizationId_dedupeKey: {
          organizationId: org.id,
          dedupeKey: "openalex:W100",
        },
      },
      update: {
        openAlexId: "W100",
        title: "Pilot citing paper",
      },
      create: {
        organizationId: org.id,
        userId: owner.id,
        dedupeKey: "openalex:W100",
        openAlexId: "W100",
        title: "Pilot citing paper",
        authors: ["Pilot Author"],
        year: 2024,
      },
    });

    const collection = await prisma.collection.upsert({
      where: { id: "pilot-e2e-collection" },
      update: {
        title: "Pilot watched collection",
        paperIds: [paperRecord.id],
        watchEnabled: true,
        organizationId: org.id,
        userId: owner.id,
      },
      create: {
        id: "pilot-e2e-collection",
        title: "Pilot watched collection",
        paperIds: [paperRecord.id],
        watchEnabled: true,
        organizationId: org.id,
        userId: owner.id,
      },
    });

    const savedGraph = await prisma.savedGraph.upsert({
      where: { id: "pilot-e2e-graph" },
      update: {
        title: "Pilot frozen debate map",
        query: GRAPH_SNAPSHOT.query,
        nodeCount: GRAPH_SNAPSHOT.nodes.length,
        edgeCount: GRAPH_SNAPSHOT.edges.length,
        config: GRAPH_SNAPSHOT,
        organizationId: org.id,
        userId: owner.id,
      },
      create: {
        id: "pilot-e2e-graph",
        title: "Pilot frozen debate map",
        query: GRAPH_SNAPSHOT.query,
        nodeCount: GRAPH_SNAPSHOT.nodes.length,
        edgeCount: GRAPH_SNAPSHOT.edges.length,
        config: GRAPH_SNAPSHOT,
        organizationId: org.id,
        userId: owner.id,
      },
    });

    mkdirSync(seedDir, { recursive: true });
    mkdirSync(authDir, { recursive: true });

    const manifest = {
      ownerEmail: PILOT_EMAIL,
      ownerPassword: PILOT_PASSWORD,
      memberEmail: MEMBER_EMAIL,
      viewerEmail: VIEWER_EMAIL,
      onboardingEmail: ONBOARDING_EMAIL,
      sharedPassword: SHARED_PASSWORD,
      organizationId: org.id,
      graphId: savedGraph.id,
      collectionId: collection.id,
      storageStatePath: "e2e/.auth/pilot-owner.json",
      memberStorageStatePath: "e2e/.auth/pilot-member.json",
      viewerStorageStatePath: "e2e/.auth/pilot-viewer.json",
      onboardingStorageStatePath: "e2e/.auth/pilot-onboarding.json",
    };

    writeFileSync(
      join(seedDir, "pilot.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    console.log(
      "Pilot e2e seed ready:",
      manifest.graphId,
      manifest.collectionId,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
