# 📚 Ithaca Engineering & Product Documentation Hub

Welcome to the centralized documentation repository for **Ithaca**. This directory contains comprehensive architectural specifications, API contracts, deployment runbooks, security threat models, and product strategy documentation.

---

## 🗺️ Documentation Directory

### 1. Architecture & Core Systems

- **[`ARCHITECTURE.md`](./ARCHITECTURE.md)** ⭐ — Complete architectural specification: Tri-partite epistemic model, dual-provider LLM cascade, WebGL ForceAtlas2 rendering, and multi-tenant isolation.
- **[`USER_FLOW.md`](./USER_FLOW.md)** — Complete user journey documentation: Authentication lifecycle, onboarding dialogs, and workspace transitions.
- **[`AUTH_STATE_DIAGRAMS.md`](./AUTH_STATE_DIAGRAMS.md)** — Visual state machines, database transactions, and OAuth redirect flows.

### 2. API & Integration Reference

- **[`API_REFERENCE.md`](./API_REFERENCE.md)** ⭐ — Exhaustive specification of all 40+ REST and Server-Sent Event (SSE) streaming route handlers.
- **[`RESEARCH_API.md`](./RESEARCH_API.md)** — Deep dive into OpenAlex polite pool integration, Semantic Scholar contexts, and citation normalization.

### 3. Operations & Production Deployment

- **[`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md)** ⭐ — End-to-end production deployment runbook for Vercel Serverless, Docker Compose, cloud database pooling, and OAuth alignment.
- **[`LAUNCH_RUNBOOK.md`](./LAUNCH_RUNBOOK.md)** — Pre-flight checklist, sanity verification probes, and post-launch validation protocols.
- **[`OPERATIONS.md`](./OPERATIONS.md)** — Incident management, database backups, and telemetry alerting policies.

### 4. Quality Assurance & Performance

- **[`TESTING_PLAN.md`](./TESTING_PLAN.md)** — Full breakdown of the 337 automated tests: unit suites, integration mocks, chaos dropouts, and concurrency stress tests.
- **[`PERFORMANCE_BUDGETS.md`](./PERFORMANCE_BUDGETS.md)** — WebGL framerate thresholds (60 FPS), serverless execution budgets, and memory leak prevention.
- **[`THREAT_MODEL.md`](./THREAT_MODEL.md)** — OWASP top 10 mitigation, cryptographic CSP nonces, session hijacking defense, and tenant data isolation.

### 5. Product Strategy & Commercial Roadmap

- **[`ROADMAP.md`](./ROADMAP.md)** — Multi-quarter engineering milestones: Institutional SSO, offline citation caching, and collaborative canvases.
- **[`COMPETITIVE_ANALYSIS.md`](./COMPETITIVE_ANALYSIS.md)** — Strategic differentiation against Scite.ai, Connected Papers, Elicit, and Consensus.
- **[`CONTROL_MATRIX.md`](./CONTROL_MATRIX.md)** — Organizational governance and compliance matrix.

---

## 🛠️ Contributing to Documentation

When introducing new endpoints, database models, or visual shaders:

1. Update [`API_REFERENCE.md`](./API_REFERENCE.md) with inbound request schemas and sample JSON payloads.
2. If modifying schema migrations, verify and document in [`ARCHITECTURE.md`](./ARCHITECTURE.md).
3. Ensure all Mermaid diagrams render cleanly in GitHub flavored markdown.
