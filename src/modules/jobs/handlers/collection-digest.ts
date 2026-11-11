import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  markBackgroundJobCompleted,
  markBackgroundJobFailed,
  markBackgroundJobProcessing,
} from "../job-service";

interface DigestItem {
  collectionId: string;
  collectionTitle: string;
  paperTitle: string;
  openAlexId?: string | null;
  doi?: string | null;
  newCitingCount: number;
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://ithaca.app"
  );
}

/**
 * Weekly conflict digest for watched collections.
 * Uses OpenAlex citing counts as a lightweight signal until full
 * contradiction classification is scheduled per new citation.
 */
export async function processCollectionDigestJob(input: {
  jobId: string;
  organizationId: string;
  collectionIds?: string[];
}) {
  await markBackgroundJobProcessing(input.jobId);

  try {
    const collections = await prisma.collection.findMany({
      where: {
        organizationId: input.organizationId,
        watchEnabled: true,
        ...(input.collectionIds?.length
          ? { id: { in: input.collectionIds } }
          : {}),
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    const digestsByEmail = new Map<
      string,
      { name: string | null; items: DigestItem[] }
    >();

    for (const collection of collections) {
      if (collection.paperIds.length === 0 || !collection.user.email) continue;

      const papers = await prisma.paperRecord.findMany({
        where: {
          organizationId: input.organizationId,
          id: { in: collection.paperIds.slice(0, 25) },
        },
        select: {
          id: true,
          title: true,
          doi: true,
          openAlexId: true,
        },
      });

      const since =
        collection.lastDigestAt ??
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const items: DigestItem[] = [];

      for (const paper of papers) {
        if (!paper.openAlexId && !paper.doi) continue;
        const citingCount = await countRecentCitations({
          openAlexId: paper.openAlexId,
          doi: paper.doi,
          since,
        });
        if (citingCount <= 0) continue;
        items.push({
          collectionId: collection.id,
          collectionTitle: collection.title,
          paperTitle: paper.title || paper.doi || paper.openAlexId || paper.id,
          openAlexId: paper.openAlexId,
          doi: paper.doi,
          newCitingCount: citingCount,
        });
      }

      // Always advance lastDigestAt so UI can show "last checked"
      await prisma.collection.update({
        where: { id: collection.id },
        data: { lastDigestAt: new Date() },
      });

      if (items.length === 0) continue;

      const existing = digestsByEmail.get(collection.user.email) ?? {
        name: collection.user.name,
        items: [],
      };
      existing.items.push(...items);
      digestsByEmail.set(collection.user.email, existing);
    }

    const baseUrl = appBaseUrl();
    let emailsSent = 0;
    for (const [email, digest] of digestsByEmail) {
      const lines = digest.items.slice(0, 20).map((item) => {
        const exploreUrl = `${baseUrl}/explore?collection=${item.collectionId}`;
        return `• ${item.paperTitle} — ${item.newCitingCount} new citing works (${item.collectionTitle})\n  ${exploreUrl}`;
      });
      const htmlItems = digest.items
        .slice(0, 20)
        .map((item) => {
          const exploreUrl = `${baseUrl}/explore?collection=${item.collectionId}`;
          return `<li style="margin-bottom: 12px;">
            <strong>${escapeHtml(item.paperTitle)}</strong> — ${item.newCitingCount} new citing works
            <br/><span style="color:#666;">${escapeHtml(item.collectionTitle)}</span>
            <br/><a href="${exploreUrl}">Open debate map</a>
          </li>`;
        })
        .join("");

      await sendEmail({
        to: email,
        subject: "Ithaca weekly literature digest",
        html: `
          <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto;">
            <h1 style="color: #137fec;">New citations on watched collections</h1>
            <p>Hi ${escapeHtml(digest.name || "researcher")},</p>
            <p>These papers in your watched collections picked up new citing works this week:</p>
            <ul style="padding-left: 18px;">${htmlItems}</ul>
            <p style="color:#666; font-size: 14px;">
              Open a collection to review whether new citations support or contradict your seeds.
              Weeks with no new citing works do not send an email.
            </p>
          </div>
        `,
        text: `New citations on watched collections\n\n${lines.join("\n\n")}\n\nWeeks with no new citing works do not send an email.`,
      });
      emailsSent += 1;
    }

    await markBackgroundJobCompleted(input.jobId, {
      collections: collections.length,
      emailsSent,
      items: [...digestsByEmail.values()].reduce(
        (sum, digest) => sum + digest.items.length,
        0,
      ),
    });

    return { emailsSent, collections: collections.length };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Collection digest failed";
    await markBackgroundJobFailed(input.jobId, message);
    throw error;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function countRecentCitations(input: {
  openAlexId?: string | null;
  doi?: string | null;
  since: Date;
}): Promise<number> {
  const workId = input.openAlexId
    ? input.openAlexId.startsWith("http")
      ? input.openAlexId
      : `https://openalex.org/${input.openAlexId}`
    : input.doi
      ? `https://doi.org/${input.doi}`
      : null;
  if (!workId) return 0;

  const fromDate = input.since.toISOString().slice(0, 10);
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set(
    "filter",
    `cites:${workId},from_publication_date:${fromDate}`,
  );
  url.searchParams.set("per-page", "1");
  url.searchParams.set("mailto", "research@ithaca.app");

  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return 0;
    const payload = (await response.json()) as { meta?: { count?: number } };
    return payload.meta?.count ?? 0;
  } catch {
    return 0;
  }
}
