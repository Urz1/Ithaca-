#!/usr/bin/env node

/**
 * Universal Academic & Institutional Partner Onboarding Tool
 *
 * Provisions verified university & research laboratory workspaces under the
 * Open Academic & Institutional Partnership Framework.
 * Validates OAI-PMH repository connectivity (DSpace, EPrints, InvenioRDM, Fedora, arXiv).
 *
 * Usage:
 *   node scripts/partner-onboard.mjs --name="Oxford University" --slug="oxford" --domain="ox.ac.uk" --endpoint="https://ora.ox.ac.uk/oai2"
 *   node scripts/partner-onboard.mjs --preset=aau
 *   node scripts/partner-onboard.mjs --preset=jimma
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PARTNER_PRESETS = {
  aau: {
    name: "Addis Ababa University — Research & Technology Directorate",
    slug: "aau-research",
    domain: "aau.edu.et",
    oaiEndpoint: "http://etd.aau.edu.et/oai/request",
    leadContact: "director.research@aau.edu.et",
    currency: "ETB",
    description:
      "Official institutional research workspace for AAU graduate faculty and doctoral fellows.",
  },
  jimma: {
    name: "Jimma University — Institute of Health & Technology",
    slug: "jimma-tech",
    domain: "ju.edu.et",
    oaiEndpoint: "https://opendocs.ju.edu.et/oai/request",
    leadContact: "research.office@ju.edu.et",
    currency: "ETB",
    description:
      "Collaborative research and clinical argumentation workspace for Jimma University.",
  },
  ethernet: {
    name: "EthERNet / NADRE — National Academic Digital Repository",
    slug: "nadre-open",
    domain: "ethernet.edu.et",
    oaiEndpoint: "https://nadre.ethernet.edu.et/oai/request",
    leadContact: "admin@ethernet.edu.et",
    currency: "ETB",
    description:
      "National federated academic archive connecting university repositories.",
  },
  oxford: {
    name: "University of Oxford — Research Archive",
    slug: "oxford-ora",
    domain: "ox.ac.uk",
    oaiEndpoint: "https://ora.ox.ac.uk/oai2",
    leadContact: "research.support@ox.ac.uk",
    currency: "USD",
    description:
      "Official institutional research repository for Oxford researchers.",
  },
};

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [rawKey, ...rest] = arg.slice(2).split("=");
      const val = rest.join("=");
      args[rawKey] = val || true;
    }
  }
  return args;
}

async function pingEndpoint(url) {
  if (!url) return { ok: false, error: "No endpoint provided" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`${url}?verb=Identify`, {
      signal: controller.signal,
      headers: { "User-Agent": "Ithaca-Institutional-Harvester/1.0" },
    });
    clearTimeout(timeout);
    return { status: resp.status, ok: resp.ok };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

async function main() {
  const args = parseArgs();
  const presetKey =
    args.preset || (typeof args.target === "string" ? args.target : null);

  let spec = null;
  if (presetKey && PARTNER_PRESETS[presetKey.toLowerCase()]) {
    spec = { ...PARTNER_PRESETS[presetKey.toLowerCase()] };
  }

  // Override with explicit CLI flags if provided
  if (args.name) spec = { ...(spec || {}), name: args.name };
  if (args.slug) spec = { ...(spec || {}), slug: args.slug };
  if (args.domain)
    spec = { ...(spec || {}), domain: args.domain.replace(/^@/, "") };
  if (args.endpoint) spec = { ...(spec || {}), oaiEndpoint: args.endpoint };
  if (args.contact) spec = { ...(spec || {}), leadContact: args.contact };
  if (args.currency) spec = { ...(spec || {}), currency: args.currency };

  if (!spec || !spec.name || !spec.slug || !spec.domain) {
    console.error(
      `\n❌ Error: Missing required institutional partner parameters.`,
    );
    console.error(`\nUsage:`);
    console.error(
      `   node scripts/partner-onboard.mjs --name="<University Name>" --slug="<slug>" --domain="<domain.edu>" [--endpoint="<oai_url>"]`,
    );
    console.error(
      `   node scripts/partner-onboard.mjs --preset=aau|jimma|ethernet|oxford\n`,
    );
    process.exit(1);
  }

  const currency =
    spec.currency || (spec.domain.endsWith(".et") ? "ETB" : "USD");
  const leadContact = spec.leadContact || `admin@${spec.domain}`;

  console.log(
    `\n🏛️  Provisioning Institutional Academic Partner: ${spec.name}`,
  );
  console.log(`   Slug:                 ${spec.slug}`);
  console.log(`   Domain:               @${spec.domain}`);
  console.log(`   Settlement Currency:  ${currency}`);
  console.log(`   Lead Contact:         ${leadContact}`);

  // 1. Health check OAI endpoint if configured
  if (spec.oaiEndpoint) {
    console.log(
      `\n📡 Verifying OAI-PMH repository endpoint (${spec.oaiEndpoint})...`,
    );
    const ping = await pingEndpoint(spec.oaiEndpoint);
    if (ping.ok) {
      console.log(`   ✅ Endpoint online (HTTP ${ping.status})`);
    } else {
      console.warn(
        `   ⚠️  Endpoint unreachable (${ping.error || `HTTP ${ping.status}`})`,
      );
      console.warn(
        `   ℹ️  Continuing with institutional partner provisioning.`,
      );
    }
  }

  // 2. Upsert Organization
  const org = await prisma.organization.upsert({
    where: { slug: spec.slug },
    update: {
      name: spec.name,
      plan: "INSTITUTION",
      isSovereignExempt: true,
      subscriptionStatus: "active",
      currency,
      allowedEmailDomains: [spec.domain],
      supportContactEmail: leadContact,
      maxMembers: 100,
      maxProjects: 250,
      maxCollections: 1000,
      maxPaperRecords: 100000,
      maxAiRequests: 100000,
      maxApiRequests: 25000,
    },
    create: {
      name: spec.name,
      slug: spec.slug,
      plan: "INSTITUTION",
      isSovereignExempt: true,
      subscriptionStatus: "active",
      currency,
      allowedEmailDomains: [spec.domain],
      supportContactEmail: leadContact,
      maxMembers: 100,
      maxProjects: 250,
      maxCollections: 1000,
      maxPaperRecords: 100000,
      maxAiRequests: 100000,
      maxApiRequests: 25000,
    },
  });

  console.log(`\n✅ Institutional Organization provisioned:`);
  console.log(`   ID:                   ${org.id}`);
  console.log(
    `   Plan:                 ${org.plan} (Academic Exemption Active)`,
  );
  console.log(`   Domain Allowlist:     @${spec.domain}`);
  console.log(`   Member Seats:         ${org.maxMembers}`);
  console.log(
    `   AI Requests Quota:    ${org.maxAiRequests.toLocaleString()} / month`,
  );

  // 3. Upsert Lead Academic User & Admin Membership
  const pilotUserEmail = `lead.researcher@${spec.domain}`;
  const user = await prisma.user.upsert({
    where: { email: pilotUserEmail },
    update: {
      emailVerified: true,
      hasCompletedOnboarding: true,
      institution: spec.name,
    },
    create: {
      email: pilotUserEmail,
      name: `Lead Researcher (${spec.slug.toUpperCase()})`,
      emailVerified: true,
      hasCompletedOnboarding: true,
      institution: spec.name,
      department: "Academic Research Group",
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: "ADMIN" },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "ADMIN",
    },
  });

  console.log(`👤 Lead Researcher:       ${user.email} (ADMIN)`);
  console.log(`✨ Workspace ready for global research deployment.\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("\n❌ Failed to onboard partner institution:", err);
    prisma.$disconnect();
    process.exit(1);
  });
