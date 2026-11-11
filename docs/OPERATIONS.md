# Operations Runbook

## Local setup

1. Install Node.js 22 and PostgreSQL 16 or newer.
2. Copy `.env.example` to `.env.local` and replace all required values.
3. Run `npm ci`.
4. Run `npm run prisma:migrate:deploy`.
5. Start the application with `npm run dev`.

Before opening a pull request, run:

```bash
npm run check
npm run build
```

## Production deployment

The supported baseline is Vercel plus managed PostgreSQL. Configure all
variables documented in `.env.example` in the deployment environment.

Deployment order:

1. Create a database backup or verify point-in-time recovery.
2. Run `npm ci`.
3. Run `npm run prisma:migrate:deploy`.
4. Run `npm run build`.
5. Deploy the immutable build.
6. Verify `/api/health`, authentication, paper search, and graph loading.

Database migrations must be backward compatible with the currently deployed
application. Use expand/migrate/contract changes for destructive schema work.

## Rollback

1. Disable the affected feature through its feature flag when available.
2. Roll back the application to the previous immutable deployment.
3. Do not reverse a database migration unless a tested down migration exists.
4. For incompatible data changes, restore into a separate database first,
   validate the restore, then switch traffic during an approved maintenance
   window.

## Incident response

1. Assign an incident lead and record the start time and customer impact.
2. Mitigate impact first: disable a provider, pause workers, rate-limit, or
   roll back.
3. Preserve request IDs, job IDs, logs, traces, provider responses, and deploy
   identifiers.
4. Communicate status and the next update time.
5. After recovery, document timeline, root cause, contributing factors,
   corrective actions, owners, and due dates.

Never include secrets, session tokens, raw passwords, or private paper content
in tickets, logs, or incident documents.

## Backup and restore expectations

- Enable PostgreSQL point-in-time recovery and daily retained snapshots.
- Test restoration at least quarterly in an isolated environment.
- Record achieved recovery point and recovery time during every drill.
- Keep exported graph artifacts in versioned object storage once that service
  is introduced.
