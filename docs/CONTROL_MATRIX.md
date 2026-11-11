# Security and Reliability Control Matrix

This document records engineering evidence; it does not claim certification.

| Control objective                 | Implementation evidence                                         | Operating evidence                            |
| --------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| Changes are reviewed and tested   | Required CI build, lint, typecheck, tests, migration deployment | Protected-branch and pull-request records     |
| Dependencies are monitored        | Dependabot, dependency review, npm audit, CodeQL                | Security workflow runs and remediation issues |
| Tenant access is controlled       | Organization membership, centralized RBAC, scoped repositories  | Authorization tests and audit events          |
| Production access is attributable | Authenticated admin capabilities and audit log                  | Periodic access review export                 |
| Data is recoverable               | Managed PostgreSQL PITR requirement and restore runbook         | Quarterly restore drill record                |
| Incidents are managed             | Incident and rollback runbooks                                  | Incident timelines and corrective actions     |
| External services are controlled  | Provider interfaces, feature kill switches, quotas, retries     | Provider inventory and outage exercises       |
| Personal data has a lifecycle     | Export/deletion design and retention documentation              | Completed deletion/export verification        |
| Security is tested                | SAST, dependency scans, DAST workflow, threat model             | Scan reports and penetration-test remediation |

Control owners and review dates must be assigned in the organization’s
governance system before this matrix is used as compliance evidence.
