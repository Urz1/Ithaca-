# Service Levels

These are launch targets, not contractual guarantees. They become enforceable
only after production telemetry has validated the measurement definitions.

## Service level indicators

| Indicator              | Measurement                                          | Initial objective |
| ---------------------- | ---------------------------------------------------- | ----------------- |
| Web availability       | Successful non-user-error requests / valid requests  | 99.9% monthly     |
| Interactive search     | p95 time from query to visible results               | under 2 seconds   |
| Graph readiness        | p95 time from selection to interactive initial graph | under 8 seconds   |
| API reliability        | 5xx responses / valid API requests                   | below 0.5%        |
| Background jobs        | Jobs completed without terminal failure              | 99.5%             |
| Classification latency | p95 accepted job to classified result                | under 30 seconds  |
| Metadata freshness     | Age of refreshed provider metadata                   | under 7 days      |

## Recovery objectives

- Recovery point objective: no more than 15 minutes of committed database data.
- Recovery time objective: restore core authenticated read access within 2 hours.
- Provider degradation: preserve cached/read-only workflows when an external
  research or AI provider is unavailable.

## Alerting principles

- Page only for sustained customer-impacting conditions with a documented
  response.
- Ticket trends and budget burn that do not require immediate intervention.
- Every alert must identify the owning service, runbook, severity, and request
  or job correlation fields.
- Revisit thresholds after every incident and quarterly reliability review.
