# Pilot launch checklist

Use this checklist before inviting a design-partner cohort. Every item must be
evidence-backed; do not rely on memory or informal confirmation.

## Environment

- [ ] Staging mirrors production configuration, including auth, blob storage, and
      optional QStash workers.
- [ ] Database migrations are applied with `npm run prisma:migrate:deploy`.
- [ ] Seeded pilot accounts exist for each invited organization.
- [ ] `FEATURE_DURABLE_JOBS`, QStash keys, and blob tokens are configured when
      testing large exports.

**Verify locally:** `npm run test:db:up` then `npm run test:e2e:seed` (requires
`DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ithaca_test`).

## Quality gates

- [ ] `npm run launch:check` passes from a clean checkout.
      Includes unit tests, integration suite, Prisma validate, and coverage gate.
- [ ] Cross-tenant authorization tests pass.
      **Command:** `npm run test:integration` (see `tests/integration/authz*.test.ts`).
- [ ] `npm run eval:ai` meets the classifier baseline.
      **CI:** `.github/workflows/ci.yml` on every PR.
- [ ] Playwright smoke tests pass for public and authenticated pilot paths.
      **Command:** `npm run test:e2e -- --project=smoke --project=pilot`
      **CI:** `.github/workflows/ci.yml` (smoke + pilot happy path).

## Load and performance

- [ ] `BASE_URL=<staging-url> npm run test:load` passes for public pages.
      **CI:** `.github/workflows/load-test.yml` (weekly) and
      `.github/workflows/nightly-quality.yml` (`staging-load` job).
- [ ] Authenticated API scenario passes with a seeded `SESSION_COOKIE`.
      **Prep:** `npm run test:load:session` → set GitHub secret `LOAD_TEST_SESSION_COOKIE`.
      **Run:** `BASE_URL=<staging> LOAD_SCENARIO=authenticated-api SESSION_COOKIE=<cookie> npm run test:load`
- [ ] Latency and error budgets match `docs/SERVICE_LEVELS.md`.
      **Command:** `npm run test:load:budgets`

## Staging nightly (T4)

- [ ] GitHub secrets configured: `STAGING_BASE_URL`, `STAGING_DATABASE_URL`,
      `STAGING_BETTER_AUTH_SECRET`, `LOAD_TEST_SESSION_COOKIE`, and
      `GEMINI_API_KEY` or `GROQ_API_KEY`.
- [ ] `.github/workflows/nightly-quality.yml` succeeds (live eval, k6, pilot e2e).
      Jobs skip gracefully with a log when staging secrets are missing.
- [ ] Staging pilot depth e2e green: evidence popover, debate report export, role authz.
      **Workflow job:** `staging-pilot-e2e` (projects `pilot`, `pilot-member`, `pilot-viewer`).

## Operations

- [ ] Backup checklist reviewed and restore drill completed this quarter.
- [ ] On-call runbook, support contact, and incident severity definitions are
      published to pilot teams.
- [ ] Audit export verified for each pilot organization owner.

## Product analytics

- [ ] Organization administrators can disable optional analytics from `/admin`.
- [ ] Funnel events emit only pseudonymous identifiers and safe properties.
- [ ] Pilot cohort feature flags documented before enabling new capabilities.

## Go / no-go

- [ ] No open critical or high security findings.
- [ ] No unresolved data-loss, tenant isolation, or export reproducibility issues.
- [ ] Support can trace requests and jobs using correlation IDs without direct
      production database edits.
