import { NextRequest } from "next/server";
import { z } from "zod";
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
import { FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import { isFeatureEnabledForOrganization } from "@/lib/platform/org-rollout";
import { getLLMRouter, type LLMMessage } from "@/lib/api/llm-router";
import { recordAiUsage } from "@/lib/platform/ai-usage";
import { recordAuditEvent } from "@/lib/organization-context";

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

const paperNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  authors: z.string().optional(),
  year: z.number().optional(),
  abstract: z.string().optional(),
  citations: z.number().optional(),
});

const edgeDataSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  edgeType: z.string(),
  confidence: z.number().optional(),
  snippet: z.string().optional(),
  contexts: z.array(z.string()).optional(),
});

const synthesizeRequestSchema = z.object({
  topic: z.string().optional(),
  nodes: z.array(paperNodeSchema).min(1).max(100),
  edges: z.array(edgeDataSchema).default([]),
});

export interface SynthesizedReview {
  title: string;
  topic: string;
  generatedAt: string;
  sections: {
    foundationalLineage: {
      title: string;
      content: string;
      keyPapers: string[];
    };
    empiricalFrictions: {
      title: string;
      content: string;
      disputesCount: number;
      clashes: Array<{
        citing: string;
        target: string;
        claim: string;
      }>;
    };
    unresolvedHorizons: {
      title: string;
      content: string;
      openQuestions: string[];
    };
  };
  fullMarkdown: string;
  meta: {
    paperCount: number;
    disputeCount: number;
    confirmationCount: number;
    provider: string;
  };
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const orgContext = await getOptionalOrganizationContextFromRequest(request);

