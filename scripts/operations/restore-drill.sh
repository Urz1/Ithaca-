#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_DIR="docs/operations/drills"
LOG_FILE="${LOG_DIR}/restore-drill-${STAMP}.md"
mkdir -p "${LOG_DIR}"

{
  echo "# Restore Drill ${STAMP}"
  echo
  echo "- Operator: ${USER:-unknown}"
  echo "- Database URL host: $(node -e 'console.log(new URL(process.env.DATABASE_URL).host)' )"
  echo
  echo "## Steps"
  echo "1. Verify latest backup/PITR window with database provider"
  echo "2. Restore to staging clone"
  echo "3. Run \`npm run prisma:migrate:deploy\` against restored database"
  echo "4. Run \`npm run check\` and \`npm run test:e2e\` against staging"
  echo "5. Record RTO/RPO observations below"
  echo
  echo "## Results"
  echo "- Restore started:"
  echo "- Restore completed:"
  echo "- RPO observed:"
  echo "- RTO observed:"
  echo "- Issues:"
} > "${LOG_FILE}"

echo "Restore drill log created at ${LOG_FILE}"
