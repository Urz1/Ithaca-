# 🚀 Ithaca Production Deployment Runbook

This guide provides end-to-end instructions for deploying Ithaca to production environments, covering **Vercel Serverless compute**, **Docker container orchestration**, **cloud database connection pooling**, and **OAuth identity alignment**.

---

## 1. Deployment Topologies

Choose the architecture that best fits your infrastructure requirements:

```mermaid
graph TD
    subgraph OptionA ["Option A: Vercel Serverless (Recommended)"]
        VercelCompute["Vercel Serverless Next.js Compute"]
        NeonDB[("Managed Cloud Postgres<br/>(Neon / Supabase / AWS RDS)")]
        UpstashRedis[("Upstash Redis Serverless")]
        VercelCompute --> NeonDB
        VercelCompute --> UpstashRedis
    end

    subgraph OptionB ["Option B: Self-Hosted Docker VPS"]
        DockerHost["Linux VPS (Ubuntu 24.04 / Debian)"]
        subgraph Containers ["Docker Compose Stack"]
            IthacaApp["ithaca-prod-web (Next.js Standalone)"]
            PostgresContainer[("ithaca-prod-db (PostgreSQL 16)")]
            RedisContainer[("ithaca-prod-redis (Redis 7)")]
            IthacaApp --> PostgresContainer
            IthacaApp --> RedisContainer
        end
        DockerHost --> Containers
    end
```

---

## 2. Option A: Vercel Serverless Deployment

### Step 1: Cloud Database Provisioning

Because Vercel functions are stateless and ephemeral, your database must be accessible over the internet with SSL:

1. **Recommended**: Create a project in [Neon](https://neon.tech) or in your Vercel Dashboard (**Storage &rarr; Create Database &rarr; Postgres**).
2. Obtain your pooled connection string:
   ```
   postgresql://username:password@ep-cool-fog-1234.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Import Repository in Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Select **Import** next to `RhizanTechnologies/Itacha`.
3. Set the Root Directory to `./` (or `ithaca-ui` if importing from the repo root).

### Step 3: Configure Production Environment Variables

Under the **Environment Variables** tab, add the following:

| Key                          | Description / Example                                          |
| :--------------------------- | :------------------------------------------------------------- |
| `DATABASE_URL`               | Cloud PostgreSQL URL with `?sslmode=require`                   |
| `BETTER_AUTH_SECRET`         | 32-byte secure key (e.g., generate via `openssl rand -hex 32`) |
| `BETTER_AUTH_URL`            | Your production URL: `https://ithaca.yourdomain.com`           |
| `NEXT_PUBLIC_APP_URL`        | Matches `BETTER_AUTH_URL`: `https://ithaca.yourdomain.com`     |
| `REQUIRE_EMAIL_VERIFICATION` | `false` (or `true` if Resend/SMTP is configured)               |
| `OPENALEX_EMAIL`             | `engineering@yourinstitution.edu` (polite pool)                |
| `GEMINI_API_KEY`             | Primary LLM classifier key                                     |
| `GROQ_API_KEY`               | Fallback LLM classifier key                                    |
| `GOOGLE_CLIENT_ID`           | Google OAuth Web Application Client ID                         |
| `GOOGLE_CLIENT_SECRET`       | Google OAuth Web Application Client Secret                     |
| `ORCID_CLIENT_ID`            | _(Optional)_ ORCID API Client ID                               |
| `ORCID_CLIENT_SECRET`        | _(Optional)_ ORCID API Client Secret                           |

### Step 4: Automated Build & Migration

The repository includes a dedicated build script [`scripts/vercel-build.mjs`](../scripts/vercel-build.mjs) registered as the `"vercel-build"` hook in `package.json`.

During every Vercel deployment:

1. `prisma generate` compiles the type-safe Prisma client.
2. `prisma migrate deploy` automatically executes against your cloud database, applying all 13 schema migrations with zero manual intervention.
3. Next.js compiles the optimized serverless bundles.

---

## 3. Option B: Self-Hosted Docker Compose

For on-premises institutional hosting or dedicated VPS deployment (e.g., DigitalOcean, AWS EC2, Hetzner):

### Step 1: Server Setup

1. Provision an Ubuntu 24.04 LTS server (minimum 4GB RAM, 2 vCPUs recommended).
2. Install Docker and Docker Compose v2:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
   ```

### Step 2: Clone and Configure

```bash
git clone git@github.com:RhizanTechnologies/Itacha.git
cd Itacha/ithaca-ui
cp .env.example .env.production
```

Configure `.env.production` with your secure production secrets.

### Step 3: Launch Production Stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

This initializes:

- `ithaca-prod-db`: PostgreSQL 16 on port 5434 with persistent Docker volume storage.
- `ithaca-prod-redis`: Redis 7 on port 6380 with append-only persistence.
- `ithaca-prod-web`: Optimized Next.js standalone container on port 3000.

### Step 4: Reverse Proxy & SSL (Caddy / Nginx)

Use Caddy for automatic Let's Encrypt SSL certificates:

```caddyfile
ithaca.yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## 4. OAuth Production Configuration

### Google Cloud Console Alignment

1. Navigate to [Google Cloud Console &rarr; APIs & Services &rarr; Credentials](https://console.cloud.google.com/).
2. Select your Web OAuth 2.0 Client ID.
3. Update the URI parameters:
   - **Authorized JavaScript Origins**:
     - `https://ithaca.yourdomain.com`
   - **Authorized Redirect URIs**:
     - `https://ithaca.yourdomain.com/api/auth/callback/google`
4. Under **OAuth consent screen**, ensure the Application Name is set to **Ithaca**.

### ORCID Developer Portal Alignment

1. Open [ORCID Developer Tools](https://orcid.org/developer-tools).
2. Set your **Redirect URI**:
   - `https://ithaca.yourdomain.com/api/auth/callback/orcid`

---

## 5. Post-Deployment Verification Checklist

Once deployed, verify the system health in sequence:

- [ ] **Probe Health Endpoint**:
  ```bash
  curl -I https://ithaca.yourdomain.com/api/health
  # Must return HTTP 200 OK
  ```
- [ ] **Verify Database Connection**: Open the homepage and confirm curated debates load in the dashboard.
- [ ] **Test User Signup & Onboarding**: Register a test researcher account and confirm completion of the epistemic orientation dialog.
- [ ] **Test Real-Time Classification**: Perform a paper search (e.g., _"Attention Is All You Need"_) and verify ForceAtlas2 graph nodes render with color-coded citation edges.
- [ ] **Check Content Security Policy**: Inspect browser DevTools Console to confirm no CSP violation reports for fonts, WebGL workers, or scripts.
