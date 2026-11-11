import { Client, Receiver } from "@upstash/qstash";
import type { JobType } from "./job-policy";
import { processJobLocally } from "./local-runner";

export interface JobEnvelope<TPayload extends Record<string, unknown>> {
  id: string;
  type: JobType;
  organizationId: string;
  requestedByUserId: string;
  requestedAt: string;
  payload: TPayload;
}

let client: Client | null | undefined;

function getClient(): Client | null {
  if (client !== undefined) return client;
  const token = process.env.QSTASH_TOKEN;
  client = token
    ? new Client({ token, baseUrl: process.env.QSTASH_URL })
    : null;
  return client;
}

export async function enqueueJob<TPayload extends Record<string, unknown>>(
  job: JobEnvelope<TPayload>,
  options: { delaySeconds?: number } = {},
): Promise<{ messageId: string }> {
  const qstash = getClient();
  if (!qstash) {
    const localId = `local_${job.id}`;
    const delayMs = (options.delaySeconds || 0) * 1000;
    if (delayMs > 0) {
      setTimeout(() => {
        void processJobLocally(job);
      }, delayMs);
    } else {
      queueMicrotask(() => {
        void processJobLocally(job);
      });
    }
    return { messageId: localId };
  }

  const destination = new URL(
    "/api/jobs/process",
    process.env.NEXT_PUBLIC_APP_URL,
  ).toString();
  const response = await qstash.publishJSON({
    url: destination,
    body: job,
    delay: options.delaySeconds,
    deduplicationId: job.id,
    retries: 5,
    label: [`job:${job.type}`, `organization:${job.organizationId}`],
    redact: { body: true, header: ["authorization", "cookie"] },
  });

  return { messageId: response.messageId };
}

export async function verifyJobSignature(
  signature: string,
  body: string,
  url: string,
): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) return false;

  const receiver = new Receiver({ currentSigningKey, nextSigningKey });
  return receiver.verify({ signature, body, url });
}
