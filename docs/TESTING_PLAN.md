# Ithaca Testing Plan — Production Proof

**North star:** Automate proof for the pilot lab loop — invite → first debate map → correct → freeze/share → weekly digest — with **tenant isolation** as a hard gate. Prefer high-risk path coverage over vanity % numbers.

**Do not chase:** 90% line coverage, visual regression farms, or live LLM flakiness in PR CI. Keep AI quality in a separate eval lane.

**Baseline (Jul 2026):** ~81 unit cases, **19 integration** cases, **8 e2e** (6 smoke + pilot setup/happy path), scoped **59%** lib/modules coverage gate, CI = lint/typecheck/unit/integration/eval/coverage/e2e/build.

Related: [testing-maturity canvas](../../.cursor/projects/home-sadam-Development-product-Itacha-ithaca-ui/canvases/testing-maturity.canvas.tsx) · product plan in `FORWARD_PLAN.md`.

---

## Pyramid targets

| Layer                       | Now | After T0–T2 | PR CI?         | Notes                                            |
| --------------------------- | --: | ----------: | -------------- | ------------------------------------------------ |
| Unit (`src/**/*.test.ts`)   |  73 |        ~90+ | Yes            | Keep growing on pure logic                       |
| Integration (DB / actions)  |   0 |       15–25 | Yes            | Real Postgres; tenant + invite + cron            |
| API route contracts         |   2 |       10–15 | Yes            | Auth, budget, org scope                          |
| E2E (Playwright)            |   6 |        8–12 | Smoke in PR    | Auth’d happy path can be nightly if flaky        |
| AI eval                     |   1 |     1 live+ | Offline in PR  | Live model: nightly workflow (`eval:ai:live`)    |
| Load (k6)                   |   · |     nightly | Manual/nightly | `nightly-quality` + weekly `load-test` workflows |
| Coverage floor (`src/lib`+) | 20% |         50% | Yes            | Scoped thresholds, not whole `src/` at once      |

---

## T0 — CI + harness (unblocks everything)

| #   | Outcome                | Done when                                                                                        | Status |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| 1   | Playwright on PR       | `ci.yml` runs `npm run test:e2e` (Chromium smoke) against built or `webServer` app               | ✅     |
| 2   | Test DB harness        | Vitest can run against Postgres (docker-compose or CI service) with migrate + truncate helpers   | ✅     |
| 3   | Seed helpers           | Factories for User / Org / Membership / Invitation / Collection / SavedGraph                     | ✅     |
| 4   | Coverage gate (scoped) | `test:coverage` in CI with **45%+** lines on `src/lib/**` + `src/modules/**` (raise to 50% next) | ✅     |

**Out of T0:** Authenticated e2e (needs stable session seed — T2).

**Local commands:**

```bash
npm run test:db:up          # Postgres on localhost:5434
npm run test:unit           # 81 unit tests
npm run test:integration    # 19 DB integration tests
npm run test:e2e            # 8 Playwright tests (smoke + pilot)
npm run test:coverage       # scoped lib/modules gate
```

---

## T1 — Tenant & lab-ops integration (highest risk)

| #   | Outcome                       | Done when                                                                                                                                          | Status |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Cross-tenant isolation        | Org A cannot read/write Org B: edge comments, saved graphs/artifacts, jobs, collections (assert at action/API)                                     | ✅     |
| 2   | Invite lifecycle              | Create → email payload has `/invite/<token>` → accept (matching email) → membership + active-org cookie; wrong email / expired / accepted rejected | ✅     |
| 3   | Domain allowlist on invite    | INSTITUTION with domains blocks external invite at `createOrganizationInvitation`                                                                  | ✅     |
| 4   | Cron digest auth + scope      | Missing/wrong `CRON_SECRET` → 401; with secret, only `watchEnabled` collections; org-scoped job payloads                                           | ✅     |
| 5   | Jobs process gate             | Invalid/missing signature → 401; valid dispatch marks handler path (digest/export) without cross-org artifacts                                     | ✅     |
| 6   | Plan quotas on mutating paths | Seat exhaustion blocks invite; AI budget helper rejects when over `maxAiRequests`                                                                  | ✅     |

**Target:** 15–25 integration cases. No UI required.

---

## T2 — Authenticated pilot e2e + API contracts

