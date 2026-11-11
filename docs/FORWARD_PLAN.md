# Ithaca Forward Plan — Ease First

**North star:** Make every interaction easier. Own the niche: help a research team see where the field agrees, where it fights, and what evidence to trust — then share a reproducible debate map.

**Do not chase:** Elicit’s full PRISMA factory or Scite’s licensed corpus race. Steal their entry simplicity, not their category.

---

## P0 — Win the first 3 minutes (this tranche)

| #   | Outcome              | Done when                                                                              | Status |
| --- | -------------------- | -------------------------------------------------------------------------------------- | ------ |
| 1   | Unified entry        | Paste DOI / title / OpenAlex ID → graph without project ceremony; `?q=` actually loads | ✅     |
| 2   | Evidence-first edges | Snippet above AI label; one-tap correct                                                | ✅     |
| 3   | Frozen snapshots     | Share creates a durable `/explore?graph=<id>` that reloads the same nodes/edges        | ✅     |
| 4   | Trust hygiene        | Landing copy fixed; ORCID not advertised; competitive doc no longer claims mock-only   | ✅     |

## P1 — Daily lab infrastructure

| #   | Outcome                          | Done when                                                      | Status |
| --- | -------------------------------- | -------------------------------------------------------------- | ------ |
| 1   | Zotero one-way import            | Import dialog accepts Zotero BibTeX export with provenance     | ✅     |
| 2   | Collection watch + weekly digest | Bell toggle + `/api/cron/collection-digest` + Resend digest    | ✅     |
| 3   | Light collab edge notes          | Team notes thread on edges via `/api/edges/comments`           | ✅     |
| 4   | PDF open on edges                | Prefer OpenAlex `pdf_url`; Open PDF action in evidence popover | ✅     |
| 5   | Question → debate map            | Questions seed topic maps with contradiction bias              | ✅     |

## P2 — Own the niche, stay simple

| #   | Outcome                | Done when                                                                   | Status |
| --- | ---------------------- | --------------------------------------------------------------------------- | ------ |
| 1   | Debate Report export   | Share dialog exports markdown of contested claims + evidence + corrections  | ✅     |
| 2   | Temporal toggle        | Timeline layout on same canvas (x = year); force layout restorable          | ✅     |
| 3   | Confidence calibration | Dashboard shows correction rate, agreement proxy, unresolved low-confidence | ✅     |
| 4   | MCP-ready research API | `/api/research/stance` + `/api/research/conflict-path` documented           | ✅     |

## P3 — Institution packaging (pilot-ready)

| #   | Outcome                | Done when                                                               | Status |
| --- | ---------------------- | ----------------------------------------------------------------------- | ------ |
| 1   | Plan entitlements      | SOLO / LAB / INSTITUTION plans with seat and usage limits               | ✅     |
| 2   | Admin usage & seats    | Organization admin shows seats, AI usage, quotas, and plan              | ✅     |
| 3   | Domain allowlist       | Institution orgs can restrict invites to allowed email domains          | ✅     |
| 4   | Collab by plan         | LAB/INSTITUTION enable collaborative workspaces by default              | ✅     |
| 5   | Honest pricing surface | Landing shows three plans; SSO called out as upcoming, not fake-shipped | ✅     |

Full SAML/SCIM and billed Stripe checkout stay out of this tranche — package entitlements first so pilots can run as labs/institutions.

## P4 — Pilot readiness (ease the lab loop)

| #   | Outcome                       | Done when                                                                                          | Status |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| 1   | Invite email + accept path    | Invite sends Resend email; accept lands on `/explore` with org cookie; copy-link remains secondary | ✅     |
| 2   | First-session debate literacy | New users see graph literacy once; `hasCompletedOnboarding` persisted                              | ✅     |
| 3   | Watch + digest loop           | Watch UI shows weekly cadence + last digest; email deep-links to collection explore                | ✅     |
| 4   | Debate-map share/export ease  | Debate Report + frozen share primary; empty states CTA to Explore/Projects; honest org-share copy  | ✅     |
| 5   | Pilot support contact         | Admins set `supportContactEmail`; members see it in-app                                            | ✅     |

Out of scope: SAML/SCIM, Stripe, anonymous public graphs, contradiction-classified digests, fine-grained workspace ACLs.

## Testing (parallel track)

Product phases P0–P4 are feature-complete for pilots. Automated proof through T3 is in [`TESTING_PLAN.md`](./TESTING_PLAN.md). **Next:** T4 staging proof → T5 product-depth coverage → T6 enterprise hardening (deferred).

## Winning definition

A lab can import seeds, see contested paths in minutes, correct uncertain edges with visible evidence, share a frozen debate map, and later get a digest of new contradictions — without learning a second product language.
