import http from "k6/http";
import { check, sleep } from "k6";
import { publicThresholds } from "./thresholds.js";

export const options = {
  scenarios: {
    public_pages: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 15 },
        { duration: "2m", target: 15 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: publicThresholds,
};

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function () {
  const routes = ["/", "/signin", "/signup", "/status", "/docs"];

  for (const route of routes) {
    const response = http.get(`${baseUrl}${route}`);
    check(response, {
      [`${route} succeeds`]: (result) =>
        result.status >= 200 && result.status < 400,
    });
  }

  const health = http.get(`${baseUrl}/api/health`);
  check(health, {
    "health responds": (response) =>
      response.status === 200 || response.status === 503,
    "health is json": (response) =>
      String(response.headers["Content-Type"] || "").includes(
        "application/json",
      ),
  });

  sleep(1);
}
