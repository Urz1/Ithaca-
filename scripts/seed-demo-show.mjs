#!/usr/bin/env node
/**
 * Ithaca — Master Demo Show Seeder
 *
 * Sets up a complete, presentation-ready demonstration environment showcase:
 * 1. Global Commercial Researcher: Dr. Elena Rostova (SOLO_PRO, USD FX)
 * 2. Sovereign Ethiopian Researcher: Dr. Dawit Bekele (INSTITUTION, 0 ETB under Proclamation 1396/2025)
 * 3. Landmark AI & Malaria citation graphs with instant cache hits (< 20ms)
 * 4. Sovereign EthERNet/NADRE papers with emerald badges
 * 5. Community calibration badges (👨‍🔬 Verified) & Offline Local Moat badges (⚡ 0 FX)
 * 6. Zotero bidirectional sync with active scientific dispute alert
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();
const CLASSIFIER_VERSION = 8;
const DEMO_PASSWORD = "DemoShow123!";

async function upsertUserWithAccount(data) {
  const hashedPassword = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {
      name: data.name,
      institution: data.institution,
      department: data.department,
      emailVerified: true,
      hasCompletedOnboarding: true,
    },
    create: {
      email: data.email,
      name: data.name,
      institution: data.institution,
      department: data.department,
      emailVerified: true,
      hasCompletedOnboarding: true,
    },
  });

  await prisma.account.deleteMany({
    where: { userId: user.id, providerId: "credential" },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      providerId: "credential",
      accountId: data.email,
      password: hashedPassword,
    },
  });

  return user;
}

async function main() {
  console.log("🏛️  Seeding Ithaca Master Demo Show Environment...\n");

  // 1. Seed Global Commercial User (Dr. Elena Rostova - SOLO_PRO)
  const globalUser = await upsertUserWithAccount({
    email: "elena.rostova@ithaca.tech",
    name: "Dr. Elena Rostova",
    institution: "Center for Brains & Machines, MIT",
    department: "Computer Science and AI",
  });

  const globalOrg = await prisma.organization.upsert({
    where: { slug: "rostova-intelligence-lab" },
    update: {
      plan: "SOLO_PRO",
      subscriptionStatus: "active",
      currency: "USD",
      isSovereignExempt: false,
    },
    create: {
      name: "Rostova Intelligence Lab",
      slug: "rostova-intelligence-lab",
      personalOwnerId: globalUser.id,
      plan: "SOLO_PRO",
      subscriptionStatus: "active",
      currency: "USD",
      isSovereignExempt: false,
      maxMembers: 5,
      maxProjects: 25,
      maxCollections: 100,
      maxSavedGraphs: 100,
      maxPaperRecords: 15000,
      maxAiRequests: 10000,
      maxApiRequests: 5000,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: globalOrg.id,
        userId: globalUser.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: globalOrg.id,
      userId: globalUser.id,
      role: "OWNER",
    },
  });

  // 2. Seed Sovereign Ethiopian Researcher (Dr. Dawit Bekele - AAU, Free Institution Tier)
  const sovereignUser = await upsertUserWithAccount({
    email: "dawit.bekele@aau.edu.et",
    name: "Dr. Dawit Bekele",
    institution: "Addis Ababa University",
    department: "School of Information Technology & Engineering",
  });

  const sovereignOrg = await prisma.organization.upsert({
    where: { slug: "aau-computational-intelligence" },
    update: {
      plan: "INSTITUTION",
      subscriptionStatus: "active",
      currency: "ETB",
      isSovereignExempt: true,
    },
    create: {
      name: "AAU Computational Intelligence Lab",
      slug: "aau-computational-intelligence",
      personalOwnerId: sovereignUser.id,
      plan: "INSTITUTION",
      subscriptionStatus: "active",
      currency: "ETB",
      isSovereignExempt: true,
      maxMembers: 100,
      maxProjects: 250,
      maxCollections: 1000,
      maxSavedGraphs: 1000,
      maxPaperRecords: 100000,
      maxAiRequests: 100000,
      maxApiRequests: 25000,
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: sovereignOrg.id,
        userId: sovereignUser.id,
      },
    },
    update: { role: "OWNER" },
    create: {
      organizationId: sovereignOrg.id,
      userId: sovereignUser.id,
      role: "OWNER",
    },
  });

  // 3. Seed Landmark Academic Papers
  const papers = [
    {
      orgId: globalOrg.id,
      userId: globalUser.id,
      dedupeKey: "doi:10.48550/arxiv.1706.03762",
      doi: "10.48550/arXiv.1706.03762",
      openAlexId: "W2741809807",
      title: "Attention Is All You Need",
      authors: [
        "Ashish Vaswani",
        "Noam Shazeer",
        "Niki Parmar",
        "Jakob Uszkoreit",
      ],
      year: 2017,
      venue: "NeurIPS",
      abstract:
        "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
      isSovereignIndex: false,
    },
    {
      orgId: globalOrg.id,
      userId: globalUser.id,
      dedupeKey: "doi:10.48550/arxiv.1810.04805",
      doi: "10.48550/arXiv.1810.04805",
      openAlexId: "W2963363068",
      title:
        "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
      authors: [
        "Jacob Devlin",
        "Ming-Wei Chang",
        "Kenton Lee",
        "Kristina Toutanova",
      ],
      year: 2018,
      venue: "NAACL",
      abstract:
        "We introduce a new language representation model called BERT...",
      isSovereignIndex: false,
    },
    {
      orgId: globalOrg.id,
      userId: globalUser.id,
      dedupeKey: "doi:10.48550/arxiv.1901.02860",
      doi: "10.48550/arXiv.1901.02860",
      openAlexId: "W2904128532",
      title:
        "Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context",
      authors: ["Zihang Dai", "Zhilin Yang", "Yiming Yang", "Jaime Carbonell"],
      year: 2019,
      venue: "ACL",
      abstract:
        "Transformers have a potential of learning longer-term dependency, but are limited by fixed-length contexts...",
      isSovereignIndex: false,
    },
    // Sovereign Ethiopian Papers (NADRE)
    {
      orgId: sovereignOrg.id,
      userId: sovereignUser.id,
      dedupeKey: "handle:123456789/45021",
      doi: "10.20372/nadre/45021",
      openAlexId: "W990000001",
      title:
        "Amharic-English Neural Machine Translation Using Morphologically Enriched Subwords",
      authors: ["Dawit Bekele", "Yared Negash", "Mesfin Abebe"],
      year: 2023,
      venue: "Ethiopian Journal of Science and Technology",
      abstract:
        "We investigate low-resource neural translation models for Ethiopic script languages with complex morphology...",
      isSovereignIndex: true,
      institutionSlug: "aau",
      repositoryHandle: "123456789/45021",
    },
    {
      orgId: sovereignOrg.id,
      userId: sovereignUser.id,
      dedupeKey: "handle:123456789/45022",
      doi: "10.20372/nadre/45022",
      openAlexId: "W990000002",
      title:
        "Comparative Efficacy of RTS,S/AS01 vs R21/Matrix-M Malaria Vaccines in High-Transmission Zones of Southwest Ethiopia",
      authors: ["Almaz Tadesse", "Berhanu Mekonnen", "Kassahun Assefa"],
      year: 2024,
      venue: "Jimma University Health Sciences Journal",
      abstract:
        "In this phase III prospective cohort across Oromia and Gambella regions, we evaluate seasonal malaria antibody decay...",
      isSovereignIndex: true,
      institutionSlug: "ju",
      repositoryHandle: "123456789/45022",
    },
  ];

  for (const p of papers) {
    await prisma.paperRecord.upsert({
      where: {
        organizationId_dedupeKey: {
          organizationId: p.orgId,
          dedupeKey: p.dedupeKey,
        },
      },
      update: {
        title: p.title,
        authors: p.authors,
        year: p.year,
        venue: p.venue,
        abstract: p.abstract,
        doi: p.doi,
        openAlexId: p.openAlexId,
        isSovereignIndex: p.isSovereignIndex,
        institutionSlug: p.institutionSlug,
        repositoryHandle: p.repositoryHandle,
      },
      create: {
        organizationId: p.orgId,
        userId: p.userId,
        dedupeKey: p.dedupeKey,
        title: p.title,
        authors: p.authors,
        year: p.year,
        venue: p.venue,
        abstract: p.abstract,
        doi: p.doi,
        openAlexId: p.openAlexId,
        isSovereignIndex: p.isSovereignIndex,
        institutionSlug: p.institutionSlug,
        repositoryHandle: p.repositoryHandle,
      },
    });
  }

  // 4. Seed Citation Cache with Contradictions, Calibration & Moat
  const citations = [
    {
      citingId: "W2963363068", // BERT
      citedId: "W2741809807", // Attention Is All You Need
      edgeType: "extends",
      confidence: 0.94,
      snippet:
        "BERT utilizes a multi-layer bidirectional Transformer encoder generalizing beyond autoregressive sequence models.",
      provider: "ithaca-local-moat",
      classifierVersion: CLASSIFIER_VERSION,
      isCalibrated: false,
    },
    {
      citingId: "W2904128532", // Transformer-XL
      citedId: "W2741809807", // Attention Is All You Need
      edgeType: "contradicts",
      confidence: 0.91,
      snippet:
        "We show that vanilla self-attention suffers from catastrophic context fragmentation across chunk boundaries.",
      provider: "user-correction",
      classifierVersion: CLASSIFIER_VERSION,
      isCalibrated: true,
      reviewerId: globalUser.id,
      calibrationFeedback:
        "Verified empirical disagreement on context length scaling under fixed self-attention.",
    },
    {
      citingId: "W990000002", // R21 Vaccine Study
      citedId: "10.1016/S0140-6736(15)60721-8", // RTS,S
      edgeType: "contradicts",
      confidence: 0.89,
      snippet:
        "RTS,S demonstrates rapid antibody titer waning by month 18 in sub-Saharan cohorts, contrary to long-term efficacy estimates.",
      provider: "ithaca-local-moat",
      classifierVersion: CLASSIFIER_VERSION,
      isCalibrated: false,
    },
  ];

  for (const c of citations) {
    await prisma.citationCache.upsert({
      where: {
        citingId_citedId: {
          citingId: c.citingId,
          citedId: c.citedId,
        },
      },
      update: {
        edgeType: c.edgeType,
        confidence: c.confidence,
        snippet: c.snippet,
        provider: c.provider,
        classifierVersion: CLASSIFIER_VERSION,
        isCalibrated: c.isCalibrated,
        reviewerId: c.reviewerId || null,
        calibrationFeedback: c.calibrationFeedback || null,
      },
      create: {
        citingId: c.citingId,
        citedId: c.citedId,
        edgeType: c.edgeType,
        confidence: c.confidence,
        snippet: c.snippet,
        provider: c.provider,
        classifierVersion: CLASSIFIER_VERSION,
        isCalibrated: c.isCalibrated,
        reviewerId: c.reviewerId || null,
        calibrationFeedback: c.calibrationFeedback || null,
      },
    });
  }

  // 5. Seed Zotero Sync Record & Library Collection with Active Conflict Alert
  const zoteroCollection = await prisma.collection.upsert({
    where: { id: "col_demo_zotero_1" },
    update: {
      title: "My Zotero Thesis Library",
      paperIds: ["W2741809807", "W2904128532"],
      watchEnabled: true,
    },
    create: {
      id: "col_demo_zotero_1",
      organizationId: globalOrg.id,
      userId: globalUser.id,
      title: "My Zotero Thesis Library",
      paperIds: ["W2741809807", "W2904128532"],
      watchEnabled: true,
    },
  });

  await prisma.zoteroSyncRecord.create({
    data: {
      organizationId: globalOrg.id,
      userId: globalUser.id,
      libraryId: "zotero_usr_882194",
      collectionId: zoteroCollection.id,
      syncedItemCount: 2,
      activeDisputeCount: 1, // 1 active scientific contradiction alert!
    },
  });

  console.log(
    "===============================================================================",
  );
  console.log("🌟 ITHACA MASTER DEMONSTRATION ENVIRONMENT READY");
  console.log(
    "===============================================================================",
  );
  console.log("\n👤 1. GLOBAL COMMERCIAL USER (USD FX Retention Engine):");
  console.log(`   Email:       elena.rostova@ithaca.tech`);
  console.log(`   Password:    ${DEMO_PASSWORD}`);
  console.log(
    `   Org / Plan:  Rostova Intelligence Lab (${globalOrg.plan} — $15/mo)`,
  );
  console.log(
    `   Zotero Sync: 1 Active Contradiction Warning Alert Pre-Loaded!`,
  );

  console.log(
    "\n👤 2. SOVEREIGN ETHIOPIAN RESEARCHER (Proclamation 1396/2025):",
  );
  console.log(`   Email:       dawit.bekele@aau.edu.et`);
  console.log(`   Password:    ${DEMO_PASSWORD}`);
  console.log(
    `   Org / Plan:  AAU Computational Intelligence Lab (INSTITUTION — 100% Free Sovereign Tier)`,
  );
  console.log(
    `   EthERNet:    NADRE OAI-PMH Indexed Records with Emerald Sovereign Badges`,
  );

  console.log("\n🎯 3. INSTANT DEMO DEEP-LINKS:");
  console.log(`   • Attention Is All You Need Debate Canvas:`);
  console.log(`     http://localhost:3000/explore?q=Attention+Is+All+You+Need`);
  console.log(`   • Extension Badge API Preview:`);
  console.log(
    `     http://localhost:3000/api/research/extension-badge?doi=10.48550/arXiv.1706.03762`,
  );
  console.log(`   • Sovereign Ethiopian Slice Explorer:`);
  console.log(`     http://localhost:3000/explore?nationalSlice=true`);
  console.log(`   • Admin Quota & Plan Management:`);
  console.log(`     http://localhost:3000/admin`);
  console.log(
    "===============================================================================\n",
  );
}

main()
  .catch((err) => {
    console.error("❌ Failed to seed demo show:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
