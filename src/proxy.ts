import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth/session";

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/api/auth/") || pathname === "/api/health";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) return NextResponse.next();

  // undefined if not logged in
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
