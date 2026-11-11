import http from "k6/http";
import { check, sleep } from "k6";
import { apiThresholds, classifyThresholds } from "./thresholds.js";

const requireAuth = Boolean(__ENV.SESSION_COOKIE);
const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3000";
const sessionCookie = __ENV.SESSION_COOKIE || "";

export const options = {
  scenarios: {
    authenticated_api: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 5),
      duration: __ENV.DURATION || "2m",
    },
  },
  thresholds: requireAuth
    ? { ...apiThresholds, ...classifyThresholds }
    : apiThresholds,
};

export function setup() {
  if (!sessionCookie) {
    console.warn(
      "SESSION_COOKIE not set; running unauthenticated smoke (401 expected on classify).",
    );
    return;
  }

  if (!sessionCookie.includes("ithaca.session_token=")) {
    console.warn(
      'SESSION_COOKIE should include the "ithaca.session_token=..." pair from a signed-in browser session.',
    );
  }
}

export default function () {
  const headers = sessionCookie
    ? { Cookie: sessionCookie, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const health = http.get(`${baseUrl}/api/health`, { headers });
  check(health, {
    "health reachable": (response) =>
      response.status === 200 || response.status === 503,
  });

  const classify = http.post(
    `${baseUrl}/api/classify`,
    JSON.stringify({
      citations: [
        {
          citingId: "W123",
          citedId: "W456",
          citingTitle: "Load test citing paper",
          citingAbstract: "Synthetic abstract for load testing.",
          citedTitle: "Load test cited paper",
          citedAbstract: "Synthetic cited abstract for load testing.",
        },
      ],
    }),
    {
      headers,
      tags: { name: "classify" },
      timeout: "60s",
    },
  );

  if (requireAuth) {
    check(classify, {
      classify_success: (response) => response.status === 200,
      classify_json: (response) =>
        String(response.headers["Content-Type"] || "").includes(
          "application/json",
        ),
    });
  } else {
    check(classify, {
      classify_requires_auth: (response) =>
        response.status === 401 || response.status === 403,
    });
  }

  sleep(1);
}
