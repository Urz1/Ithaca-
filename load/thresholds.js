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
};

export const publicThresholds = {
  http_req_failed: [`rate<${LOAD_BUDGETS.public.errorRateMax}`],
  http_req_duration: [`p(95)<${LOAD_BUDGETS.public.latencyP95Ms}`],
};

export const apiThresholds = {
  http_req_failed: [`rate<${LOAD_BUDGETS.api.errorRateMax}`],
  "http_req_duration{expected_response:true}": [
    `p(95)<${LOAD_BUDGETS.api.latencyP95Ms}`,
  ],
};

export const classifyThresholds = {
  "http_req_duration{name:classify,expected_response:true}": [
    `p(95)<${LOAD_BUDGETS.classify.latencyP95Ms}`,
  ],
  "checks{classify_success}": ["rate>0.99"],
};
