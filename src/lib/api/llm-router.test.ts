import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  LocalMoatProvider,
  LLMRouter,
  getLLMRouter,
  resetLLMRouterForTesting,
  type LLMMessage,
} from "./llm-router";
import { LOCAL_PROVIDER_NAME, LOCAL_MODEL_NAME } from "./local-classifier";

describe("llm-router & LocalMoatProvider (TC-ROUT-01)", () => {
  beforeEach(() => {
    resetLLMRouterForTesting();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetLLMRouterForTesting();
    vi.unstubAllEnvs();
  });

  it("LocalMoatProvider is always available with zero network requirements", () => {
    const provider = new LocalMoatProvider();
    expect(provider.name).toBe(LOCAL_PROVIDER_NAME);
    expect(provider.model).toBe(LOCAL_MODEL_NAME);
    expect(provider.isAvailable()).toBe(true);

    const router = new LLMRouter([provider]);
    expect(router.isAvailable()).toBe(true);
    expect(router.getStatus().length).toBe(1);
  });

  it("LocalMoatProvider generates valid JSON output matching classification schema", async () => {
    const provider = new LocalMoatProvider();
    const messages: LLMMessage[] = [
      { role: "system", content: "You are classifying the rhetorical stance." },
      {
        role: "user",
        content: `CITING PAPER: "Replication and Validation"
Abstract: We validate the prior trial.

CITED PAPER: "Original Discovery"
Abstract: Landmark discovery trial.

CITATION CONTEXT SENTENCES:
1. "Our results confirm and replicate the core finding of Smith et al."

SEMANTIC SCHOLAR INTENT LABELS: ResultComparison`,
      },
    ];

    const response = await provider.chat(messages, true);
    expect(response.provider).toBe(LOCAL_PROVIDER_NAME);
    expect(response.model).toBe(LOCAL_MODEL_NAME);

    const parsed = JSON.parse(response.content);
    expect(parsed.edgeType).toBe("supports");
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.8);
    expect(parsed.snippet).toContain("confirm and validate");
  });

  it("LLMRouter automatically includes LocalMoatProvider as sovereign fallback", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    const router = getLLMRouter();
    expect(router.isAvailable()).toBe(true);
    const status = router.getStatus();
    expect(
      status.some((s) => s.name === LOCAL_PROVIDER_NAME && s.available),
    ).toBe(true);
  });

  it("LocalMoatProvider responds intelligently to conversational chat and greetings", async () => {
    const provider = new LocalMoatProvider();
    const messages: LLMMessage[] = [
      {
        role: "system",
        content:
          "You are Ithaca, an AI research assistant embedded in a citation graph explorer.",
      },
      { role: "user", content: "who are you" },
    ];

    const response = await provider.chat(messages, false);
    expect(response.provider).toBe(LOCAL_PROVIDER_NAME);
    expect(response.content).toContain("I'm Ithaca's AI Graph Assistant");
  });

  it("LocalMoatProvider and LLMRouter stream tokens progressively via streamChat", async () => {
    const provider = new LocalMoatProvider();
    const router = new LLMRouter([provider]);

    const messages: LLMMessage[] = [
      {
        role: "system",
        content: "You are Ithaca, an AI research assistant.",
      },
      { role: "user", content: "hello" },
    ];

    const tokens: string[] = [];
    for await (const chunk of router.streamChat(messages)) {
      expect(chunk.provider).toBe(LOCAL_PROVIDER_NAME);
      tokens.push(chunk.token);
    }

    expect(tokens.length).toBeGreaterThan(1);
    const combined = tokens.join("");
    expect(combined).toContain("I'm Ithaca's AI Graph Assistant");
  });
});
