import http from "k6/http";
import { check, sleep } from "k6";
import { publicThresholds } from "./thresholds.js";

export const options = {
  scenarios: {
    public_readiness: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "2m", target: 10 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: publicThresholds,
};

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function () {
  const landing = http.get(`${baseUrl}/`);
  check(landing, {
    "landing succeeds": (response) => response.status === 200,
  });

  const health = http.get(`${baseUrl}/api/health`);
  check(health, {
    "health responds": (response) =>
      response.status === 200 || response.status === 503,
  });

  sleep(1);
}