  if (
    !(await isFeatureEnabledForOrganization(
      FEATURE_FLAGS.aiClassification,
      orgContext?.organizationId,
    ))
  ) {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "AI synthesis is temporarily disabled",
      context,
    );
  }

  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "synthesize",
    20,
    context,
    orgContext?.organizationId,
  );
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_REQUEST", "Invalid JSON payload", context);
  }

  const parseResult = synthesizeRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return apiError(
      "INVALID_REQUEST",
      `Validation error: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
      context,
    );
  }

  const { nodes, edges, topic } = parseResult.data;
  const inferredTopic =
    topic || (nodes[0] ? nodes[0].title : "Academic Debate Network");

  // Partition edges
  const disputes = edges.filter((e) => e.edgeType === "contradicts");
  const supports = edges.filter((e) => e.edgeType === "supports");

  // Identify top foundational works
  const sortedByCitations = [...nodes].sort(
    (a, b) => (b.citations || 0) - (a.citations || 0),
  );
  const foundational = sortedByCitations.slice(
    0,
    Math.min(3, sortedByCitations.length),
  );

  const router = getLLMRouter();
  let review: SynthesizedReview;

  if (router.isAvailable()) {
    try {
      const messages: LLMMessage[] = [
        {
          role: "system",
          content: `You are an elite academic literature synthesis engine.
Synthesize the provided citation graph into a publication-ready 3-part literature review draft.
Respond ONLY with a valid JSON object matching this schema:
{
  "foundationalLineage": {
    "title": "Foundational Lineage & Core Paradigms",
    "content": "Paragraph summarizing the earliest baseline works, their core paradigms, and foundational assumptions.",
    "keyPapers": ["Paper Title 1", "Paper Title 2"]
  },
  "empiricalFrictions": {
    "title": "Empirical Points of Friction & Methodological Clashes",
    "content": "Detailed paragraphs synthesizing direct refutations, conflicting empirical benchmarks, and methodological disputes.",
    "clashes": [
      {
        "citing": "Challenging Paper Title",
        "target": "Baseline Paper Title",
        "claim": "Specific empirical challenge or refutation statement"
      }
    ]
  },
  "unresolvedHorizons": {
    "title": "Unresolved Controversies & Future Horizons",
    "content": "Synthesis of unanswered research questions, open dialectic frontiers, and suggested empirical tests.",
    "openQuestions": ["Question 1", "Question 2"]
  }
}`,
        },
        {
          role: "user",
          content: `Topic: ${inferredTopic}
Total Papers: ${nodes.length}
Foundational Papers:
${foundational.map((p) => `- "${p.title}" (${p.year || "Unknown"}) by ${p.authors || "Unknown"} [${p.citations || 0} citations]`).join("\n")}

Active Disputes & Contradictions (${disputes.length}):
${
  disputes
    .map((d) => {
      const c = nodes.find((n) => n.id === d.source);
      const t = nodes.find((n) => n.id === d.target);
      return `- "${c?.title || d.source}" CONTRADICTS "${t?.title || d.target}": "${d.snippet || "Empirical disagreement"}"`;
    })
    .join("\n") || "No direct contradictions recorded."
}

Confirmations & Extensions (${supports.length}):
${
  supports
    .slice(0, 5)
    .map((s) => {
      const c = nodes.find((n) => n.id === s.source);
      const t = nodes.find((n) => n.id === s.target);
      return `- "${c?.title || s.source}" SUPPORTS "${t?.title || s.target}": "${s.snippet || "Validates findings"}"`;
    })
    .join("\n") || "Standard extensions."
}`,
        },
      ];

      const response = await router.chat(messages, true);
      const parsed = JSON.parse(response.content);

      const fullMarkdown = buildMarkdownFromSections(
        inferredTopic,
        parsed.foundationalLineage,
        parsed.empiricalFrictions,
        parsed.unresolvedHorizons,
        nodes.length,
        disputes.length,
        supports.length,
      );

      review = {
        title: `Literature Review: ${inferredTopic}`,
        topic: inferredTopic,
        generatedAt: new Date().toISOString(),
        sections: {
          foundationalLineage: parsed.foundationalLineage,
          empiricalFrictions: {
            ...parsed.empiricalFrictions,
            disputesCount: disputes.length,
          },
          unresolvedHorizons: parsed.unresolvedHorizons,
        },
        fullMarkdown,
        meta: {
          paperCount: nodes.length,
          disputeCount: disputes.length,
          confirmationCount: supports.length,
          provider: response.provider || "Ithaca AI",
        },
      };

      if (orgContext?.organizationId) {
        await recordAiUsage({
          organizationId: orgContext.organizationId,
          userId: authResult.user.id,
          operation: "literature_review_synthesis",
          provider: response.provider || "Ithaca AI",
          model: response.model || "default",
          inputText: messages[1].content,
          outputText: response.content,
        }).catch(() => undefined);
      }
    } catch {
      // Fallback to deterministic topological synthesis
      review = buildDeterministicSynthesis(
        inferredTopic,
        nodes,
        disputes,
        supports,
        foundational,
      );
    }
  } else {
    // Fallback when LLM keys are absent
    review = buildDeterministicSynthesis(
      inferredTopic,
      nodes,
      disputes,
      supports,
      foundational,
    );
  }

  if (orgContext) {
    await recordAuditEvent(orgContext, {
      action: "ai.review_synthesized",
      entityType: "literature_review",
      entityId: inferredTopic.slice(0, 64),
      metadata: {
        paperCount: nodes.length,
        disputeCount: disputes.length,
        confirmationCount: supports.length,
        provider: review.meta.provider,
      },
    });
  }

  return apiSuccess(
    {
      synthesis: review,
    },
    context,
  );
}

// =============================================================================
// DETERMINISTIC TOPOLOGY-GROUNDED SYNTHESIS (FALLBACK & ZERO-KEY MODE)
// =============================================================================

function buildDeterministicSynthesis(
  topic: string,
  nodes: z.infer<typeof paperNodeSchema>[],
  disputes: z.infer<typeof edgeDataSchema>[],
  supports: z.infer<typeof edgeDataSchema>[],
  foundational: z.infer<typeof paperNodeSchema>[],
): SynthesizedReview {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Section 1: Foundational Lineage
  const fTitles = foundational.map((f) => `"${f.title}" (${f.year || "n.d."})`);
  const s1Content =
    foundational.length > 0
      ? `The intellectual lineage of research regarding ${topic} is predominantly anchored by foundational works including ${fTitles.join(", ")}. These landmark contributions established the theoretical baseline, common experimental parameters, and primary evaluation benchmarks adopted across the wider network of ${nodes.length} works.`
      : `Research on ${topic} spans a network of ${nodes.length} connected papers investigating complementary theoretical hypotheses and empirical benchmarks.`;

  // Section 2: Empirical Clashes
  const clashes = disputes.map((d) => {
    const c = nodeMap.get(d.source);
    const t = nodeMap.get(d.target);
    return {
      citing: c ? `${c.title} (${c.year || "n.d."})` : d.source,
      target: t ? `${t.title} (${t.year || "n.d."})` : d.target,
      claim: d.snippet || "Direct empirical refutation of baseline assertions.",
    };
  });

  const s2Content =
    clashes.length > 0
      ? `Analysis of citation topology reveals ${clashes.length} direct point(s) of empirical friction where succeeding investigations actively contest prior claims. Specifically, ${clashes.map((c) => `${c.citing} challenges ${c.target}, noting: "${c.claim}"`).join(" ")}.`
      : `Within this observed graph subset, no explicit negative citation contradictions were detected; literature progression predominantly exhibits confirmatory extension and domain transfer.`;

  // Section 3: Horizons
  const openQuestions = [
    `How do the disputed findings reconcile across varying experimental settings and domain datasets?`,
    `What standardized benchmark can arbitrate between the conflicting empirical conclusions?`,
  ];

  const s3Content = `The structural divergence between contesting schools of thought underscores the need for consolidated benchmark evaluations. Future investigations should prioritize controlled replication studies addressing the methodological points of divergence highlighted above.`;

  const fullMarkdown = buildMarkdownFromSections(
    topic,
    {
      title: "Foundational Lineage & Core Paradigms",
      content: s1Content,
      keyPapers: fTitles,
    },
    {
      title: "Empirical Points of Friction & Methodological Clashes",
      content: s2Content,
      clashes,
    },
    {
      title: "Unresolved Controversies & Future Horizons",
      content: s3Content,
      openQuestions,
    },
    nodes.length,
    disputes.length,
    supports.length,
  );

  return {
    title: `Literature Review: ${topic}`,
    topic,
    generatedAt: new Date().toISOString(),
    sections: {
      foundationalLineage: {
        title: "Foundational Lineage & Core Paradigms",
        content: s1Content,
        keyPapers: fTitles,
      },
      empiricalFrictions: {
        title: "Empirical Points of Friction & Methodological Clashes",
        content: s2Content,
        disputesCount: clashes.length,
        clashes,
      },
      unresolvedHorizons: {
        title: "Unresolved Controversies & Future Horizons",
        content: s3Content,
        openQuestions,
      },
    },
    fullMarkdown,
    meta: {
      paperCount: nodes.length,
      disputeCount: disputes.length,
      confirmationCount: supports.length,
      provider: "Ithaca Topology Engine",
    },
  };
}

function buildMarkdownFromSections(
  topic: string,
  s1: { title: string; content: string; keyPapers?: string[] },
  s2: {
    title: string;
    content: string;
    clashes?: Array<{ citing: string; target: string; claim: string }>;
  },
  s3: { title: string; content: string; openQuestions?: string[] },
  paperCount: number,
  disputeCount: number,
  confirmationCount: number,
): string {
  return [
    `# Literature Review: ${topic}`,
    "",
    `> **Synthesis Scope:** ${paperCount} Papers • ${disputeCount} Controversies • ${confirmationCount} Confirmations`,
    "",
    `## 1. ${s1.title}`,
    "",
    s1.content,
    "",
    s1.keyPapers && s1.keyPapers.length > 0
      ? `**Key Foundational Works:**\n${s1.keyPapers.map((p) => `- ${p}`).join("\n")}\n`
      : "",
    `## 2. ${s2.title}`,
    "",
    s2.content,
    "",
    s2.clashes && s2.clashes.length > 0
      ? `### Documented Empirical Clashes:\n${s2.clashes.map((c) => `- **${c.citing}** vs. **${c.target}**:\n  > ${c.claim}`).join("\n")}\n`
      : "",
    `## 3. ${s3.title}`,
    "",
    s3.content,
    "",
    s3.openQuestions && s3.openQuestions.length > 0
      ? `### Critical Open Questions:\n${s3.openQuestions.map((q) => `1. ${q}`).join("\n")}\n`
      : "",
    "---",
    "_Generated automatically by the Ithaca Synthesis Engine (v3.0)._",
  ].join("\n");
}
