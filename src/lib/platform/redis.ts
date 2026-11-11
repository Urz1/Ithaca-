import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

export async function checkDistributedLimit(options: {
  key: string;
  maximum: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; remaining: number }> {
  const client = getRedis();
  if (!client) {
    return { allowed: true, remaining: options.maximum };
  }

  const count = await client.incr(options.key);
  if (count === 1) await client.expire(options.key, options.windowSeconds);

  return {
    allowed: count <= options.maximum,
    remaining: Math.max(0, options.maximum - count),
  };
}