| #   | Outcome                  | Done when                                                                                                                                 | Status |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Seeded pilot session     | Playwright storageState (or test login helper) for OWNER of a LAB org                                                                     | ✅     |
| 2   | Debate-map happy path    | Sign in → explore with frozen graph → node/edge counts → correct via API → share dialog exposes frozen link + Debate Report export button | ✅     |
| 3   | Classify API contracts   | Auth required; oversized batch rejected; feature-flag off returns structured disable; budget exceeded returns structured error            | ✅     |
| 4   | Correct + comments authz | VIEWER cannot correct or post comments; MEMBER can; responses use API error envelope                                                      | ✅     |
| 5   | Smoke stay green         | Existing public smoke + auth redirects remain in PR; happy path may run PR or nightly if flaky                                            | ✅     |

**Out of T2:** Full canvas interaction matrix, mobile e2e, multi-browser.

---

## T3 — Quality lanes (scheduled, not PR-blocking)

| #   | Outcome                 | Done when                                                                               | Status |
| --- | ----------------------- | --------------------------------------------------------------------------------------- | ------ |
| 1   | Live classifier eval    | ≥30 labeled pairs; calls real provider; regression tracked separately from PR hard-fail | ✅     |
| 2   | Nightly staging load    | Existing k6 + real `SESSION_COOKIE`; classify path expects success under budget         | ✅     |
| 3   | Launch gate includes T1 | `launch:check` / runbook requires T1 suite green before design-partner expand           | ✅     |

**Still out of scope for this plan:** a11y axe suite, Percy/Chromatic, chaos/fault injection, Stripe/SSO tests (until those features ship).

---

## What each tranche proves

```
T0  CI can run e2e + DB tests; coverage can't silently collapse on lib/modules
T1  Multi-tenant research data won't leak; invites/cron/jobs/quotas behave
T2  The lab loop a pilot actually clicks through works end-to-end
T3  Model quality and capacity are watched without flaking PR merges
```

---

## Suggested order of work (one sprint each if focused)

1. **T0.2 + T0.3** — harness first (everything else depends on it)
2. **T1.1** — tenant isolation (security)
3. **T1.2 + T1.3** — invites (pilot onboarding)
4. **T1.4 + T1.5** — cron/jobs (ops reliability)
5. **T0.1 + T0.4** — CI wiring + coverage floor
6. **T1.6** — quotas
7. **T2.*** — authenticated e2e + API contracts
8. **T3.*** — scheduled lanes

---

## Definition of “pilot production ready” (testing)

All of the following are true:

- [x] T0 complete (e2e smoke + DB harness in CI)
- [x] T1 complete (isolation, invites, cron, jobs, quotas)
- [x] T2 complete (seeded pilot e2e + API contracts)
- [x] T3 scheduled lanes wired (live eval, nightly load, launch gate + integration)
- [ ] T2 happy path green on staging at least nightly
- [ ] No known untested path in the Top-10 risk list from the maturity audit without a tracking issue

---

## Commands (target end state)

```bash
npm test                  # unit + integration (Vitest)
npm run test:coverage     # gated thresholds
npm run test:e2e          # Playwright (PR smoke + pilot)
npm run eval:ai           # offline baseline (PR)
npm run eval:ai:live      # live provider eval (nightly / manual)
npm run test:load         # k6 against approved staging
npm run test:load:session # print SESSION_COOKIE for k6
npm run launch:check      # launch gate incl. T1 integration suite
```

---

## Gap summary (after T0–T3)

T0–T3 closed the **pilot-critical** gates: tenancy, lab ops, one authenticated happy path, and scheduled quality lanes. What remains is **depth, staging proof, and product-surface coverage**.

| Gap                                                 | Risk if ignored                            | Target tranche    |
| --------------------------------------------------- | ------------------------------------------ | ----------------- |
| Staging not exercised nightly                       | “Works in CI” ≠ works in prod-like env     | T4                |
| Top-10 audit paths not all closed/ticketed          | Unknown blind spots at expand              | T4                |
| Canvas & collab UI mostly manual                    | Regressions in evidence, export, digest UX | T5                |
| ~7 API handlers still without contract tests        | Authz/cost bugs on secondary routes        | T5                |
| Coverage gate at 45% on subset of `lib/`+`modules/` | Logic regressions in untested modules      | T5                |
| Live eval / k6 never run with secrets               | Model drift & capacity surprises           | T4 (ops)          |
| Durable export + blob + QStash paths                | Large graph export failures in pilot       | T5                |
| a11y / visual / chaos                               | UX & resilience gaps at scale              | T6 (defer)        |
| Stripe / SSO                                        | Billing & enterprise auth                  | T6 (when shipped) |

---

