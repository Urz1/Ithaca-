# Load tests

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) and run
scenarios only against approved staging or pre-production environments.

## Scenarios

| Script                      | Purpose                           | Auth required             |
| --------------------------- | --------------------------------- | ------------------------- |
| `load/public-pages.js`      | Landing, auth pages, docs, health | No                        |
| `load/health-and-public.js` | Minimal readiness smoke           | No                        |
| `load/authenticated-api.js` | Health + classify API latency     | Optional `SESSION_COOKIE` |

Thresholds are defined in `load/thresholds.js` and mirrored in
`src/lib/platform/load-budgets.ts`. Keep both files aligned when budgets change.

## Commands

```bash
# Public pages against staging
BASE_URL=https://staging.example.com npm run test:load

# Minimal readiness smoke
LOAD_SCENARIO=health-and-public BASE_URL=https://staging.example.com npm run test:load

# Authenticated classify path (seed a session cookie first)
BASE_URL=https://staging.example.com \
SESSION_COOKIE="ithaca.session_token=...; ithaca_org_id=..." \
VUS=5 \
DURATION=2m \
LOAD_SCENARIO=authenticated-api \
npm run test:load

# Export a pilot session cookie for local/staging load drills
npm run test:db:up
npm run test:e2e:seed
npm run test:load:session

# Validate budget definitions without running k6
npm run test:load:budgets
```

## Release gate expectations

Every scenario must define request-rate, latency, error-rate, and provider-cost
budgets before it is used as a release gate. See `docs/SERVICE_LEVELS.md` for
the product objectives that these thresholds enforce.

## Fixtures

`load/fixtures/sample-dois.txt` contains openly licensed DOI examples for manual
import/export drills. Pair it with seeded pilot accounts documented in
`docs/launch/PILOT_CHECKLIST.md`.
