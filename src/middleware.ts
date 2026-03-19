import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

/** Pages that anyone can see without logging in. */
const PUBLIC_PATHS = new Set(["/login", "/register"]);

/** Pages that Level 5 (pending) users ARE allowed to see. */
const PENDING_ALLOWED_PATHS = new Set(["/pending"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isAuthenticated = Boolean(session);
  const isPending = session?.permissionLevel === 5;

  // ── Public pages ────────────────────────────────────────────────────
  if (PUBLIC_PATHS.has(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(
        new URL(isPending ? "/pending" : "/queue", request.url),
      );
    }
    return NextResponse.next();
  }

  // ── Everything else requires authentication ─────────────────────────
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Pending-allowed pages ───────────────────────────────────────────
  if (PENDING_ALLOWED_PATHS.has(pathname)) {
    if (!isPending) {
      return NextResponse.redirect(new URL("/queue", request.url));
    }
    return NextResponse.next();
  }

  // ── Level 5 (pending) cannot access ANYTHING else ───────────────────
  if (isPending) {
    return NextResponse.redirect(new URL("/pending", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
