import { vi } from "vitest";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/organization-selection";

export interface MockSessionUser {
  id: string;
  email: string;
  name?: string | null;
}

let mockSessionUser: MockSessionUser | null = null;
const mockCookies = new Map<string, string>();

export function setMockSession(user: MockSessionUser | null): void {
  mockSessionUser = user;
}

export function setMockOrganizationCookie(organizationId: string | null): void {
  if (organizationId) {
    mockCookies.set(ACTIVE_ORGANIZATION_COOKIE, organizationId);
  } else {
    mockCookies.delete(ACTIVE_ORGANIZATION_COOKIE);
  }
}

export function clearAuthMocks(): void {
  mockSessionUser = null;
  mockCookies.clear();
}

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = mockCookies.get(name);
      return value ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      mockCookies.set(name, value);
    },
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () =>
        mockSessionUser
          ? {
              user: {
                id: mockSessionUser.id,
                email: mockSessionUser.email,
                name: mockSessionUser.name ?? "Researcher",
              },
            }
          : null,
      ),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
