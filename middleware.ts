import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const protectedPrefixes = ["/queue", "/orders", "/bookmarks", "/users"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const userIsAuthenticated = Boolean(session);

  if (!userIsAuthenticated && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (userIsAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/queue", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/queue/:path*",
    "/orders/:path*",
    "/bookmarks/:path*",
    "/users/:path*",
  ],
};
