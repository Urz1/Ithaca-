import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs?: number;
  description: string;
}

export async function GET(request: NextRequest) {
  const context = createApiContext(request);
  const services: ServiceStatus[] = [];
  const deep = request.nextUrl.searchParams.get("deep") === "true";

  if (
    deep &&
    (!process.env.HEALTH_CHECK_TOKEN ||
      request.headers.get("authorization") !==
        `Bearer ${process.env.HEALTH_CHECK_TOKEN}`)
  ) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Deep health checks require authorization",
      context,
    );
  }

  // Check database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    services.push({
      name: "Database (Postgres)",
      status: "operational",
      latencyMs: Date.now() - dbStart,
      description: "Primary data store",
    });
  } catch {
    services.push({
      name: "Database (Postgres)",
      status: "down",
      latencyMs: Date.now() - dbStart,
      description: "Primary data store",
    });
  }

  if (deep) {
    const oaStart = Date.now();
    try {
      const res = await fetch("https://api.openalex.org/works?per_page=1", {
        signal: AbortSignal.timeout(5000),
      });
      services.push({
        name: "OpenAlex API",
        status: res.ok ? "operational" : "degraded",
        latencyMs: Date.now() - oaStart,
        description: "Academic paper data source",
      });
    } catch {
      services.push({
        name: "OpenAlex API",
        status: "down",
        latencyMs: Date.now() - oaStart,
        description: "Academic paper data source",
      });
    }
  }

  // Web Interface is inherently operational if this response is served
  services.push({
    name: "Web Interface",
    status: "operational",
    description: "Next.js application",
  });

  const allOperational = services.every((s) => s.status === "operational");

  return apiSuccess(
    {
      status: allOperational ? "operational" : "degraded",
      services,
      depth: deep ? "deep" : "readiness",
      checkedAt: new Date().toISOString(),
    },
    context,
    { status: allOperational ? 200 : 503 },
  );
}
