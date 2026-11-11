import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const authRoutes = ["/signin", "/signup", "/reset-password", "/verify-email"];
const protectedRoutes = [
  "/admin",
  "/dashboard",
  "/explore",
  "/projects",
  "/query",
  "/search",
  "/settings",
];

function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => path === route || path.startsWith(`${route}/`));
}

function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https: ws: wss:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = matchesRoute(pathname, authRoutes);
  const isProtectedRoute = matchesRoute(pathname, protectedRoutes);
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  const nextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  const sessionToken =
    request.cookies.get("ithaca.session_token")?.value ||
    request.cookies.get("__Secure-ithaca.session_token")?.value;

  // Fast edge exit: unauthenticated user accessing protected route without token cookie
  if (isProtectedRoute && !sessionToken) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set(
      "callbackUrl",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signInUrl);
  }

  try {
    const session = sessionToken
      ? await auth.api.getSession({ headers: request.headers })
      : null;

    if (isAuthRoute && session) {
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      const destination =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/explore";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (isProtectedRoute && !session) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set(
        "callbackUrl",
        `${pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(signInUrl);
    }

    return applySecurityHeaders(nextResponse(), nonce);
  } catch (error) {
    console.error("[PROXY] Session lookup failed", error);

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    return applySecurityHeaders(nextResponse(), nonce);
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
