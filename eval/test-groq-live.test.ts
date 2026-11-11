import { describe, expect, it } from "vitest";
import {
  getLLMRouter,
  resetLLMRouterForTesting,
} from "../src/lib/api/llm-router";

// Ensure .env is loaded in test environment
if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env");
}

describe("Live Groq Provider Verification", () => {
  it("verifies GroqProvider is initialized and makes a successful live LLM call", async () => {
    resetLLMRouterForTesting();
    const router = getLLMRouter();
    const status = router.getStatus();
    console.log("Registered Providers:", status);

    expect(status.some((s) => s.name === "groq" && s.available)).toBe(true);

    const t0 = performance.now();
    const res = await router.chat(
      [
        {
          role: "system",
          content:
            'Respond with valid JSON only: {"status": "ok", "message": "hello", "provider": "groq"}',
        },
        {
          role: "user",
          content: "Confirm connection and echo JSON.",
        },
      ],
      true,
    );
    const latency = performance.now() - t0;

    console.log("\n=======================================================");
    console.log("🚀 LIVE GROQ RESPONSE RECEIVED");
    console.log("Latency:", latency.toFixed(2), "ms");
    console.log("Provider:", res.provider);
    console.log("Model:", res.model);
    console.log("Raw Output:", res.content);
    console.log("=======================================================\n");

    expect(res.provider).toBe("groq");
    expect(res.model).toBe("qwen/qwen3.8-27b");
    const parsed = JSON.parse(res.content);
    expect(parsed.status).toBe("ok");
  }, 30000);
});
