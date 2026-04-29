import { NextRequest, NextResponse } from "next/server";

/**
 * Soft session gating for Connected mode.
 *
 * Demo mode (default): no cookies, middleware passes through.
 *
 * Connected mode: Settings → Connections writes an `atelier-mode=supabase`
 * cookie when the user toggles Connected on. Once that cookie is set,
 * authenticated requests must carry a Supabase session cookie (`sb-*-auth-token`).
 * If they don't, we redirect to /login. Public paths (/login, /signup,
 * /accept-invite, /share, /portal, /api/*) skip the gate.
 */

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/accept-invite",
  "/share",
  "/portal",
  "/api",
  "/_next",
  "/favicon.ico",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

function hasSupabaseSession(req: NextRequest): boolean {
  // The supabase-js v2 + @supabase/ssr client stores its access + refresh
  // tokens in cookies named `sb-<project-ref>-auth-token` (and split
  // variants `sb-...-auth-token-code-verifier`, `.0`, `.1`, etc.).
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("sb-") && c.name.endsWith("-auth-token")) {
      return true;
    }
    if (c.name.startsWith("sb-") && c.name.includes("-auth-token.")) {
      return true;
    }
  }
  return false;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const mode = req.cookies.get("atelier-mode")?.value;
  if (mode !== "supabase") {
    // Demo mode — let the request through; the app handles its own state
    return NextResponse.next();
  }

  if (hasSupabaseSession(req)) return NextResponse.next();

  // Connected mode but no session → redirect to /login
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *   - /_next/static, /_next/image (Next.js internals)
     *   - public files (favicon, sitemap, robots, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
