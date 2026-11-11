import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Better Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // OAuth - Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // OAuth - ORCID
  ORCID_CLIENT_ID: z.string().optional(),
  ORCID_CLIENT_SECRET: z.string().optional(),

  // LLM Providers (for citation classification)
  GEMINI_API_KEY: z.string().optional(), // Primary — free 1,500 req/day
  GROQ_API_KEY: z.string().optional(), // Fallback — free ~30 RPM

  // Semantic Scholar (for citation context enrichment)
  SEMANTIC_SCHOLAR_API_KEY: z.string().optional(), // Optional — increases rate limit from 1 to 10 req/s

  // OpenAlex (polite pool — optional but recommended)
  OPENALEX_EMAIL: z.string().email().optional(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().optional(),
  REQUIRE_EMAIL_VERIFICATION: z.enum(["true", "false"]).optional(),

  // Managed platform infrastructure
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  QSTASH_URL: z.string().url().optional(),
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default("ithaca-ui"),
  HEALTH_CHECK_TOKEN: z.string().min(32).optional(),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

function cleanEnv(raw: NodeJS.ProcessEnv) {
  const cleaned: Record<string, string | undefined> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === "string") {
      // Strip surrounding single or double quotes if passed by Docker env-file
      cleaned[key] = val.trim().replace(/^["'](.*)["']$/, "$1");
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

export const env = envSchema.parse(cleanEnv(process.env));

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;
