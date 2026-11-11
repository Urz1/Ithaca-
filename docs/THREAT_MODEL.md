# Ithaca Threat Model

## Security objectives

- Prevent cross-organization access to research, graphs, exports, and metadata.
- Protect account credentials, OAuth tokens, session cookies, and provider keys.
- Preserve the provenance and review history of AI-generated classifications.
- Keep untrusted paper content, imports, and chat prompts from controlling tools
  or rendering executable content.
- Make sensitive administrative and data lifecycle actions attributable.

## Trust boundaries

1. Browser to Next.js application and API.
2. Application to Better Auth and PostgreSQL.
3. Application and workers to OpenAlex, Semantic Scholar, LLM, email, cache,
   queue, and object-storage providers.
4. Organization members to other organizations and privileged roles.
5. Imported papers and files to parsers, AI prompts, exports, and UI rendering.

## Principal threats and controls

### Tenant isolation

Threats include guessed identifiers, missing organization filters, invitation
reuse, role escalation, and support impersonation.

Controls:

- Resolve organization context server-side from an authenticated membership.
- Apply organization filters in repositories, not only in pages.
- Centralize role permissions and test every cross-tenant mutation.
- Use expiring, single-use invitation tokens.
- Audit membership, role, export, share, and impersonation events.

### Authentication and sessions

Threats include credential stuffing, session theft, OAuth confusion, reset-token
abuse, and stale privileged sessions.

Controls:

- Verified email, secure cookies, CSRF protection, trusted origins, and rate
  limits.
- Revoke sessions after password or privilege changes.
- Never expose an OAuth option unless its provider is configured.
- Add user-visible device/session management and recovery notifications.

### Imports and exports

Threats include oversized files, parser denial of service, formula injection,
malicious URLs, and accidental data disclosure through share links.

Controls:

- Enforce size, type, row, and processing-time limits.
- Parse in isolated workers and treat all imported text as untrusted.
- Escape spreadsheet formula prefixes and sanitize exported filenames.
- Use scoped, expiring share tokens and signed object URLs.

### AI and external content

Threats include prompt injection, fabricated evidence, sensitive-data leakage,
provider outages, and uncontrolled cost.

Controls:

- Separate instructions from quoted evidence and never grant paper text tool
  authority.
- Require structured output, citations, confidence, model/prompt versions, and
  human correction.
- Redact secrets and minimize personal data before provider calls.
- Apply provider allowlists, budgets, timeouts, retries, and kill switches.

### Availability and abuse

Threats include expensive graph expansion, classification floods, provider
quota exhaustion, and cache/storage amplification.

Controls:

- Organization quotas and distributed rate limits.
- Durable idempotent jobs with bounded retries and dead-letter handling.
- Maximum graph/import/export sizes and graceful partial-result behavior.
- Circuit breakers and stale-cache fallbacks for provider degradation.

## Verification cadence

- Run dependency, static, secret, and authorization tests on every pull request.
- Review this model for every new provider, import format, sharing mechanism,
  administrative capability, or tenant-scoped model.
- Exercise account deletion, backup restore, privilege escalation, and incident
  response at least annually; restore drills should occur quarterly.
