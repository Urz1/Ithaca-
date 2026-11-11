/**
 * LLM Provider Abstraction
 *
 * Defines a common interface for LLM providers (Gemini, Groq, etc.)
 * and a router that falls back between them when rate limits are hit.
 */

import {
  analyzeStance,
  cleanCitationSentence,
  LOCAL_PROVIDER_NAME,
  LOCAL_MODEL_NAME,
} from "./local-classifier";

// =============================================================================
// TYPES
// =============================================================================

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
}

export interface LLMProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  /** Max requests per minute for this provider */
  rpm: number;
  /** Max requests per day for this provider */
  rpd: number;
}

export interface ILLMProvider {
  readonly name: string;
  readonly model: string;
  chat(messages: LLMMessage[], jsonMode?: boolean): Promise<LLMResponse>;
  streamChat?(
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string>;
  isAvailable(): boolean;
}

// =============================================================================
// RATE LIMITER (Simple sliding window)
// =============================================================================

class RateLimiter {
  private timestamps: number[] = [];
  private dailyCount = 0;
  private lastDayReset = Date.now();

  constructor(
    private rpm: number,
    private rpd: number,
  ) {}

  canProceed(): boolean {
    const now = Date.now();

    // Reset daily counter at midnight
    if (now - this.lastDayReset > 86_400_000) {
      this.dailyCount = 0;
      this.lastDayReset = now;
    }

    // Check daily limit
    if (this.rpd > 0 && this.dailyCount >= this.rpd) {
      return false;
    }

    // Check per-minute limit (sliding window)
    const oneMinuteAgo = now - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > oneMinuteAgo);
    if (this.rpm > 0 && this.timestamps.length >= this.rpm) {
      return false;
    }

    return true;
  }

  record(): void {
    this.timestamps.push(Date.now());
    this.dailyCount++;
  }

  get remaining(): { minute: number; daily: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const recentCount = this.timestamps.filter((t) => t > oneMinuteAgo).length;
    return {
      minute: Math.max(0, this.rpm - recentCount),
      daily: Math.max(0, this.rpd - this.dailyCount),
    };
  }
}

// =============================================================================
// GEMINI PROVIDER (Primary — 1,500 req/day free)
// =============================================================================

