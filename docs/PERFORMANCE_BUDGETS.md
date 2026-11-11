# Performance and Cost Budgets

## Browser budgets

- Public route initial JavaScript: measure and hold below 250 KB compressed.
- Workspace shell initial JavaScript: below 400 KB compressed before graph data.
- Interaction latency: p95 below 200 ms for filters, selection, and panel actions.
- Graph rendering: sustain 45 FPS for 5,000 nodes and 20,000 edges on the
  supported reference laptop; show an explicit reduced-detail mode above that.
- Browser memory: below 1 GB for the maximum supported interactive graph.

## Service budgets

- Search API p95: 2 seconds.
- Initial graph p95: 8 seconds.
- Cached classification p95: 500 ms.
- Uncached classification job p95: 30 seconds.
- Export jobs: 99% complete within 2 minutes for supported sizes.

## Cost budgets

Track per organization and per completed evidence-review workflow:

- LLM input/output tokens and provider spend;
- external metadata requests and cache hit ratio;
- worker invocations and execution duration;
- database, Redis, and object-storage consumption;
- export bytes and retention.

No feature advances from beta without an explicit monthly budget, quota,
degradation behavior, and kill switch.