## Top-10 risk audit — current proof (Jul 2026)

Track each item to **✅ automated**, **🎫 ticket**, or **manual runbook**. Goal: nothing stays silently untested.

| #   | Path                                           | Proof today                              | T4–T5 action                                         |
| --- | ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| 1   | Invite → email → accept → org cookie           | ✅ integration + Resend payload asserted | Staging smoke: one real invite round-trip/month      |
| 2   | Cross-tenant reads (comments, artifacts, jobs) | ✅ integration                           | Add artifact download + export job isolation         |
| 3   | Cron collection digest + `CRON_SECRET`         | ✅ integration                           | Nightly staging cron dry-run (optional)              |
| 4   | Jobs process signature + handlers              | ✅ integration (dispatch gate)           | Handler outcome tests: export artifact scoped        |
| 5   | Classify + AI budget / flags                   | ✅ integration + k6 scaffold             | First green nightly k6 with `SESSION_COOKIE`         |
| 6   | Classify correct supersession                  | ✅ e2e API + unit version                | UI correction persists after reload (T5)             |
| 7   | Frozen share `/explore?graph=`                 | ✅ e2e + unit serialize                  | Debate Report **download content** assertion (T5) ✅ |
| 8   | Plan seat/quota on invite + AI                 | ✅ integration                           | Admin UI quota display smoke (T5, optional)          |
| 9   | Domain allowlist on invite                     | ✅ integration                           | —                                                    |
| 10  | Session / role write attempts                  | ✅ integration authz                     | Viewer **UI** attempt blocked or 401 (T5) ✅         |

---

## T4 — Staging proof & launch checklist (ops, ~3–5 days)

**Goal:** Turn wired automation into **evidence on staging** before expanding the design-partner cohort.

| #   | Outcome                 | Done when                                                                                        | Status     |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| 1   | Repo secrets configured | `STAGING_BASE_URL`, `LOAD_TEST_SESSION_COOKIE`, `GEMINI_API_KEY` or `GROQ_API_KEY` set in GitHub | ⏳ ops     |
| 2   | First green nightly     | `nightly-quality` workflow succeeds (live eval + k6, or k6 skips gracefully with log)            | ⏳ ops     |
| 3   | Staging pilot e2e       | Playwright `pilot` project runs against staging URL in nightly (or weekly) workflow              | ✅ wired   |
| 4   | Pilot checklist sync    | `docs/launch/PILOT_CHECKLIST.md` items map 1:1 to a command or workflow run                      | ✅         |
| 5   | Risk list hygiene       | Every Top-10 row is ✅ or has a linked GitHub issue                                              | ⏳ partial |
| 6   | Coverage floor bump     | Scoped gate **45% → 50%** on `src/lib/**` + `src/modules/**`                                     | ✅         |

**Out of T4:** Multi-region, production load at scale.

**Commands / workflows:**

```bash
# One-time secret validation (local)
npm run test:load:session          # print cookie for k6
BASE_URL=https://staging... LOAD_SCENARIO=authenticated-api npm run test:load
RUN_LIVE_CLASSIFIER_EVAL=1 npm run eval:ai:live

# CI
.github/workflows/nightly-quality.yml
.github/workflows/load-test.yml     # weekly
```

---

## T5 — Product depth & route coverage (~1 sprint)

**Goal:** Cover the **rest of the lab loop** and secondary API surfaces pilots actually touch after week one.

### E2E (Playwright)

| #   | Outcome               | Done when                                                                          | PR CI?     |
| --- | --------------------- | ---------------------------------------------------------------------------------- | ---------- |
| 1   | Debate Report content | Export downloads; markdown contains contested edge snippet + correction language   | ✅ nightly |
| 2   | Edge evidence         | Frozen graph: open edge popover; snippet visible                                   | ✅ nightly |
| 3   | Digest deep link      | Seed collection + digest link lands on `/explore?collection=` with graph stats > 0 | ✅ nightly |
| 4   | Role matrix           | VIEWER cannot correct via UI; MEMBER can post edge comment                         | ✅ nightly |
| 5   | Onboarding once       | New user sees literacy dialog once; `hasCompletedOnboarding` persists              | ✅ nightly |
| 6   | Stable selectors      | `data-testid` on canvas footer, share dialog, edge evidence                        | ✅         |

Target: **14–18 e2e cases** (smoke in PR; depth nightly if flaky).

### Integration / API contracts

