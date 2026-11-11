import { NextRequest } from "next/server";

export function buildRequest(
  path: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    searchParams?: Record<string, string>;
  },
): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  if (init?.searchParams) {
    for (const [key, value] of Object.entries(init.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return new NextRequest(url, {
    method: init?.method ?? "GET",
    headers: init?.headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}