class GeminiProvider implements ILLMProvider {
  readonly name = "gemini";
  readonly model: string;
  private apiKey: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string, model = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
    // Free tier: 15 RPM, 1,500 RPD
    this.rateLimiter = new RateLimiter(14, 1450); // Leave slight buffer
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.rateLimiter.canProceed();
  }

  async chat(messages: LLMMessage[], jsonMode = false): Promise<LLMResponse> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("Gemini rate limit reached");
    }

    // Convert OpenAI-style messages to Gemini format
    const systemInstruction = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      contents: userMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      };
    }

    // Generation config
    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      maxOutputTokens: 2048,
    };

    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    body.generationConfig = generationConfig;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        throw new Error("Gemini rate limit reached");
      }
      throw new Error(`Gemini API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    this.rateLimiter.record();

    return {
      content,
      model: this.model,
      provider: this.name,
    };
  }

  async *streamChat(
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("Gemini rate limit reached");
    }

    const systemInstruction = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      contents: userMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        throw new Error("Gemini rate limit reached");
      }
      throw new Error(`Gemini API error (${response.status}): ${error}`);
    }

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch {
            // Ignore partial SSE chunk
          }
        }
      }
      this.rateLimiter.record();
    } finally {
      reader.releaseLock();
    }
  }
}

// =============================================================================
// GROQ PROVIDER (Fallback — ~30 RPM free)
// =============================================================================

class GroqProvider implements ILLMProvider {
  readonly name = "groq";
  readonly model: string;
  private apiKey: string;
  private rateLimiter: RateLimiter;
  private candidateModels: string[];

  constructor(
    apiKey: string,
    model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
  ) {
    this.apiKey = apiKey;
    this.model = model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
    this.candidateModels = [
      this.model,
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ].filter((m, i, arr) => arr.indexOf(m) === i);
    // Free tier: ~30 RPM, ~14,400 RPD (varies)
    this.rateLimiter = new RateLimiter(25, 14000);
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.rateLimiter.canProceed();
  }

  async chat(messages: LLMMessage[], jsonMode = false): Promise<LLMResponse> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("Groq rate limit reached");
    }

    let lastError = "";

    for (const candidate of this.candidateModels) {
      const body: Record<string, unknown> = {
        model: candidate,
        messages,
        temperature: 0,
        max_tokens: 2048,
      };

      if (jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
              },
              body: JSON.stringify(body),
            },
          );

          if (!response.ok) {
            const error = await response.text();
            if (
              (response.status === 429 || response.status === 503) &&
              attempt < maxRetries
            ) {
              const waitMs = 1500 * (attempt + 1);
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }

            if (response.status === 429) {
              throw new Error(`Groq rate limit reached: ${error}`);
            }

            lastError = `Groq API error (${response.status}): ${error}`;
            if (
              response.status === 404 ||
              error.includes("does not exist") ||
              error.includes("model_not_found")
            ) {
              break; // try next candidate model
            }
            throw new Error(lastError);
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";

          this.rateLimiter.record();

          return {
            content,
            model: candidate,
            provider: this.name,
          };
        } catch (err) {
          if (
            err instanceof Error &&
            err.message.includes("rate limit reached")
          ) {
            throw err;
          }
          lastError = err instanceof Error ? err.message : String(err);
          if (attempt === maxRetries) {
            break; // try next candidate model
          }
        }
      }
    }

    throw new Error(lastError || "All Groq candidate models failed");
  }

  async *streamChat(
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("Groq rate limit reached");
    }

    let lastError = "";

    for (const candidate of this.candidateModels) {
      const body: Record<string, unknown> = {
        model: candidate,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      };

      try {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
            signal,
          },
        );

        if (!response.ok) {
          const error = await response.text();
          if (response.status === 429) {
            throw new Error(`Groq rate limit reached: ${error}`);
          }
          lastError = `Groq API error (${response.status}): ${error}`;
          if (
            response.status === 404 ||
            error.includes("does not exist") ||
            error.includes("model_not_found")
          ) {
            continue;
          }
          throw new Error(lastError);
        }

        if (!response.body) continue;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let yieldedAny = false;

        try {
          while (true) {
            if (signal?.aborted) break;
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              if (trimmed === "data: [DONE]") {
                this.rateLimiter.record();
                return;
              }
              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    yieldedAny = true;
                    yield delta;
                  }
                } catch {
                  // Partial chunk
                }
              }
            }
          }
          this.rateLimiter.record();
          if (yieldedAny) return;
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (signal?.aborted) return;
        if (
          err instanceof Error &&
          err.message.includes("rate limit reached")
        ) {
          throw err;
        }
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    throw new Error(lastError || "All Groq candidate models failed to stream");
  }
}

// =============================================================================
// ANTHROPIC PROVIDER (Claude 3.5 Sonnet / Haiku)
// =============================================================================

class AnthropicProvider implements ILLMProvider {
  readonly name = "anthropic";
  readonly model: string;
  private apiKey: string;
  private rateLimiter: RateLimiter;

  constructor(
    apiKey: string,
    model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.rateLimiter = new RateLimiter(50, 20000);
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.rateLimiter.canProceed();
  }

  async chat(messages: LLMMessage[], jsonMode = false): Promise<LLMResponse> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("Anthropic rate limit reached");
    }

    const systemInstruction =
      messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const body: Record<string, unknown> = {
      model: this.model,
      system: systemInstruction,
      messages: userMessages,
      max_tokens: 2048,
      temperature: 0,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        throw new Error("Anthropic rate limit reached");
      }
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    this.rateLimiter.record();

    return {
      content,
      model: this.model,
      provider: this.name,
    };
  }

  async *streamChat(
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("Anthropic rate limit reached");
    }

    const systemInstruction =
      messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const body: Record<string, unknown> = {
      model: this.model,
      system: systemInstruction,
      messages: userMessages,
      max_tokens: 2048,
      temperature: 0.3,
      stream: true,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        throw new Error("Anthropic rate limit reached");
      }
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === "content_block_delta" && data.delta?.text) {
              yield data.delta.text;
            }
          } catch {
            // Partial
          }
        }
      }
      this.rateLimiter.record();
    } finally {
      reader.releaseLock();
    }
  }
}

// =============================================================================
// OPENAI PROVIDER (GPT-4o / GPT-4o-mini)
// =============================================================================

class OpenAIProvider implements ILLMProvider {
  readonly name = "openai";
  readonly model: string;
  private apiKey: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string, model = process.env.OPENAI_MODEL || "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
    this.rateLimiter = new RateLimiter(60, 50000);
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.rateLimiter.canProceed();
  }

  async chat(messages: LLMMessage[], jsonMode = false): Promise<LLMResponse> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("OpenAI rate limit reached");
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0,
      max_tokens: 2048,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        throw new Error("OpenAI rate limit reached");
      }
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    this.rateLimiter.record();

    return {
      content,
      model: this.model,
      provider: this.name,
    };
  }

  async *streamChat(
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    if (!this.rateLimiter.canProceed()) {
      throw new Error("OpenAI rate limit reached");
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
      stream: true,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        throw new Error("OpenAI rate limit reached");
      }
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") {
            this.rateLimiter.record();
            return;
          }
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) yield delta;
            } catch {
              // Partial
            }
          }
        }
      }
      this.rateLimiter.record();
    } finally {
      reader.releaseLock();
    }
  }
}

// =============================================================================
// LOCAL SOVEREIGN MOAT PROVIDER (Zero FX, 100% Offline, sub-15ms)
// =============================================================================

export class LocalMoatProvider implements ILLMProvider {
  readonly name = LOCAL_PROVIDER_NAME;
  readonly model = LOCAL_MODEL_NAME;

  isAvailable(): boolean {
    return true; // Always available locally on CPU
  }

  async chat(messages: LLMMessage[], jsonMode = false): Promise<LLMResponse> {
    const userMessage = messages.find((m) => m.role === "user")?.content || "";
    const systemMessage =
      messages.find((m) => m.role === "system")?.content || "";

    // Determine if this is a citation classification prompt
    const isClassificationPrompt =
      userMessage.includes("CITATION CONTEXT SENTENCES") ||
      userMessage.includes("CITING PAPER:") ||
      userMessage.includes("CITED PAPER:") ||
      systemMessage.includes("classifying the rhetorical stance");

    if (isClassificationPrompt) {
      // Extract citation context if present
      let claim = "";
      const contextMatch = userMessage.match(
        /CITATION CONTEXT SENTENCES[^\n]*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i,
      );
      if (contextMatch) {
        claim = cleanCitationSentence(contextMatch[1]);
      } else {
        const abstractMatch = userMessage.match(/Abstract:\s*([^\n]+)/i);
        if (abstractMatch) {
          claim = cleanCitationSentence(abstractMatch[1]);
        }
      }

      const citingTitleMatch = userMessage.match(/CITING PAPER:\s*"([^"]+)"/i);
      const citingTitle = citingTitleMatch ? citingTitleMatch[1] : "";

      const intents: string[] = [];
      if (userMessage.includes("ResultComparison"))
        intents.push("ResultComparison");
      if (userMessage.includes("Methodology")) intents.push("Methodology");
      if (userMessage.includes("Background")) intents.push("Background");

      const analysis = analyzeStance(claim, citingTitle, userMessage, intents);

      if (jsonMode) {
        return {
          content: JSON.stringify({
            edgeType: analysis.stance,
            confidence: analysis.confidence,
            snippet: analysis.snippet,
          }),
          model: this.model,
          provider: this.name,
        };
      }

      return {
        content: analysis.snippet,
        model: this.model,
        provider: this.name,
      };
    }

    // Check if this is a summarizer prompt
    if (
      systemMessage.includes("research paper summarizer") ||
      userMessage.includes("<paper>")
    ) {
      const abstractMatch = userMessage.match(
        /<abstract>([\s\S]*?)<\/abstract>/i,
      );
      const titleMatch = userMessage.match(/<title>([\s\S]*?)<\/title>/i);
      const rawAbstract = abstractMatch
        ? cleanCitationSentence(abstractMatch[1])
        : "";
      const rawTitle = titleMatch
        ? cleanCitationSentence(titleMatch[1])
        : "This work";

      let summary = "";
      if (rawAbstract.length > 50) {
        const sentences = rawAbstract.split(/(?<=[.?!])\s+/);
        summary = sentences.slice(0, 2).join(" ");
      } else {
        summary = `${rawTitle} presents an empirical framework and methodology contributing to the broader academic discourse.`;
      }

      return {
        content: summary,
        model: this.model,
        provider: this.name,
      };
    }

    // General Conversational Chat / Graph Assistant Reply
    const content = this.generateAssistantReply(userMessage, systemMessage);
    return {
      content,
      model: this.model,
      provider: this.name,
    };
  }

  private generateAssistantReply(
    userMessage: string,
    systemMessage: string,
  ): string {
    const lower = userMessage.toLowerCase().trim();

    // 1. Greetings & Identity
    if (
      lower === "hi" ||
      lower === "hello" ||
      lower === "hey" ||
      lower.startsWith("hi ") ||
      lower.startsWith("hello ") ||
      lower.includes("who are you") ||
      lower.includes("what can you do")
    ) {
      return (
        "Hello! I'm Ithaca's AI Graph Assistant. I help you navigate and analyze the research papers, citation networks, and scientific debates in this graph.\n\n" +
        "You can ask me to:\n" +
        "• Summarize the most influential papers in this view\n" +
        "• Identify points of contradiction or debate\n" +
        "• Explain citation stances (supports, contradicts, extends)"
      );
    }

    // 2. Extract graph state info from system message if available
    const papersMatch = systemMessage.match(
      /Papers in this graph \(sorted by citations\):([\s\S]*)/i,
    );
    const paperLines = papersMatch
      ? papersMatch[1]
          .trim()
          .split("\n")
          .filter((line) => line.trim().length > 0)
      : [];

    const stateMatch = systemMessage.match(
      /Current graph state:\s*(\d+)\s*papers,\s*(\d+)\s*citation edges/i,
    );
    const nodeCount = stateMatch ? stateMatch[1] : null;
    const edgeCount = stateMatch ? stateMatch[2] : null;

    // 3. Summarization / Overview queries
    if (
      lower.includes("summarize") ||
      lower.includes("summary") ||
      lower.includes("overview") ||
      lower.includes("most influential") ||
      lower.includes("key papers") ||
      lower.includes("top papers") ||
      lower.includes("what is this graph")
    ) {
      if (paperLines.length > 0) {
        const topPapers = paperLines.slice(0, 5).join("\n");
        return (
          `This graph contains ${nodeCount ?? paperLines.length} papers and ${edgeCount ?? "multiple"} citation edges.\n\n` +
          `**Key papers in this view:**\n${topPapers}\n\n` +
          "Click on any paper in the canvas or use the **Battlefield Toggle** in the toolbar to isolate points of dispute."
        );
      }
      return (
        "This graph visualizes the citation and debate landscape for your selected topic. " +
        "Use the canvas controls to inspect papers, highlight contradiction paths, or filter by citation thresholds."
      );
    }

    // 4. Disputes / Contradictions / Trends queries
    if (
      lower.includes("contradict") ||
      lower.includes("dispute") ||
      lower.includes("debate") ||
      lower.includes("conflict") ||
      lower.includes("trend")
    ) {
      return (
        "To explore scientific disputes in this graph:\n" +
        "• Toggle the **Battlefield Mode** in the toolbar to dim neutral citations and highlight conflicting studies (red edges).\n" +
        "• Click on any citation edge to inspect the exact in-text evidence snippet.\n" +
        "• Select two opposing papers to find the **Conflict Trail** between them."
      );
    }

    // 5. Default contextual assistance
    if (paperLines.length > 0) {
      const firstPaper = paperLines[0];
      return (
        `The primary landmark paper in this graph is ${firstPaper}.\n\n` +
        "You can explore related citations by clicking on connected nodes or selecting a paper to view its full abstract and evidence."
      );
    }

    return (
      "I'm here to help you explore this citation graph. You can ask about key papers, " +
      "citation trends, or scientific debates between the works shown on your canvas."
    );
  }

  async *streamChat(
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const res = await this.chat(messages, false);
    const words = res.content.split(/(?<=\s+)/);
    for (const word of words) {
      if (signal?.aborted) return;
      yield word;
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

// =============================================================================
// LLM ROUTER (Tries providers in order, falls back on rate limit)
// =============================================================================

export class LLMRouter {
  private providers: ILLMProvider[] = [];

  constructor(providers: ILLMProvider[]) {
    // Filter out providers that are unavailable
    this.providers = providers.filter((p) => p.isAvailable());
  }

  /**
   * Try each provider in order. If one hits a rate limit, fall back to the next.
   */
  async chat(messages: LLMMessage[], jsonMode = false): Promise<LLMResponse> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        errors.push(`${provider.name}: rate limit reached (skipped)`);
        continue;
      }

      try {
        return await provider.chat(messages, jsonMode);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `[LLM Router] Provider "${provider.name}" failed: ${msg}. Trying next provider in chain...`,
        );
        errors.push(`${provider.name}: ${msg}`);

        // If it's a rate limit error or any other error, try the next provider
        continue;
      }
    }

    throw new Error(`All LLM providers exhausted:\n${errors.join("\n")}`);
  }

  /**
   * Try streaming from providers in order.
   * If a provider fails to start streaming or rate limits, falls back to the next.
   */
  async *streamChat(
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): AsyncIterable<{ token: string; provider: string; model: string }> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        errors.push(`${provider.name}: rate limit reached (skipped)`);
        continue;
      }

      let yieldedAny = false;
      try {
        if (provider.streamChat) {
          for await (const token of provider.streamChat(messages, signal)) {
            yieldedAny = true;
            yield { token, provider: provider.name, model: provider.model };
          }
          return;
        } else {
          const res = await provider.chat(messages);
          yield { token: res.content, provider: provider.name, model: res.model };
          return;
        }
      } catch (error) {
        if (signal?.aborted) return;
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `[LLM Router] Provider "${provider.name}" stream failed: ${msg}. Trying next provider in chain...`,
        );
        errors.push(`${provider.name}: ${msg}`);
        if (yieldedAny) {
          return;
        }
        continue;
      }
    }

    throw new Error(
      `All LLM streaming providers exhausted:\n${errors.join("\n")}`,
    );
  }

  /** Check if at least one provider is configured and available */
  isAvailable(): boolean {
    return this.providers.some((p) => p.isAvailable());
  }

  /** Get status of all providers */
  getStatus(): { name: string; model: string; available: boolean }[] {
    return this.providers.map((p) => ({
      name: p.name,
      model: p.model,
      available: p.isAvailable(),
    }));
  }
}

// =============================================================================
// SINGLETON (Create once, reuse across API routes)
// =============================================================================

let _router: LLMRouter | null = null;

export function getLLMRouter(): LLMRouter {
  if (!_router) {
    const providers: ILLMProvider[] = [];

    const preferLocal =
      process.env.CLASSIFIER_MODE === "local" ||
      process.env.AI_PROVIDER_PREFERENCE === "local";

    const localProvider = new LocalMoatProvider();

    if (preferLocal) {
      providers.push(localProvider);
    }

    const primaryChoice = (
      process.env.AI_PRIMARY_PROVIDER || ""
    ).toLowerCase().trim();

    // Map of configured cloud providers
    const cloudMap: Record<string, ILLMProvider | null> = {
      groq: process.env.GROQ_API_KEY
        ? new GroqProvider(process.env.GROQ_API_KEY)
        : null,
      gemini: process.env.GEMINI_API_KEY
        ? new GeminiProvider(process.env.GEMINI_API_KEY)
        : null,
      anthropic: process.env.ANTHROPIC_API_KEY
        ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY)
        : null,
      claude: process.env.ANTHROPIC_API_KEY
        ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY)
        : null,
      openai: process.env.OPENAI_API_KEY
        ? new OpenAIProvider(process.env.OPENAI_API_KEY)
        : null,
    };

    // If an explicit primary provider is requested and configured, prioritize it
    if (primaryChoice && cloudMap[primaryChoice]) {
      providers.push(cloudMap[primaryChoice]!);
    }

    // Add remaining configured cloud providers in standard priority order
    const priorityOrder = ["groq", "gemini", "anthropic", "openai"];
    for (const pName of priorityOrder) {
      const p = cloudMap[pName];
      if (p && !providers.some((existing) => existing.name === p.name)) {
        providers.push(p);
      }
    }

    // If local was not prioritized first, append it as guaranteed sovereign fallback
    if (!preferLocal) {
      providers.push(localProvider);
    }

    _router = new LLMRouter(providers);
  }

  return _router;
}

export function resetLLMRouterForTesting(): void {
  _router = null;
}