| #   | Route / action                | Done when                                                   |
| --- | ----------------------------- | ----------------------------------------------------------- |
| 1   | `/api/research/stance`        | Auth + org scope + structured 400/401                       | ✅  |
| 2   | `/api/research/conflict-path` | Same + empty graph handling                                 | ✅  |
| 3   | `/api/summarize`              | Feature flag off → 503; budget exceeded → 429               | ✅  |
| 4   | `/api/chat`                   | Auth required; rate limit envelope                          | ✅  |
| 5   | Artifact download             | Cross-tenant artifact → 404/401                             | ✅  |
| 6   | Graph export job              | Handler writes artifact under correct org; tenant isolation | ✅  |
| 7   | Correct supersession          | User correction wins over stale cache in DB integration     | ✅  |

Target: **+8–12 integration cases** (25–35 total).

### Unit / coverage

| #   | Outcome                              | Done when                                                   |
| --- | ------------------------------------ | ----------------------------------------------------------- |
| 1   | `debate-report` export edge cases    | Contested-only filter, empty graph                          | ✅  |
| 2   | `temporal-layout` / graph algorithms | Regression on layout restore                                | ✅  |
| 3   | Import pipeline                      | Zotero BibTeX sample → paper IDs                            | ✅  |
| 4   | Coverage scope review                | Document excluded files; add 2–3 high-churn modules to gate | ✅  |

**Coverage gate scope (`vitest.config.ts` + `scripts/check-coverage.mjs`):**

- **Included:** `src/lib/**`, `src/modules/**` (aggregate ≥50% lines)
- **Excluded from gate** (integration/network heavy; covered indirectly):
  - `src/lib/graph-export.ts` — browser canvas export
  - `src/lib/api/openalex-provider.ts`, `semantic-scholar-client.ts` — live bibliographic APIs
  - `src/lib/api/citation-classifier.ts`, `llm-router.ts` — LLM + live classify (baseline eval + integration mocks)
  - `src/modules/jobs/handlers/**` — durable job handlers (integration via `jobs-process`, `graph-export` tests)
- **High-churn modules in gate with unit tests:** `debate-report.ts`, `temporal-layout.ts`, `modules/papers/import-papers.ts`

---

## T6 — Hardening & enterprise (defer until post-pilot or feature ship)

**Goal:** Production polish and enterprise blockers — **not** PR-blocking for first design partners.

| #   | Lane                    | Trigger                      | Done when                                                         |
| --- | ----------------------- | ---------------------------- | ----------------------------------------------------------------- |
| 1   | Accessibility           | Before public marketing push | axe on `/`, `/explore`, `/admin`; zero critical violations        |
| 2   | Visual regression       | Landing redesign             | Percy/Chromatic on landing + sign-in only                         |
| 3   | Chaos / fault injection | Before INSTITUTION scale     | Redis down → rate limit falls back; DB timeout → 503 not 500 leak |
| 4   | Multi-browser e2e       | Mobile complaints            | Firefox + WebKit smoke subset                                     |
| 5   | Stripe checkout         | Billing ships                | Payment webhook + entitlements integration tests                  |
| 6   | SAML / SSO              | Enterprise package           | IdP mock + session + org provisioning tests                       |
| 7   | Load at scale           | >50 concurrent labs          | k6 ramp to SLA in `SERVICE_LEVELS.md`; classify cost budget alarm |

---

## What T4–T6 prove

```
T4  Staging mirrors CI green; launch checklist is executable, not aspirational
T5  Full lab loop (digest, evidence, export, roles) + secondary APIs are automated
T6  Enterprise-grade resilience, a11y, and billing when the product grows into them
```

---

## Suggested order (after T3)

1. **T4.1–T4.3** — secrets + first green nightly + staging e2e (unblocks expand)
2. **T4.5–T4.6** — risk tickets + coverage 50%
3. **T5.6** — `data-testid` (stabilizes everything below)
4. **T5.1–T5.4** — e2e depth (report, evidence, digest, roles)
5. **T5 integration table** — research, summarize, chat, artifacts, export job
6. **T6** — pick lanes when product or compliance demands them

---

## Definition of “expand beyond design partners” (testing)

All of the following:

- [ ] T4 complete (staging nightly green ≥1 week)
- [ ] Top-10 risk audit: all ✅ or 🎫 with owner
- [ ] T5 e2e depth green on staging nightly — **16 e2e cases** locally
- [ ] ≥30 integration cases — **32 total** ✅
- [ ] Scoped coverage ≥50%; live eval trend stable (no 2-week regression without review)
- [ ] T6 items explicitly deferred with dates **or** completed for enterprise tier
