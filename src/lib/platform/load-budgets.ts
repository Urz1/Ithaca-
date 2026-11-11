export const LOAD_BUDGETS = {
  public: {
    errorRateMax: 0.01,
    latencyP95Ms: 1000,
  },
  api: {
    errorRateMax: 0.005,
    latencyP95Ms: 800,
    availabilityMin: 0.999,
  },
  classify: {
    errorRateMax: 0.01,
    latencyP95Ms: 30_000,
  },
  jobs: {
    errorRateMax: 0.005,
    completionRateMin: 0.995,
  },
} as const;
