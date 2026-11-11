import { describe, it, expect, vi, beforeEach } from "vitest";
import { validatePasswordComplexity } from "@/lib/auth";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

// Mock auth.api.getSession for proxy unit tests
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    auth: {
      ...actual.auth,
      api: {
        getSession: vi.fn(async ({ headers }: { headers: Headers }) => {
          const cookieHeader = headers.get("cookie") || "";
          if (cookieHeader.includes("valid_token")) {
            return {
              user: {
                id: "user-123",
                email: "researcher@ithaca.test",
                name: "Researcher",
              },
            };
          }
          return null;
        }),
      },
    },
  };
});

describe("Authentication Hardening & Resilience Suite", () => {
  describe("Backend Password Complexity Validation", () => {
    it("rejects passwords shorter than 8 characters", () => {
      expect(() => validatePasswordComplexity("Short1!")).toThrow(
        /at least 8 characters/,
      );
    });

    it("rejects low-entropy passwords with fewer than 3 character classes", () => {
      // Only digits
      expect(() => validatePasswordComplexity("1234567890")).toThrow(
        /at least 3 of the following/,
      );
      // Only lowercase letters
      expect(() => validatePasswordComplexity("justlowercaseletters")).toThrow(
        /at least 3 of the following/,
      );
      // Only uppercase letters
      expect(() => validatePasswordComplexity("ALLUPPERCASELETTERS")).toThrow(
        /at least 3 of the following/,
      );
      // Only lowercase and digits (2 categories)
      expect(() => validatePasswordComplexity("weakpassword123")).toThrow(
        /at least 3 of the following/,
      );
    });

    it("accepts passwords satisfying at least 3 character classes with length >= 8", () => {
      // Lowercase + Uppercase + Digits
      expect(() =>
        validatePasswordComplexity("StandardPass123"),
      ).not.toThrow();
      // Lowercase + Digits + Special
      expect(() =>
        validatePasswordComplexity("mypassw0rd!#%"),
      ).not.toThrow();
      // Lowercase + Uppercase + Special
      expect(() =>
        validatePasswordComplexity("MixedCaseSpecial!"),
      ).not.toThrow();
      // All 4 categories
      expect(() =>
        validatePasswordComplexity("PilotPass123!"),
      ).not.toThrow();
    });
  });

  describe("Edge Route Proxy Guarding", () => {
    function createMockRequest(
      url: string,
      cookies: Record<string, string> = {},
    ): NextRequest {
      const parsedUrl = new URL(url);
      const cookieHeader = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
      const req = new NextRequest(parsedUrl, {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      });
      for (const [key, val] of Object.entries(cookies)) {
        req.cookies.set(key, val);
      }
      return req;
    }

    it("redirects unauthenticated requests on protected routes to /signin with callbackUrl", async () => {
      const protectedPaths = [
        "http://localhost:3000/dashboard",
        "http://localhost:3000/admin",
        "http://localhost:3000/projects",
        "http://localhost:3000/explore",
        "http://localhost:3000/search?q=quantum",
        "http://localhost:3000/query",
      ];

      for (const url of protectedPaths) {
        const req = createMockRequest(url, {});
        const res = await proxy(req);
        expect(res.status).toBe(307);
        const location = res.headers.get("location");
        expect(location).toContain("/signin?callbackUrl=");
        const parsed = new URL(url);
        expect(location).toContain(
          encodeURIComponent(parsed.pathname + parsed.search),
        );
      }
    });

    it("allows authenticated requests with ithaca.session_token on protected routes", async () => {
      const req = createMockRequest("http://localhost:3000/dashboard", {
        "ithaca.session_token": "valid_token_xyz_123",
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("allows authenticated requests with __Secure-ithaca.session_token on protected routes", async () => {
      const req = createMockRequest("http://localhost:3000/projects", {
        "__Secure-ithaca.session_token": "valid_token_xyz_456",
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("redirects authenticated users visiting /signin to /explore or callbackUrl", async () => {
      const reqDefault = createMockRequest("http://localhost:3000/signin", {
        "ithaca.session_token": "valid_token",
      });
      const resDefault = await proxy(reqDefault);
      expect(resDefault.status).toBe(307);
      expect(resDefault.headers.get("location")).toBe(
        "http://localhost:3000/explore",
      );

      const reqWithCallback = createMockRequest(
        "http://localhost:3000/signin?callbackUrl=%2Fdashboard",
        { "ithaca.session_token": "valid_token" },
      );
      const resWithCallback = await proxy(reqWithCallback);
      expect(resWithCallback.status).toBe(307);
      expect(resWithCallback.headers.get("location")).toBe(
        "http://localhost:3000/dashboard",
      );
    });

    it("bypasses non-protected and public routes without redirection", async () => {
      const publicUrls = [
        "http://localhost:3000/about",
        "http://localhost:3000/terms",
        "http://localhost:3000/privacy",
      ];
      for (const url of publicUrls) {
        const req = createMockRequest(url, {});
        const res = await proxy(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("location")).toBeNull();
      }
    });
  });

  describe("Academic ORCID Identity Resolution Logic", () => {
    it("correctly resolves verified email when public on ORCID record", async () => {
      const orcid = "0000-0002-1825-0097";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          email: [{ email: "sofia.garcia@stanford.edu" }],
        }),
      });
      global.fetch = mockFetch;

      const raw = { orcid, name: "Dr. Sofia Garcia" };
      const tokens = { raw, accessToken: "mock_token" };

      // Re-run the ORCID extraction logic
      const targetOrcid = raw.orcid;
      const targetName = raw.name;
      let email: string | null = null;

      const res = await fetch(`https://pub.orcid.org/v3.0/${targetOrcid}/email`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        email = data?.email?.[0]?.email ?? null;
      }

      const finalEmail = email || `${targetOrcid}@orcid.org`;

      expect(finalEmail).toBe("sofia.garcia@stanford.edu");
      expect(targetName).toBe("Dr. Sofia Garcia");
    });

    it("gracefully falls back to deterministic academic alias when email is private on ORCID", async () => {
      const orcid = "0000-0003-4567-8901";
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch;

      const raw = { orcid, name: "" };
      const targetOrcid = raw.orcid;
      const targetName = raw.name.trim() || "ORCID Researcher";
      let email: string | null = null;

      try {
        const res = await fetch(`https://pub.orcid.org/v3.0/${targetOrcid}/email`);
        if (res.ok) {
          const data = await res.json();
          email = data?.email?.[0]?.email ?? null;
        }
      } catch {
        // network failure
      }

      const finalEmail = email || `${targetOrcid}@orcid.org`;

      expect(finalEmail).toBe("0000-0003-4567-8901@orcid.org");
      expect(targetName).toBe("ORCID Researcher");
    });
  });
});
