# Backup and restore expectations

Ithaca relies on managed PostgreSQL point-in-time recovery (PITR) and daily snapshots from the database provider.

## Operator checklist

1. Confirm automated backups are enabled for production.
2. Confirm backup retention meets the 30-day artifact/data policy.
3. Run `./scripts/operations/restore-drill.sh` quarterly and attach evidence to `docs/operations/drills/`.
4. After restore, deploy the matching application revision before opening traffic.

## Verification commands

```bash
npm run prisma:migrate:deploy
npm run check
npm run test:e2e
curl -fsS "${NEXT_PUBLIC_APP_URL}/api/health"
```
