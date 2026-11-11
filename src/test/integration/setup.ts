(process.env as Record<string, string | undefined>).NODE_ENV ??= "test";
process.env.DATABASE_URL =
  "postgresql://postgres:ithaca_production_secret_2026@localhost:5434/ithaca_test";
process.env.BETTER_AUTH_SECRET ??=
  "test-test-test-test-test-test-test-test-test-test";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.CRON_SECRET ??= "test-cron-secret-for-integration-tests";
process.env.RUN_INTEGRATION_TESTS ??= "1";
