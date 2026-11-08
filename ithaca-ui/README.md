<div align="center">

# 🏛️ ITHACA

### Autonomous Epistemic Knowledge Graph & Dialectic Scientific Literature Explorer

[![Next.js](https://img.shields.io/badge/Next.js-16.2.11-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.2.0-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Tests-337%20Passed-success?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![WebGL](https://img.shields.io/badge/WebGL-Sigma.js%20%2B%20Graphology-orange?style=for-the-badge&logo=webgl)](https://www.sigmajs.org/)

<p align="center">
  <strong>Navigate scientific consensus, contradictions, and paradigm shifts beyond flat citation counts.</strong>
  <br />
  Powered by dual-provider LLM reasoning, WebGL ForceAtlas2 graph physics, and OpenAlex polite pool ingestion.
</p>

[Explore Documentation](./docs/README.md) • [Architecture Guide](./docs/ARCHITECTURE.md) • [API Reference](./docs/API_REFERENCE.md) • [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)

</div>

---

## 🔬 The Problem: Blind Citation Networks

Traditional academic search engines (Google Scholar, PubMed, Scopus) treat citations as **undifferentiated hyperlinks**. A paper cited 500 times is treated as authoritative, even if 300 of those citations represent **failed replications or empirical refutations**.

Researchers, PhD candidates, and institutional lab directors waste hundreds of hours manually reading bibliographies just to answer basic epistemological questions:

- _Is this finding universally accepted or fiercely contested?_
- _Which specific sentences in the literature dispute this methodology?_
- _What foundational assumptions does this new breakthrough build upon?_

**Ithaca** solves this by constructing a **dynamic, dialectic knowledge topology** directly from peer-reviewed literature.

---

## ✨ Core Innovations

### 1. The Tri-Partite Epistemic Model

Rather than calculating raw citation metrics, Ithaca’s classification engine analyzes citation context to extract exact epistemic stances:

- <span style="color:#10b981; font-weight:bold;">● SUPPORTS / REPLICATES</span>: Independent confirmation of findings, identical empirical outcomes, or mathematical validation.
- <span style="color:#ef4444; font-weight:bold;">● REFUTES / DISAGREES</span>: Methodological challenges, non-replicability, statistical artifacts, or conflicting conclusions.
- <span style="color:#8b5cf6; font-weight:bold;">● EXTENDS</span>: Generalizing hypotheses to novel domains, adapting algorithms, or introducing new mechanisms.
- <span style="color:#64748b; font-weight:bold;">● CITES / MENTIONS</span>: Neutral background mentions or related work taxonomy.

### 2. High-Performance WebGL Graph Canvas

- **Sigma.js & Graphology**: Renders clusters of up to 10,000+ scientific papers and tens of thousands of citation edges at a stable **60 FPS**.
- **ForceAtlas2 Web Worker**: Physics layout stabilization executed asynchronously off the main thread, preventing UI jank during large graph computations.
- **Dialectic Tension Clustering**: Papers naturally separate into consensus islands and controversy fault lines based on edge polarity.

### 3. Dual-Provider AI Fallback Routing

- **Primary Engine**: Google Gemini API for high-throughput batch claim extraction and epistemic classification.
- **Sub-Second Fallback**: Groq API (Llama 3.3 70B Versatile) for instant failover when rate limits, token quotas, or latency spikes occur.
- **Passage-Level Evidence Grounding**: Every classified relationship is backed by the exact citation context excerpt and linked to the publisher DOI.

### 4. Advanced Dialectic Research Algorithms

- **Sovereign Slice**: Isolate independent methodological lineages to verify if a consensus is genuinely diverse or an echo chamber of one lab network.
- **Conflict Path Discovery**: Pathfinding algorithms that surface the shortest chain of contradictory citations between two disagreeing research groups.
- **Debate Intensity Matrix**: Mathematical quantification of scientific controversy across disciplines, years, and methodology tags.

### 5. Multi-Tenant Lab Workspaces & Enterprise RBAC

- **Role-Based Access Control**: `OWNER`, `ADMIN`, `MEMBER`, and `VIEWER` roles with strict tenant-isolated queries.
- **Tiered Lab Entitlements**: Scalable quotas across `SOLO`, `SOLO_PRO`, `LAB`, and `INSTITUTION` plans.
- **Reference Library Sync**: Native integration with Zotero collections, generating real-time dispute alerts when papers in your library are contested in newly published preprints.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    Client["Browser / Web Client (Next.js 16 App Router)"]

    subgraph Compute ["Application Compute Layer"]
        Proxy["Proxy & Security Checkpoint<br/>(CSP Nonce, RBAC, Rate Limiting)"]
        API["Next.js Serverless Route Handlers"]
        Router["LLM Router & Fallback Cascade"]
        Worker["ForceAtlas2 Web Worker"]
    end

    subgraph Data ["Data & Storage Layer"]
        Prisma["Prisma ORM Client"]
        PostgreSQL[("PostgreSQL 16 DB<br/>(Tenant Schemas & Graph Records)")]
        Redis[("Upstash Redis / In-Memory<br/>(Rate Limits & Epistemic Cache)")]
    end

    subgraph External ["External Intelligence Providers"]
        OpenAlex["OpenAlex API<br/>(Polite Pool & Works Metadata)"]
        S2["Semantic Scholar API<br/>(Citation Contexts & Embedding Vectors)"]
        Gemini["Google Gemini API<br/>(Primary Epistemic Classifier)"]
        Groq["Groq Cloud API<br/>(Fallback Dialectic Classifier)"]
    end

    Client --> Proxy --> API
    Client -.-> Worker
    API --> Router
    Router --> Gemini
    Router -.->|Failover / Rate Limit| Groq
    API --> OpenAlex
    API --> S2
    API --> Prisma
    Prisma --> PostgreSQL
    API --> Redis
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: `v20.x` or later
- **Package Manager**: `pnpm` (v9+ recommended)
- **Container Engine**: Docker & Docker Compose (for local PostgreSQL & Redis)

### 1. Clone the Repository

```bash
git clone git@github.com:RhizanTechnologies/Itacha.git
cd Itacha/ithaca-ui
```

### 2. Configure Environment Variables

Copy the sample environment configuration file:

```bash
cp .env.example .env
```

Fill in the minimum required parameters:

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secure-random-32-byte-hex-string

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/ithaca_db

# AI Classification Providers
GEMINI_API_KEY=your_google_gemini_key
GROQ_API_KEY=your_groq_api_key

# Research Polite Pool
OPENALEX_EMAIL=researcher@your-institution.edu
```

### 3. Spin Up Local Infrastructure

Launch the local PostgreSQL 16 and Redis containers:

```bash
# Starts Postgres on port 5434 and Redis on port 6380
docker compose -f docker-compose.prod.yml up -d db redis
```

### 4. Apply Schema Migrations

```bash
pnpm prisma:generate
pnpm prisma:migrate:deploy
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification Suite

Ithaca maintains an industrial-grade automated test suite with **337 tests** across unit, integration, chaos, and stress categories:

```bash
# Run all unit tests (50 test suites, 261 tests)
pnpm test:unit

# Run full integration test suite (16 suites, 76 tests against live DB)
pnpm test:integration

# Run full verification check (Lint, Typecheck, Prisma validate, Unit tests)
pnpm check

# Run Chaos & Fault-Tolerance Tests
pnpm vitest run src/test/unit/core-chaos-fault-tolerance.test.ts

# Run Concurrency & Stress Tests
pnpm vitest run src/test/unit/core-concurrency-stress.test.ts

# Run Giant Graph Load Budgets
pnpm test:load:budgets
```

| Test Category          | Suites | Tests | Scope                                                                          |
| :--------------------- | :----: | :---: | :----------------------------------------------------------------------------- |
| **Unit Tests**         |   50   |  261  | LLM Router cascades, topology algorithms, quota policies, tenancy RBAC         |
| **Integration Tests**  |   16   |  76   | End-to-end API routes, DB transactions, Better Auth sessions, webhook handlers |
| **Chaos & Resilience** |   —    |   —   | Provider dropouts, malformed JSON stream recovery, network latency spikes      |
| **Production Build**   |   40   |  40   | Static and dynamic Next.js App Router verification via Turbopack               |

---

## 🚢 Production Deployment

### Option A: Vercel Serverless (Recommended)

Ithaca is optimized for Vercel deployment with automated migrations and serverless execution:

1. Import repository `RhizanTechnologies/Itacha` into [Vercel](https://vercel.com/new).
2. Attach a managed PostgreSQL database (e.g., **Vercel Postgres powered by Neon**).
3. Set the required production environment variables (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `GEMINI_API_KEY`, etc.).
4. Ithaca's [`scripts/vercel-build.mjs`](./scripts/vercel-build.mjs) automatically applies all 13 Prisma schema migrations during the build step before compiling Next.js serverless functions.

### Option B: Self-Hosted Docker Production

Deploy the complete production stack (Web + PostgreSQL + Redis) using Docker Compose:

```bash
# Build and run the hardened production containers
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📂 Project Structure

```
ithaca-ui/
├── src/
│   ├── app/                      # Next.js 16 App Router
│   │   ├── (public)/             # Landing page, sign-in, sign-up, legal
│   │   ├── (app)/                # Authenticated research workspace
│   │   │   ├── explore/          # Interactive WebGL graph canvas
│   │   │   ├── dashboard/        # Watchlists, starter debates, history
│   │   │   ├── projects/         # Saved research graphs & collections
│   │   │   └── admin/            # Organization management & seat quotas
│   │   └── api/                  # 40+ REST & streaming endpoints
│   ├── components/               # React 19 UI component system
│   │   ├── canvas/               # WebGL graph canvas, docks, evidence popovers
│   │   ├── auth/                 # Sign-in, sign-up, and onboarding dialogs
│   │   ├── navigation/           # Lab quickstart milestone checklists
│   │   └── visual/               # ForceAtlas2 constellation, fluid mechanics
│   ├── lib/                      # Core business logic & platform services
│   │   ├── api/                  # LLM router, OpenAlex & Semantic Scholar clients
│   │   ├── platform/             # Quotas, feature flags, telemetry, Redis
│   │   └── auth.ts               # Better Auth v5 engine & security hooks
│   ├── modules/                  # Domain-specific modules (jobs, papers, AI)
│   ├── proxy.ts                  # Next.js 16 security proxy & route guarding
│   └── stores/                   # Zustand state stores (canvas, filters, debate)
├── prisma/                       # Database schema & 13 production migrations
├── docs/                         # Comprehensive architectural & API documentation
├── scripts/                      # Build automation, evaluation datasets, and seeders
└── docker-compose.prod.yml       # Production container orchestration
```

---

## 🔒 Security & Compliance

- **Authentication**: Cryptographically signed session cookies (`ithaca.session_token`) with 7-day expiration and automatic 24-hour rolling updates.
- **Content Security Policy (CSP)**: Dynamic per-request cryptographic nonces preventing XSS attacks.
- **Tenant Isolation**: Multi-tenant database foreign keys scoped automatically via Prisma middleware and query builders.
- **Distributed Rate Limiting**: Upstash Redis sliding-window token bucket with in-memory graceful fallback.
- **Adversarial Input Hardening**: Strict Zod runtime schema validation on every inbound JSON payload and query parameter.

---

## 📄 License & Attribution

Developed by **Rhizan Technologies**. All rights reserved.  
For academic partnership inquiries, institutional grants, or commercial licensing, contact `engineering@rhizan.com`.
